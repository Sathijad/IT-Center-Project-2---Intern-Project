import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_base.dart';
import 'auth_service.dart';

class SchedulerApi {
  Future<Map<String, String>> _headers() async {
    final token = await AuthService.instance.getAccessToken();
    return {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    };
  }

  Future<List<dynamic>> fetchSchedules({
    int? userId,
  }) async {
    // Use /my endpoint for employees to view their own schedules
    // Use schedules backend (port 5166) instead of auth backend (port 8080)
    final now = DateTime.now();
    final query = Uri.parse('${ApiBase.schedulesBase}/api/v1/schedules/my')
        .replace(queryParameters: {
      'rangeStart': now.toIso8601String(),
      'rangeEnd': now.add(const Duration(days: 90)).toIso8601String(),
    });
    final response = await http.get(query, headers: await _headers());
    if (response.statusCode != 200) {
      final errorBody = response.body;
      throw Exception(
          'Failed to load schedules: ${response.statusCode} - $errorBody');
    }
    final data = json.decode(response.body) as Map<String, dynamic>;
    return (data['items'] as List?) ?? [];
  }

  Future<List<dynamic>> fetchTasks({int? assigneeId}) async {
    final queryParams = <String, String>{
      'size': '50',
    };
    if (assigneeId != null) {
      queryParams['assignee'] = '$assigneeId';
    }
    // Use schedules backend (port 5166) instead of auth backend (port 8080)
    final query = Uri.parse('${ApiBase.schedulesBase}/api/v1/tasks')
        .replace(queryParameters: queryParams);
    final response = await http.get(query, headers: await _headers());
    if (response.statusCode != 200) {
      final errorBody = response.body;
      throw Exception(
          'Failed to load tasks: ${response.statusCode} - $errorBody');
    }
    final data = json.decode(response.body) as Map<String, dynamic>;
    return (data['items'] as List?) ?? [];
  }

  Future<void> addTaskComment({
    required String taskId,
    required String body,
  }) async {
    // Use schedules backend (port 5166) instead of auth backend (port 8080)
    final response = await http.post(
      Uri.parse('${ApiBase.schedulesBase}/api/v1/tasks/$taskId/comments'),
      headers: await _headers(),
      body: json.encode({'body': body}),
    );
    if (response.statusCode != 200) {
      throw Exception('Unable to submit comment');
    }
  }

  Future<void> updateTaskStatus({
    required String taskId,
    required String status,
  }) async {
    final response = await http.patch(
      Uri.parse('${ApiBase.schedulesBase}/api/v1/tasks/$taskId'),
      headers: await _headers(),
      body: json.encode({'status': status}),
    );
    if (response.statusCode != 200) {
      final errorBody = response.body;
      throw Exception(
          'Failed to update status: ${response.statusCode} - $errorBody');
    }
  }
}
