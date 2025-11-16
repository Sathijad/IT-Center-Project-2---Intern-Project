import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../src/auth_service.dart';
import '../src/leave_api_base.dart';

class ApplyLeaveScreen extends StatefulWidget {
  const ApplyLeaveScreen({super.key});

  @override
  State<ApplyLeaveScreen> createState() => _ApplyLeaveScreenState();
}

class _ApplyLeaveScreenState extends State<ApplyLeaveScreen> {
  final _formKey = GlobalKey<FormState>();
  int? _selectedPolicyId;
  DateTime? _startDate;
  DateTime? _endDate;
  final _reasonController = TextEditingController();
  bool _isSubmitting = false;
  List<Map<String, dynamic>> _policies = [];
  bool _loadingPolicies = true;

  @override
  void initState() {
    super.initState();
    _loadPolicies();
  }

  List<Map<String, dynamic>> _defaultPolicies() {
    // Fallback list used only if the API is unavailable.
    // Includes Personal Leave so all standard types are visible even in offline/error states.
    return [
      {'id': 1, 'name': 'Annual Leave', 'limit': 14},
      {'id': 2, 'name': 'Casual Leave', 'limit': 7},
      {'id': 3, 'name': 'Sick Leave', 'limit': 10},
      {'id': 4, 'name': 'Personal Leave', 'limit': 5},
    ];
  }

  Future<void> _loadPolicies() async {
    setState(() => _loadingPolicies = true);
    try {
      final token = await AuthService.instance.getAccessToken();
      if (token == null || token.isEmpty) {
        throw Exception('Not authenticated');
      }

      // Use the leave balance endpoint (which already powers other screens)
      // to derive the available leave policies for this user.
      // This ensures types like "Personal Leave" appear whenever they exist
      // and the user has a balance record for them.
      final res = await http.get(
        Uri.parse('${LeaveApiBase.base}/api/v1/leave/balance'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (res.statusCode == 200) {
        final data = json.decode(res.body) as Map<String, dynamic>;
        final balances = (data['balances'] as List? ?? []).whereType<Map<String, dynamic>>().toList();

        setState(() {
          final parsedPolicies = <Map<String, dynamic>>[];
          for (final balance in balances) {
            final rawId = balance['policyId'] ?? balance['policy_id'];
            final parsedId = rawId is int ? rawId : int.tryParse(rawId.toString());
            if (parsedId == null) {
              continue;
            }

            final rawName = balance['policyName'] ?? balance['policy_name'];
            final name = (rawName?.toString().isNotEmpty ?? false) ? rawName.toString() : 'Leave Policy';

            // We don't get the original annual_limit here, only remaining balance.
            // Showing the current balance as "days" is more useful for users anyway.
            final rawBalance = balance['balanceDays'] ?? balance['balance_days'] ?? balance['balance'];
            int remainingDays;
            if (rawBalance is num) {
              remainingDays = rawBalance.round();
            } else {
              remainingDays = int.tryParse(rawBalance?.toString() ?? '') ?? 0;
            }

            parsedPolicies.add({
              'id': parsedId,
              'name': name,
              'limit': remainingDays,
            });
          }

          // If for some reason the API returned no balances, fall back to defaults.
          _policies = parsedPolicies.isNotEmpty ? parsedPolicies : _defaultPolicies();
        });
      } else {
        // Fallback to default policies if API fails
        setState(() {
          _policies = _defaultPolicies();
        });
      }
    } catch (e) {
      // Fallback to default policies
      setState(() {
        _policies = _defaultPolicies();
      });
    } finally {
      setState(() => _loadingPolicies = false);
    }
  }

  Future<void> _selectDate(BuildContext context, bool isStart) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: isStart ? (_startDate ?? DateTime.now()) : (_endDate ?? DateTime.now()),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
          if (_endDate != null && _endDate!.isBefore(_startDate!)) {
            _endDate = null;
          }
        } else {
          _endDate = picked;
        }
      });
    }
  }

  int? _calculateDays() {
    if (_startDate != null && _endDate != null) {
      return _endDate!.difference(_startDate!).inDays + 1;
    }
    return null;
  }

  Future<void> _submitLeaveRequest() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_selectedPolicyId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a leave policy')),
      );
      return;
    }

    if (_startDate == null || _endDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select start and end dates')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final token = await AuthService.instance.getAccessToken();
      if (token == null || token.isEmpty) {
        throw Exception('Not authenticated');
      }

      final requestData = {
        'policy_id': _selectedPolicyId,
        'start_date': _startDate!.toIso8601String().split('T')[0],
        'end_date': _endDate!.toIso8601String().split('T')[0],
        if (_reasonController.text.isNotEmpty) 'reason': _reasonController.text,
      };

      final res = await http.post(
        Uri.parse('${LeaveApiBase.base}/api/v1/leave/requests'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode(requestData),
      );

      if (res.statusCode == 201 || res.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Leave request submitted successfully'),
              backgroundColor: Colors.green,
            ),
          );
          Navigator.pop(context);
        }
      } else {
        final error = json.decode(res.body);
        throw Exception(error['message'] ?? 'Failed to submit leave request');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final days = _calculateDays();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Apply for Leave'),
      ),
      body: _loadingPolicies
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    DropdownButtonFormField<int>(
                      value: _selectedPolicyId,
                      decoration: const InputDecoration(
                        labelText: 'Leave Policy *',
                        border: OutlineInputBorder(),
                      ),
                      items: _policies.map((policy) {
                        return DropdownMenuItem<int>(
                          value: policy['id'] as int,
                          child: Text('${policy['name']} (${policy['limit']} days)'),
                        );
                      }).toList(),
                      onChanged: (value) {
                        setState(() => _selectedPolicyId = value);
                      },
                      validator: (value) {
                        if (value == null) {
                          return 'Please select a leave policy';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    InkWell(
                      onTap: () => _selectDate(context, true),
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: 'Start Date *',
                          border: OutlineInputBorder(),
                          suffixIcon: Icon(Icons.calendar_today),
                        ),
                        child: Text(
                          _startDate != null
                              ? '${_startDate!.day}/${_startDate!.month}/${_startDate!.year}'
                              : 'Select start date',
                          style: TextStyle(
                            color: _startDate != null ? Colors.black : Colors.grey,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    InkWell(
                      onTap: () => _selectDate(context, false),
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: 'End Date *',
                          border: OutlineInputBorder(),
                          suffixIcon: Icon(Icons.calendar_today),
                        ),
                        child: Text(
                          _endDate != null
                              ? '${_endDate!.day}/${_endDate!.month}/${_endDate!.year}'
                              : 'Select end date',
                          style: TextStyle(
                            color: _endDate != null ? Colors.black : Colors.grey,
                          ),
                        ),
                      ),
                    ),
                    if (days != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'Total Days: $days',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _reasonController,
                      decoration: const InputDecoration(
                        labelText: 'Reason (Optional)',
                        border: OutlineInputBorder(),
                        hintText: 'Enter reason for leave...',
                      ),
                      maxLines: 4,
                      maxLength: 1000,
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _isSubmitting ? null : _submitLeaveRequest,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : const Text(
                              'Submit Request',
                              style: TextStyle(fontSize: 16),
                            ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }
}
