import 'dart:convert';
import 'dart:developer' as developer;
import 'package:http/http.dart' as http;
import 'api_base.dart';
import 'auth_service.dart';
import 'models/user_profile.dart';

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
}

