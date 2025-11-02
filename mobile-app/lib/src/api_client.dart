import 'dart:convert';
import 'dart:developer' as developer;
import 'package:http/http.dart' as http;
import 'api_base.dart';
import 'api_base_phase2.dart';
import 'auth_service.dart';
import 'models/user_profile.dart';
import 'models/leave_request.dart';
import 'models/attendance_log.dart';

class ApiClient {
  Future<Map<String, String>> _authHeaders() async {
    final t = await AuthService.instance.getAccessToken();
    return {
      'Authorization': 'Bearer $t',
      'Content-Type': 'application/json',
    };
  }

  Future<UserProfile> me() async {
    final h = await _authHeaders();
    final r = await http.get(Uri.parse('${ApiBase.base}/api/v1/me'), headers: h);
    if (r.statusCode != 200) {
      throw Exception('GET /me failed: ${r.statusCode} ${r.body}');
    }
    return UserProfile.fromJson(json.decode(r.body));
  }

  Future<UserProfile> updateMe({
    required String displayName,
    required String locale,
  }) async {
    final h = await _authHeaders();
    final body = json.encode({
      'displayName': displayName,
      'locale': locale,
    });
    
    // Debug logging
    developer.log('[PATCH /me] URL: ${ApiBase.base}/api/v1/me');
    developer.log('[PATCH /me] headers: $h');
    developer.log('[PATCH /me] body: $body');
    
    final r = await http.patch(
      Uri.parse('${ApiBase.base}/api/v1/me'),
      headers: h,
      body: body,
    );
    
    developer.log('[PATCH /me] status: ${r.statusCode}');
    developer.log('[PATCH /me] response body: ${r.body}');
    
    if (r.statusCode != 200) {
      throw Exception('PATCH /me failed: ${r.statusCode} ${r.body}');
    }
    return UserProfile.fromJson(json.decode(r.body));
  }

  /// Mark login for this session (idempotent per JWT token)
  /// Call this once after successful sign-in to record login in audit log
  Future<void> markLoginOnce() async {
    developer.log('[MARK-LOGIN] Method called from mobile app');
    
    final token = await AuthService.instance.getAccessToken();
    developer.log('[MARK-LOGIN] Access token length: ${token?.length ?? 0}');
    
    if (token == null || token.isEmpty) {
      developer.log('[MARK-LOGIN] ERROR: No access token available, skipping');
      return;
    }

    final url = '${ApiBase.base}/api/v1/sessions/mark-login';
    developer.log('[MARK-LOGIN] URL: $url');
    developer.log('[MARK-LOGIN] Authorization header: Bearer ${token.substring(0, token.length > 20 ? 20 : token.length)}...');

    try {
      final r = await http.post(
        Uri.parse(url),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({}),
      );
      
      developer.log('[MARK-LOGIN] Response status: ${r.statusCode}');
      developer.log('[MARK-LOGIN] Response body: ${r.body}');
      developer.log('[MARK-LOGIN] Response headers: ${r.headers}');
      
      if (r.statusCode != 204 && r.statusCode != 200) {
        developer.log('[MARK-LOGIN] WARNING: Unexpected status code: ${r.statusCode}');
      } else {
        developer.log('[MARK-LOGIN] SUCCESS: Login marked successfully');
      }
    } catch (e, stackTrace) {
      developer.log('[MARK-LOGIN] ERROR: Failed to mark login: $e');
      developer.log('[MARK-LOGIN] Stack trace: $stackTrace');
      // Don't fail the login flow if this fails
    }
  }

  // ========== Phase 2: Leave & Attendance API Methods ==========

  /// Get leave balance for current user or specified user
  Future<List<LeaveBalance>> getLeaveBalance({int? userId}) async {
    final h = await _authHeaders();
    final params = userId != null ? '?user_id=$userId' : '';
    final r = await http.get(
      Uri.parse('${ApiBasePhase2.base}/api/v1/leave/balance$params'),
      headers: h,
    );
    if (r.statusCode != 200) {
      throw Exception('GET /leave/balance failed: ${r.statusCode} ${r.body}');
    }
    final data = json.decode(r.body)['data'] as List;
    return data.map((json) => LeaveBalance.fromJson(json)).toList();
  }

  /// Get leave requests with optional filters
  Future<Map<String, dynamic>> getLeaveRequests({
    int? userId,
    String? status,
    String? from,
    String? to,
    int? page,
    int? size,
  }) async {
    final h = await _authHeaders();
    final uri = Uri.parse('${ApiBasePhase2.base}/api/v1/leave/requests').replace(
      queryParameters: {
        if (userId != null) 'user_id': userId.toString(),
        if (status != null) 'status': status,
        if (from != null) 'from': from,
        if (to != null) 'to': to,
        if (page != null) 'page': page.toString(),
        if (size != null) 'size': size.toString(),
      },
    );
    final r = await http.get(uri, headers: h);
    if (r.statusCode != 200) {
      throw Exception('GET /leave/requests failed: ${r.statusCode} ${r.body}');
    }
    final jsonData = json.decode(r.body);
    return {
      'data': (jsonData['data'] as List)
          .map((json) => LeaveRequest.fromJson(json))
          .toList(),
      'pagination': jsonData['pagination'],
    };
  }

