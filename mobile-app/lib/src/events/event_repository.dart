import 'dart:convert';
import 'package:http/http.dart' as http;
import '../api_base.dart';
import '../auth_service.dart';
import 'models.dart';

class EventRepository {
  final http.Client _client;
  String? _etag;
  List<EventItem> _cache = [];

  EventRepository({http.Client? client}) : _client = client ?? http.Client();

  Future<List<EventItem>> fetchFeed() async {
    // Events backend requires id_token, not access_token
    final token = await AuthService.instance.getIdToken();
    if (token == null || token.isEmpty) {
      throw Exception('Not authenticated - ID token not available');
    }
    final headers = {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
      if (_etag != null) 'If-None-Match': _etag!,
    };
    final uri = Uri.parse('${ApiBase.eventsBase}/api/v1/events?page=1&size=20&status=PUBLISHED');
    final response = await _client.get(uri, headers: headers);
    if (response.statusCode == 304) {
      return _cache;
    }
    if (response.statusCode != 200) {
      throw Exception('Failed to load events: ${response.statusCode}');
    }
    _etag = response.headers['etag'];
    final data = json.decode(response.body) as Map<String, dynamic>;
    final items = (data['items'] as List<dynamic>? ?? [])
        .map((json) => EventItem.fromJson(json as Map<String, dynamic>))
        .toList();
    _cache = items;
    return items;
  }
}

