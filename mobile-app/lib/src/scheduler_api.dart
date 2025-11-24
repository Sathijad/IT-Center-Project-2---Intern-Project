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
    required int userId,
  }) async {
    final query = Uri.parse('${ApiBase.base}/api/v1/schedules').replace(queryParameters: {
      'user_id': '$userId',
      'rangeStart': DateTime.now().toIso8601String(),
      'rangeEnd': DateTime.now().add(const Duration(days: 7)).toIso8601String(),
    });
    final response = await http.get(query, headers: await _headers());
    if (response.statusCode != 200) {
      throw Exception('Failed to load schedules');
    }
    final data = json.decode(response.body) as Map<String, dynamic>;
    return (data['items'] as List?) ?? [];
  }

  Future<List<dynamic>> fetchTasks({required int assigneeId}) async {
    final query = Uri.parse('${ApiBase.base}/api/v1/tasks').replace(queryParameters: {
      'assignee': '$assigneeId',
      'size': '50',
    });
    final response = await http.get(query, headers: await _headers());
    if (response.statusCode != 200) {
      throw Exception('Failed to load tasks');
    }
    final data = json.decode(response.body) as Map<String, dynamic>;
    return (data['items'] as List?) ?? [];
  }

  Future<void> addTaskComment({
    required String taskId,
    required String body,
  }) async {
    final response = await http.post(
      Uri.parse('${ApiBase.base}/api/v1/tasks/$taskId/comments'),
      headers: await _headers(),
      body: json.encode({'body': body}),
    );
    if (response.statusCode != 200) {
      throw Exception('Unable to submit comment');
    }
  }
}

