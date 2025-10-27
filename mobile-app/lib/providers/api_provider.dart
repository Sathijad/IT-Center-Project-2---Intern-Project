import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'auth_provider.dart';

class ApiProvider extends ChangeNotifier {
  late final Dio _dio;
  final AuthProvider _authProvider;

  ApiProvider(this._authProvider) {
    _dio = Dio();
    _dio.options.baseUrl = 'http://10.0.2.2:8080'; // Android emulator localhost
    _dio.options.connectTimeout = const Duration(seconds: 30);
    _dio.options.receiveTimeout = const Duration(seconds: 30);

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        final token = _authProvider.accessToken;
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        if (error.response?.statusCode == 401) {
          _authProvider.logout();
        }
        return handler.next(error);
      },
    ));
  }

  Dio get dio => _dio;
}

