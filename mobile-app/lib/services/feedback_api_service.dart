import 'dart:io';
import 'package:dio/dio.dart';
import '../models/feedback.dart';
import '../src/api_base.dart';

class FeedbackApiService {
  final Dio _dio;
  final String baseUrl;

  FeedbackApiService({String? baseUrl})
      : baseUrl = baseUrl ?? ApiBase.feedbackBase,
        _dio = Dio(BaseOptions(
          baseUrl: baseUrl ?? ApiBase.feedbackBase,
          headers: {
            'Content-Type': 'application/json',
          },
        )) {
    _dio.interceptors.add(AuthInterceptor());
  }

  // Create feedback
  Future<Feedback> createFeedback({
    required String title,
    required String description,
    required String category,
    String priority = 'MEDIUM',
    List<String> labels = const [],
    List<File>? attachments,
  }) async {
    final data = {
      'title': title,
      'description': description,
      'category': category,
      'priority': priority,
      'labels': labels,
    };

    if (attachments != null && attachments.isNotEmpty) {
      // For now, we'll handle file uploads separately
      // In a real implementation, you'd upload to S3 first and get presigned URLs
      data['attachments'] = [];
    }

    final response = await _dio.post('/api/v1/feedback', data: data);
    return Feedback.fromJson(response.data);
  }

  // Get my feedback list
  Future<Map<String, dynamic>> getMyFeedback({
    String? status,
    int page = 1,
    int size = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'size': size,
    };
    if (status != null && status.isNotEmpty) {
      queryParams['status'] = status;
    }

    final response = await _dio.get('/api/v1/feedback', queryParameters: queryParams);
    return response.data;
  }

  // Get feedback by ID
  Future<Feedback> getFeedbackById(String id) async {
    final response = await _dio.get('/api/v1/feedback/$id');
    return Feedback.fromJson(response.data);
  }

  // Add message to feedback
  Future<FeedbackMessage> addMessage({
    required String feedbackId,
    required String content,
    List<File>? attachments,
  }) async {
    final data = {
      'content': content,
    };

    if (attachments != null && attachments.isNotEmpty) {
      data['attachments'] = [];
    }

    final response = await _dio.post('/api/v1/feedback/$feedbackId/messages', data: data);
    return FeedbackMessage.fromJson(response.data);
  }
}

class AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    // Get token from secure storage (implement based on your auth setup)
    // For now, this is a placeholder
    final token = await _getToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  Future<String?> _getToken() async {
    // Implement token retrieval from secure storage
    // This should match your existing auth implementation
    return null;
  }
}

