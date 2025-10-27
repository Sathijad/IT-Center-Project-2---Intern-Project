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
}