  /// Create a new leave request
  Future<LeaveRequest> createLeaveRequest({
    required int policyId,
    required DateTime startDate,
    required DateTime endDate,
    String? halfDay,
    String? reason,
  }) async {
    final h = await _authHeaders();
    final body = json.encode({
      'policyId': policyId,
      'startDate': startDate.toIso8601String().split('T')[0],
      'endDate': endDate.toIso8601String().split('T')[0],
      if (halfDay != null) 'halfDay': halfDay,
      if (reason != null) 'reason': reason,
    });
    final r = await http.post(
      Uri.parse('${ApiBasePhase2.base}/api/v1/leave/requests'),
      headers: h,
      body: body,
    );
    if (r.statusCode != 201 && r.statusCode != 200) {
      throw Exception('POST /leave/requests failed: ${r.statusCode} ${r.body}');
    }
    return LeaveRequest.fromJson(json.decode(r.body)['data']);
  }

  /// Cancel a leave request
  Future<LeaveRequest> cancelLeaveRequest(int requestId) async {
    final h = await _authHeaders();
    final r = await http.patch(
      Uri.parse('${ApiBasePhase2.base}/api/v1/leave/requests/$requestId/cancel'),
      headers: h,
    );
    if (r.statusCode != 200) {
      throw Exception('PATCH /leave/requests/$requestId/cancel failed: ${r.statusCode} ${r.body}');
    }
    return LeaveRequest.fromJson(json.decode(r.body)['data']);
  }

  /// Clock in for attendance
  Future<AttendanceLog> clockIn({
    double? latitude,
    double? longitude,
    String? source,
  }) async {
    final h = await _authHeaders();
    final body = json.encode({
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      if (source != null) 'source': source,
    });
    final r = await http.post(
      Uri.parse('${ApiBasePhase2.base}/api/v1/attendance/clock-in'),
      headers: h,
      body: body,
    );
    if (r.statusCode != 201 && r.statusCode != 200) {
      throw Exception('POST /attendance/clock-in failed: ${r.statusCode} ${r.body}');
    }
    return AttendanceLog.fromJson(json.decode(r.body)['data']);
  }

  /// Clock out for attendance
  Future<AttendanceLog> clockOut({String? source}) async {
    final h = await _authHeaders();
    final body = json.encode({
      if (source != null) 'source': source,
    });
    final r = await http.post(
      Uri.parse('${ApiBasePhase2.base}/api/v1/attendance/clock-out'),
      headers: h,
      body: body,
    );
    if (r.statusCode != 200) {
      throw Exception('POST /attendance/clock-out failed: ${r.statusCode} ${r.body}');
    }
    return AttendanceLog.fromJson(json.decode(r.body)['data']);
  }

  /// Get today's attendance status
  Future<AttendanceLog?> getTodayAttendance() async {
    final h = await _authHeaders();
    final r = await http.get(
      Uri.parse('${ApiBasePhase2.base}/api/v1/attendance/today'),
      headers: h,
    );
    if (r.statusCode == 404) {
      return null; // No attendance record for today
    }
    if (r.statusCode != 200) {
      throw Exception('GET /attendance/today failed: ${r.statusCode} ${r.body}');
    }
    final data = json.decode(r.body)['data'];
    return data != null ? AttendanceLog.fromJson(data) : null;
  }

  /// Get attendance logs with optional filters
  Future<Map<String, dynamic>> getAttendanceLogs({
    int? userId,
    String? from,
    String? to,
    int? page,
    int? size,
  }) async {
    final h = await _authHeaders();
    final uri = Uri.parse('${ApiBasePhase2.base}/api/v1/attendance').replace(
      queryParameters: {
        if (userId != null) 'user_id': userId.toString(),
        if (from != null) 'from': from,
        if (to != null) 'to': to,
        if (page != null) 'page': page.toString(),
        if (size != null) 'size': size.toString(),
      },
    );
    final r = await http.get(uri, headers: h);
    if (r.statusCode != 200) {
      throw Exception('GET /attendance failed: ${r.statusCode} ${r.body}');
    }
    final jsonData = json.decode(r.body);
    return {
      'data': (jsonData['data'] as List)
          .map((json) => AttendanceLog.fromJson(json))
          .toList(),
      'pagination': jsonData['pagination'],
    };
  }
}

