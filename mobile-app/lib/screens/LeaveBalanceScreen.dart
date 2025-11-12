import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../src/auth_service.dart';

class LeaveApiBase {
  static String get base {
    const override = String.fromEnvironment('LEAVE_API_BASE', defaultValue: '');
    if (override.isNotEmpty) {
      return override;
    }

    const useLocalPhase2 = bool.fromEnvironment('USE_LOCAL_PHASE2', defaultValue: false);
    if (useLocalPhase2) {
      if (kIsWeb) {
        return 'http://localhost:3000';
      }
      if (Platform.isAndroid) {
        return 'http://10.0.2.2:3000';
      }
      return 'http://localhost:3000';
    }

    return 'https://xfub6mzcqg.execute-api.ap-southeast-2.amazonaws.com';
  }
}

class LeaveBalanceScreen extends StatefulWidget {
  const LeaveBalanceScreen({super.key});

  @override
  State<LeaveBalanceScreen> createState() => _LeaveBalanceScreenState();
}

class _LeaveBalanceScreenState extends State<LeaveBalanceScreen> {
  bool _isLoading = true;
  String? _error;
  Map<String, dynamic>? _leaveBalance;
  Map<String, dynamic>? _leaveRequests;
  int _selectedTab = 0; // 0 for balance, 1 for history

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      var token = await AuthService.instance.getAccessToken();
      if (token == null || token.isEmpty) {
        throw Exception('Not authenticated');
      }

