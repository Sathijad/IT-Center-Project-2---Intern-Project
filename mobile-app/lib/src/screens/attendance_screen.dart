import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../api_client.dart';
import '../models/attendance_log.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  final _apiClient = ApiClient();
  AttendanceLog? _todayAttendance;
  List<AttendanceLog>? _recentLogs;
  bool _loading = true;
  bool _actionInProgress = false;
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
      final today = await _apiClient.getTodayAttendance();
      final logsData = await _apiClient.getAttendanceLogs(page: 1, size: 10);
      setState(() {
        _todayAttendance = today;
        _recentLogs = logsData['data'] as List<AttendanceLog>;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _clockIn() async {
    setState(() => _actionInProgress = true);
    try {
      await _apiClient.clockIn(source: 'MOBILE');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Clocked in successfully!')),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to clock in: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _actionInProgress = false);
      }
    }
  }

  Future<void> _clockOut() async {
    setState(() => _actionInProgress = true);
    try {
      await _apiClient.clockOut(source: 'MOBILE');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Clocked out successfully!')),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to clock out: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _actionInProgress = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final canClockIn = _todayAttendance == null || _todayAttendance!.clockOut != null;
    final canClockOut = _todayAttendance != null && _todayAttendance!.clockOut == null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendance'),
        actions: [
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
                        // Today's Status Card
                        Card(
                          elevation: 2,
                          color: Colors.blue[50],
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  "Today's Status",
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                if (_todayAttendance == null)
                                  const Text('No attendance record for today')
                                else ...[
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          const Text(
                                            'Clock In',
                                            style: TextStyle(fontSize: 12),
                                          ),
                                          Text(
                                            DateFormat('hh:mm a')
                                                .format(_todayAttendance!.clockIn),
                                            style: const TextStyle(
                                              fontSize: 18,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                                      if (_todayAttendance!.clockOut != null)
                                        Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            const Text(
                                              'Clock Out',
                                              style: TextStyle(fontSize: 12),
                                            ),
                                            Text(
                                              DateFormat('hh:mm a').format(
                                                  _todayAttendance!.clockOut!),
                                              style: const TextStyle(
                                                fontSize: 18,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ],
                                        )
                                      else
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 12, vertical: 6),
                                          decoration: BoxDecoration(
                                            color: Colors.green,
                                            borderRadius:
                                                BorderRadius.circular(12),
                                          ),
                                          child: const Text(
                                            'Active',
                                            style: TextStyle(
                                              color: Colors.white,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                  if (_todayAttendance!.durationMinutes != null)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 12),
                                      child: Text(
                                        'Duration: ${_todayAttendance!.formattedDuration}',
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ),
                                ],
                                const SizedBox(height: 16),
                                Row(
                                  children: [
                                    Expanded(
                                      child: FilledButton.icon(
                                        onPressed: canClockIn && !_actionInProgress
                                            ? _clockIn
                                            : null,
                                        icon: const Icon(Icons.login),
                                        label: const Text('Clock In'),
                                        style: FilledButton.styleFrom(
                                          backgroundColor: Colors.green,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: FilledButton.icon(
                                        onPressed: canClockOut && !_actionInProgress
                                            ? _clockOut
                                            : null,
                                        icon: const Icon(Icons.logout),
                                        label: const Text('Clock Out'),
                                        style: FilledButton.styleFrom(
                                          backgroundColor: Colors.red,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Recent Attendance Logs
                        const Text(
                          'Recent Records',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 12),
                        if (_recentLogs == null || _recentLogs!.isEmpty)
                          const Card(
                            child: Padding(
                              padding: EdgeInsets.all(24),
                              child: Center(
                                child: Text('No attendance records'),
                              ),
                            ),
                          )
                        else
                          ..._recentLogs!.map((log) {
                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: log.clockOut != null
                                      ? Colors.green[100]
                                      : Colors.orange[100],
                                  child: Icon(
                                    log.clockOut != null
                                        ? Icons.check_circle
                                        : Icons.access_time,
                                    color: log.clockOut != null
                                        ? Colors.green
                                        : Colors.orange,
                                  ),
                                ),
                                title: Text(
                                  DateFormat('MMM dd, yyyy').format(log.clockIn),
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'In: ${DateFormat('hh:mm a').format(log.clockIn)}',
                                    ),
                                    if (log.clockOut != null)
                                      Text(
                                        'Out: ${DateFormat('hh:mm a').format(log.clockOut!)}',
                                      ),
                                    if (log.durationMinutes != null)
                                      Text(
                                        'Duration: ${log.formattedDuration}',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w500,
                                          color: Colors.blue[700],
                                        ),
                                      ),
                                  ],
                                ),
                                trailing: log.clockOut == null
                                    ? const Chip(
                                        label: Text('Active'),
                                        backgroundColor: Colors.orange,
                                      )
                                    : null,
                              ),
                            );
                          }),
                      ],
                    ),
                  ),
                ),
    );
  }
}

