import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../api_client.dart';
import '../models/leave_request.dart';
import 'apply_leave_screen.dart';

class LeaveHomeScreen extends StatefulWidget {
  const LeaveHomeScreen({super.key});

  @override
  State<LeaveHomeScreen> createState() => _LeaveHomeScreenState();
}

class _LeaveHomeScreenState extends State<LeaveHomeScreen> {
  final _apiClient = ApiClient();
  List<LeaveBalance>? _balances;
  List<LeaveRequest>? _requests;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final balances = await _apiClient.getLeaveBalance();
      final requestsData = await _apiClient.getLeaveRequests(page: 1, size: 10);
      setState(() {
        _balances = balances;
        _requests = requestsData['data'] as List<LeaveRequest>;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  String _getStatusColor(String status) {
    switch (status) {
      case 'APPROVED':
        return 'green';
      case 'REJECTED':
        return 'red';
      case 'PENDING':
        return 'orange';
      case 'CANCELLED':
        return 'grey';
      default:
        return 'grey';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Leave Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const ApplyLeaveScreen(),
                ),
              );
              if (result == true) {
                _loadData();
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
                      const SizedBox(height: 16),
                      Text(
                        _error!,
                        style: TextStyle(color: Colors.red[700]),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: _loadData,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Leave Balances Card
                        if (_balances != null && _balances!.isNotEmpty) ...[
                          Card(
                            elevation: 2,
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Leave Balances',
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  ..._balances!.map((balance) {
                                    // Map policy IDs to names (hardcoded for now)
                                    final policyNames = {
                                      1: 'Annual',
                                      2: 'Casual',
                                      3: 'Sick',
                                    };
                                    final policyName =
                                        policyNames[balance.policyId] ?? 'Leave';
                                    return Padding(
                                      padding: const EdgeInsets.only(bottom: 8),
                                      child: Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            policyName,
                                            style: const TextStyle(fontSize: 16),
                                          ),
                                          Text(
                                            '${balance.balanceDays.toStringAsFixed(1)} days',
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.blue,
                                            ),
                                          ),
                                        ],
                                      ),
                                    );
                                  }),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],

                        // Recent Leave Requests
                        const Text(
                          'Recent Requests',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 12),
                        if (_requests == null || _requests!.isEmpty)
                          const Card(
                            child: Padding(
                              padding: EdgeInsets.all(24),
                              child: Center(
                                child: Text('No leave requests yet'),
                              ),
                            ),
                          )
                        else
                          ..._requests!.map((request) {
                            final statusColor = _getStatusColor(request.status);
                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              child: ListTile(
                                title: Text(
                                  DateFormat('MMM dd, yyyy')
                                      .format(request.startDate),
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'To: ${DateFormat('MMM dd, yyyy').format(request.endDate)}',
                                    ),
                                    if (request.halfDay != null)
                                      Text('Half day: ${request.halfDay}'),
                                    if (request.reason != null)
                                      Text(
                                        request.reason!,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                  ],
                                ),
                                trailing: Chip(
                                  label: Text(
                                    request.status,
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                  backgroundColor: Color(_getColorHex(statusColor)),
                                  labelStyle: const TextStyle(color: Colors.white),
                                ),
                                isThreeLine: true,
                              ),
                            );
                          }),
                      ],
                    ),
                  ),
                ),
    );
  }

  int _getColorHex(String colorName) {
    switch (colorName) {
      case 'green':
        return 0xFF4CAF50;
      case 'red':
        return 0xFFF44336;
      case 'orange':
        return 0xFFFF9800;
      case 'grey':
        return 0xFF9E9E9E;
      default:
        return 0xFF9E9E9E;
    }
  }
}

