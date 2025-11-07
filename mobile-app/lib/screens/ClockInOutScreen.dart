import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../src/auth_service.dart';

class LeaveApiBase {
  static String get base {
    if (kIsWeb) {
      return 'http://localhost:3000';  // Flutter Web dev
    }
    
    // For Android emulator: use 10.0.2.2 to access host machine
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:3000';
    }
    
    // For iOS simulator, Windows, Linux, macOS: use localhost
    return 'http://localhost:3000';
  }
}

class ClockInOutScreen extends StatefulWidget {
  const ClockInOutScreen({super.key});

  @override
  State<ClockInOutScreen> createState() => _ClockInOutScreenState();
}

class _ClockInOutScreenState extends State<ClockInOutScreen> {
  bool _isLoading = false;
  bool _hasActiveClockIn = false;
  Position? _currentPosition;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _checkActiveClockIn();
  }

  Future<void> _checkActiveClockIn() async {
    try {
      final token = await AuthService.instance.getAccessToken();
      if (token == null || token.isEmpty) {
        return;
      }

      // Get recent attendance logs to check for active clock-in
      final res = await http.get(
        Uri.parse('${LeaveApiBase.base}/api/v1/attendance?page=0&size=1&sort=clock_in,desc'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        final logs = data['content'] as List;
        if (logs.isNotEmpty) {
          final lastLog = logs[0];
          // Check if there's a clock-in without a clock-out
          setState(() {
            _hasActiveClockIn = lastLog['clock_out'] == null;
          });
        }
      }
    } catch (e) {
      // Error checking, assume no active clock-in
    }
  }

  Future<Position> _getCurrentLocation() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception('Location services are disabled. Please enable location services.');
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw Exception('Location permissions are denied. Please grant location permissions.');
      }
    }

    if (permission == LocationPermission.deniedForever) {
      throw Exception('Location permissions are permanently denied. Please enable them in settings.');
    }

    return await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
  }

  Future<void> _clockIn() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final position = await _getCurrentLocation();
      setState(() => _currentPosition = position);

      final token = await AuthService.instance.getAccessToken();
      if (token == null || token.isEmpty) {
        throw Exception('Not authenticated');
      }

      final requestData = {
        'latitude': position.latitude,
        'longitude': position.longitude,
        'accuracy': position.accuracy,
      };

      final res = await http.post(
        Uri.parse('${LeaveApiBase.base}/api/v1/attendance/clock-in'),
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
              content: Text('Clocked in successfully'),
              backgroundColor: Colors.green,
            ),
          );
          setState(() => _hasActiveClockIn = true);
        }
      } else {
        final error = json.decode(res.body);
        throw Exception(error['message'] ?? 'Failed to clock in');
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _clockOut() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      Position? position;
      try {
        position = await _getCurrentLocation();
        setState(() => _currentPosition = position);
      } catch (e) {
        // Location is optional for clock-out, but we'll try to get it
      }

      final token = await AuthService.instance.getAccessToken();
      if (token == null || token.isEmpty) {
        throw Exception('Not authenticated');
      }

      final requestData = position != null
          ? {
              'latitude': position.latitude,
              'longitude': position.longitude,
            }
          : {};

      final res = await http.post(
        Uri.parse('${LeaveApiBase.base}/api/v1/attendance/clock-out'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode(requestData),
      );

      if (res.statusCode == 200 || res.statusCode == 201) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Clocked out successfully'),
              backgroundColor: Colors.green,
            ),
          );
          setState(() => _hasActiveClockIn = false);
        }
      } else {
        final error = json.decode(res.body);
        throw Exception(error['message'] ?? 'Failed to clock out');
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Clock In/Out'),
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight),
              child: IntrinsicHeight(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      _hasActiveClockIn ? Icons.access_time_filled : Icons.access_time,
                      size: 80,
                      color: _hasActiveClockIn ? Colors.orange : Colors.blue,
                    ),
                    const SizedBox(height: 24),
                    Text(
                      _hasActiveClockIn ? 'Currently Clocked In' : 'Ready to Clock In',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (_currentPosition != null) ...[
                      Text(
                        'Location: ${_currentPosition!.latitude.toStringAsFixed(6)}, ${_currentPosition!.longitude.toStringAsFixed(6)}',
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                    ],
                    if (_errorMessage != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.red.shade200),
                        ),
                        child: Text(
                          _errorMessage!,
                          style: TextStyle(color: Colors.red.shade800),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isLoading
                            ? null
                            : (_hasActiveClockIn ? _clockOut : _clockIn),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          backgroundColor: _hasActiveClockIn ? Colors.orange : Colors.blue,
                          foregroundColor: Colors.white,
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              )
                            : Text(
                                _hasActiveClockIn ? 'Clock Out' : 'Clock In',
                                style: const TextStyle(fontSize: 18),
                              ),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
