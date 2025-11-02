import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../api_client.dart';
import '../models/leave_request.dart';

class ApplyLeaveScreen extends StatefulWidget {
  const ApplyLeaveScreen({super.key});

  @override
  State<ApplyLeaveScreen> createState() => _ApplyLeaveScreenState();
}

class _ApplyLeaveScreenState extends State<ApplyLeaveScreen> {
  final _apiClient = ApiClient();
  final _formKey = GlobalKey<FormState>();

  int? _selectedPolicyId;
  DateTime? _startDate;
  DateTime? _endDate;
  String? _halfDay;
  final _reasonController = TextEditingController();
  bool _submitting = false;

  // Policy options (should come from API, hardcoded for now)
  final List<Map<String, dynamic>> _policies = [
    {'id': 1, 'name': 'Annual Leave', 'maxDays': 20},
    {'id': 2, 'name': 'Casual Leave', 'maxDays': 10},
    {'id': 3, 'name': 'Sick Leave', 'maxDays': 7},
  ];

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _selectDate(BuildContext context, bool isStart) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: isStart
          ? (_startDate ?? DateTime.now())
          : (_endDate ?? _startDate ?? DateTime.now()),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
          if (_endDate != null && _endDate!.isBefore(picked)) {
            _endDate = null;
          }
        } else {
          _endDate = picked;
        }
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_selectedPolicyId == null ||
        _startDate == null ||
        _endDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all required fields')),
      );
      return;
    }

    setState(() => _submitting = true);

    try {
      await _apiClient.createLeaveRequest(
        policyId: _selectedPolicyId!,
        startDate: _startDate!,
        endDate: _endDate!,
        halfDay: _halfDay?.isEmpty ?? true ? null : _halfDay,
        reason: _reasonController.text.isEmpty
            ? null
            : _reasonController.text,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Leave request submitted successfully!')),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to submit: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isSameDay = _startDate != null &&
        _endDate != null &&
        _startDate!.day == _endDate!.day &&
        _startDate!.month == _endDate!.month &&
        _startDate!.year == _endDate!.year;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Apply for Leave'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Policy Selection
            DropdownButtonFormField<int>(
              decoration: const InputDecoration(
                labelText: 'Leave Type *',
                border: OutlineInputBorder(),
              ),
              value: _selectedPolicyId,
              items: _policies.map((policy) {
                return DropdownMenuItem<int>(
                  value: policy['id'] as int,
                  child: Text(policy['name'] as String),
                );
              }).toList(),
              onChanged: (value) {
                setState(() => _selectedPolicyId = value);
              },
              validator: (value) {
                if (value == null) {
                  return 'Please select a leave type';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Start Date
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
                      ? DateFormat('MMM dd, yyyy').format(_startDate!)
                      : 'Select start date',
                  style: TextStyle(
                    color: _startDate != null ? null : Colors.grey[600],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // End Date
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
                      ? DateFormat('MMM dd, yyyy').format(_endDate!)
                      : 'Select end date',
                  style: TextStyle(
                    color: _endDate != null ? null : Colors.grey[600],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Half Day Selection (only if same day)
            if (isSameDay) ...[
              DropdownButtonFormField<String>(
                decoration: const InputDecoration(
                  labelText: 'Half Day',
                  border: OutlineInputBorder(),
                ),
                value: _halfDay,
                items: const [
                  DropdownMenuItem(value: null, child: Text('Full Day')),
                  DropdownMenuItem(value: 'AM', child: Text('Morning (AM)')),
                  DropdownMenuItem(value: 'PM', child: Text('Afternoon (PM)')),
                ],
                onChanged: (value) {
                  setState(() => _halfDay = value);
                },
              ),
              const SizedBox(height: 16),
            ],

            // Reason
            TextFormField(
              controller: _reasonController,
              decoration: const InputDecoration(
                labelText: 'Reason (Optional)',
                border: OutlineInputBorder(),
                hintText: 'Enter reason for leave',
              ),
              maxLines: 4,
            ),
            const SizedBox(height: 24),

            // Submit Button
            FilledButton(
              onPressed: _submitting ? null : _submit,
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _submitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Submit Request'),
            ),
          ],
        ),
      ),
    );
  }
}

