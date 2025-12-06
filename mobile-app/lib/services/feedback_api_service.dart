import 'dart:io';
import 'package:dio/dio.dart';
import '../models/feedback.dart' as models;
import '../src/api_base.dart';
import '../src/auth_service.dart';

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
  Future<models.Feedback> createFeedback({
    required String title,
    required String description,
    required String category,
    String priority = 'MEDIUM',
    List<String> labels = const [],
    List<File>? attachments,
  }) async {
    final data = <String, dynamic>{
      'title': title,
      'description': description,
      'category': category,
      'priority': priority,
      'labels': labels,
    };

    if (attachments != null && attachments.isNotEmpty) {
      // For now, we'll handle file uploads separately
      // In a real implementation, you'd upload to S3 first and get presigned URLs
      data['attachments'] = <Map<String, dynamic>>[];
    }

    final response = await _dio.post('/api/v1/feedback', data: data);
    return models.Feedback.fromJson(response.data);
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
  Future<models.Feedback> getFeedbackById(String id) async {
    final response = await _dio.get('/api/v1/feedback/$id');
    return models.Feedback.fromJson(response.data);
  }

  // Add message to feedback
  Future<models.FeedbackMessage> addMessage({
    required String feedbackId,
    required String content,
    List<File>? attachments,
  }) async {
    final data = <String, dynamic>{
      'content': content,
    };

    if (attachments != null && attachments.isNotEmpty) {
      data['attachments'] = <Map<String, dynamic>>[];
    }

    final response = await _dio.post('/api/v1/feedback/$feedbackId/messages', data: data);
    return models.FeedbackMessage.fromJson(response.data);
  }
}

class AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    // Get access token from AuthService (Amplify Cognito)
    try {
      final token = await AuthService.instance.getAccessToken();
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    } catch (e) {
      // Log error but don't block the request
      // The backend will return 401 if token is missing/invalid
      print('Failed to get access token for feedback API: $e');
    }
    handler.next(options);
  }
}