      // Load leave balance and requests in parallel
      await Future.wait([
        _loadLeaveBalance(token),
        _loadLeaveRequests(token),
      ]);
    } catch (e) {
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadLeaveBalance(String token) async {
    try {
      final res = await http.get(
        Uri.parse('${LeaveApiBase.base}/api/v1/leave/balance'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        setState(() {
          _leaveBalance = data;
        });
      } else if (res.statusCode == 401) {
        final refreshedToken = await AuthService.instance.getAccessToken(forceRefresh: true);
        if (refreshedToken != null && refreshedToken.isNotEmpty && refreshedToken != token) {
          return _loadLeaveBalance(refreshedToken);
        }
        throw Exception('Session expired. Please sign in again.');
      } else {
        final errorBody = json.decode(res.body);
        throw Exception(errorBody['message'] ?? 'Failed to load leave balance');
      }
    } catch (e) {
      // If balance fails, set empty but continue with requests
      setState(() {
        _leaveBalance = {'balances': []};
      });
    }
  }

  Future<void> _loadLeaveRequests(String token) async {
    try {
      final res = await http.get(
        Uri.parse('${LeaveApiBase.base}/api/v1/leave/requests?page=0&size=50&sort=created_at,desc'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (res.statusCode == 200) {
        setState(() {
          _leaveRequests = json.decode(res.body);
        });
      } else if (res.statusCode == 401) {
        final refreshedToken = await AuthService.instance.getAccessToken(forceRefresh: true);
        if (refreshedToken != null && refreshedToken.isNotEmpty && refreshedToken != token) {
          return _loadLeaveRequests(refreshedToken);
        }
        throw Exception('Session expired. Please sign in again.');
      } else {
        throw Exception('Failed to load leave requests');
      }
    } catch (e) {
      // If requests fail, continue with balance
      setState(() {
        _leaveRequests = {'content': [], 'totalElements': 0};
      });
    }
  }

  String _getStatusColor(String status) {
    switch (status.toUpperCase()) {
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

  Color _getStatusColorWidget(String status) {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return Colors.green;
      case 'REJECTED':
        return Colors.red;
      case 'PENDING':
        return Colors.orange;
      case 'CANCELLED':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Leave Balance & History'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _isLoading
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
                      ElevatedButton(
                        onPressed: _loadData,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : Column(
                  children: [
                    // Tabs
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.grey[200],
                        borderRadius: const BorderRadius.only(
                          bottomLeft: Radius.circular(16),
                          bottomRight: Radius.circular(16),
                        ),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: _buildTabButton(0, 'Balance', Icons.account_balance_wallet),
                          ),
                          Expanded(
                            child: _buildTabButton(1, 'History', Icons.history),
                          ),
                        ],
                      ),
                    ),
                    // Content
                    Expanded(
                      child: _selectedTab == 0
                          ? _buildBalanceTab()
                          : _buildHistoryTab(),
                    ),
                  ],
                ),
    );
  }

  Widget _buildTabButton(int index, String label, IconData icon) {
    final isSelected = _selectedTab == index;
    return InkWell(
      onTap: () => setState(() => _selectedTab = index),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: isSelected ? Colors.blue : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              color: isSelected ? Colors.white : Colors.grey[700],
              size: 20,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : Colors.grey[700],
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBalanceTab() {
    final balances = _leaveBalance?['balances'] as List? ?? [];

    if (balances.isEmpty && _leaveBalance != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.account_balance_wallet, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'No leave balances found',
              style: TextStyle(color: Colors.grey[600]),
            ),
            const SizedBox(height: 8),
            Text(
              'Leave balances will be initialized automatically',
              style: TextStyle(color: Colors.grey[500], fontSize: 12),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadData,
              child: const Text('Refresh'),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Leave Balances',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.grey[800],
            ),
          ),
          const SizedBox(height: 16),
          ...balances.map((balance) => _buildBalanceCard(balance)),
        ],
      ),
    );
  }

  Widget _buildBalanceCard(Map<String, dynamic> balance) {
    final balanceDays = balance['balance_days'] ?? 0.0;
    final policyName = balance['policy_name'] ?? 'Unknown';
    final year = balance['year'] ?? DateTime.now().year;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.calendar_today, color: Colors.blue, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    policyName,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Year: $year',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  balanceDays.toStringAsFixed(1),
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: balanceDays > 0 ? Colors.green : Colors.red,
                  ),
                ),
                Text(
                  'days',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHistoryTab() {
    final requests = _leaveRequests?['content'] as List? ?? [];
    final totalElements = _leaveRequests?['totalElements'] ?? 0;

    if (requests.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'No leave requests found',
              style: TextStyle(color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Leave History',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.grey[800],
                ),
              ),
              Text(
                'Total: $totalElements',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: requests.length,
            itemBuilder: (context, index) {
              return _buildRequestCard(requests[index]);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildRequestCard(Map<String, dynamic> request) {
    final requestId = request['request_id'] ?? 0;
    final policyName = request['policy_name'] ?? 'Unknown';
    final status = request['status'] ?? 'UNKNOWN';
    final startDate = request['start_date'] ?? '';
    final endDate = request['end_date'] ?? '';
    final days = request['days'] ?? 0;
    final reason = request['reason'] ?? '';
    final createdAt = request['created_at'] ?? '';

    // Parse dates
    String formatDate(String dateStr) {
      try {
        final date = DateTime.parse(dateStr);
        return '${date.day}/${date.month}/${date.year}';
      } catch (e) {
        return dateStr;
      }
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    policyName,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _getStatusColorWidget(status).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: _getStatusColorWidget(status),
                      width: 1,
                    ),
                  ),
                  child: Text(
                    status,
                    style: TextStyle(
                      color: _getStatusColorWidget(status),
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(Icons.calendar_today, size: 16, color: Colors.grey[600]),
                const SizedBox(width: 8),
                Text(
                  '${formatDate(startDate)} - ${formatDate(endDate)}',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[700],
                  ),
                ),
                const SizedBox(width: 16),
                Icon(Icons.access_time, size: 16, color: Colors.grey[600]),
                const SizedBox(width: 8),
                Text(
                  '$days ${days == 1 ? 'day' : 'days'}',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[700],
                  ),
                ),
              ],
            ),
            if (reason.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                'Reason: $reason',
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey[600],
                  fontStyle: FontStyle.italic,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            const SizedBox(height: 8),
            Text(
              'Requested: ${formatDate(createdAt)}',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[500],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

