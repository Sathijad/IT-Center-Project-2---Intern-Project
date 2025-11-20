import 'dart:convert';
import 'dart:developer' as developer;
import 'package:http/http.dart' as http;
import 'booking_api_base.dart';
import 'auth_service.dart';

class BookingApi {
  Future<Map<String, String>> _authHeaders() async {
    final token = await AuthService.instance.getAccessToken();
    return {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    };
  }

  // Room endpoints
  Future<List<Map<String, dynamic>>> getRooms({
    int? capacity,
    String? location,
    List<String>? amenities,
  }) async {
    final headers = await _authHeaders();
    final queryParams = <String, String>{};
    if (capacity != null) queryParams['capacity'] = capacity.toString();
    if (location != null && location.isNotEmpty) queryParams['location'] = location;
    if (amenities != null && amenities.isNotEmpty) {
      queryParams['amenities'] = amenities.join(',');
    }

    final uri = Uri.parse('${BookingApiBase.base}/api/v1/rooms').replace(queryParameters: queryParams);
    final response = await http.get(uri, headers: headers);

    if (response.statusCode != 200) {
      throw Exception('GET /rooms failed: ${response.statusCode} ${response.body}');
    }

    final data = json.decode(response.body) as Map<String, dynamic>;
    final rooms = (data['rooms'] as List? ?? []) as List<dynamic>;
    return rooms.map((r) => r as Map<String, dynamic>).toList();
  }

  Future<Map<String, dynamic>> getRoom(int id) async {
    final headers = await _authHeaders();
    final response = await http.get(
      Uri.parse('${BookingApiBase.base}/api/v1/rooms/$id'),
      headers: headers,
    );

    if (response.statusCode != 200) {
      throw Exception('GET /rooms/$id failed: ${response.statusCode} ${response.body}');
    }

    final data = json.decode(response.body) as Map<String, dynamic>;
    return data['room'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getRoomAvailability(
    int roomId,
    DateTime start,
    DateTime end,
  ) async {
    final headers = await _authHeaders();
    final queryParams = {
      'start': start.toUtc().toIso8601String(),
      'end': end.toUtc().toIso8601String(),
    };

    final uri = Uri.parse('${BookingApiBase.base}/api/v1/rooms/$roomId/availability')
        .replace(queryParameters: queryParams);
    final response = await http.get(uri, headers: headers);

    if (response.statusCode != 200) {
      throw Exception('GET /rooms/$roomId/availability failed: ${response.statusCode} ${response.body}');
    }

    return json.decode(response.body) as Map<String, dynamic>;
  }

  // Booking endpoints
  Future<Map<String, dynamic>> createBooking({
    required int roomId,
    required DateTime startTs,
    required DateTime endTs,
    String? title,
    List<String>? attendees,
    String? idempotencyKey,
  }) async {
    final headers = await _authHeaders();
    if (idempotencyKey != null && idempotencyKey.isNotEmpty) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    final body = json.encode({
      'room_id': roomId,
      'start_ts': startTs.toUtc().toIso8601String(),
      'end_ts': endTs.toUtc().toIso8601String(),
      if (title != null && title.isNotEmpty) 'title': title,
      if (attendees != null && attendees.isNotEmpty) 'attendees': attendees,
    });

    final response = await http.post(
      Uri.parse('${BookingApiBase.base}/api/v1/bookings'),
      headers: headers,
      body: body,
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
      final errorBody = json.decode(response.body) as Map<String, dynamic>;
      throw Exception(errorBody['message'] ?? 'Failed to create booking: ${response.statusCode}');
    }

    final data = json.decode(response.body) as Map<String, dynamic>;
    return data['booking'] as Map<String, dynamic>;
  }

  Future<List<Map<String, dynamic>>> getBookings({
    int? roomId,
    DateTime? startDate,
    DateTime? endDate,
    String? status,
  }) async {
    final headers = await _authHeaders();
    final queryParams = <String, String>{};
    if (roomId != null) queryParams['room_id'] = roomId.toString();
    if (startDate != null) {
      queryParams['start_date'] = startDate.toUtc().toIso8601String();
    }
    if (endDate != null) {
      queryParams['end_date'] = endDate.toUtc().toIso8601String();
    }
    if (status != null && status.isNotEmpty) queryParams['status'] = status;

    final uri = Uri.parse('${BookingApiBase.base}/api/v1/bookings').replace(queryParameters: queryParams);
    final response = await http.get(uri, headers: headers);

    if (response.statusCode != 200) {
      throw Exception('GET /bookings failed: ${response.statusCode} ${response.body}');
    }

    final data = json.decode(response.body) as Map<String, dynamic>;
    final bookings = (data['bookings'] as List? ?? []) as List<dynamic>;
    return bookings.map((b) => b as Map<String, dynamic>).toList();
  }

  Future<Map<String, dynamic>> getBooking(int id) async {
    final headers = await _authHeaders();
    final response = await http.get(
      Uri.parse('${BookingApiBase.base}/api/v1/bookings/$id'),
      headers: headers,
    );

    if (response.statusCode != 200) {
      throw Exception('GET /bookings/$id failed: ${response.statusCode} ${response.body}');
    }

    final data = json.decode(response.body) as Map<String, dynamic>;
    return data['booking'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> cancelBooking(int id) async {
    final headers = await _authHeaders();
    final response = await http.delete(
      Uri.parse('${BookingApiBase.base}/api/v1/bookings/$id'),
      headers: headers,
    );

    if (response.statusCode != 200) {
      final errorBody = json.decode(response.body) as Map<String, dynamic>;
      throw Exception(errorBody['message'] ?? 'Failed to cancel booking: ${response.statusCode}');
    }

    final data = json.decode(response.body) as Map<String, dynamic>;
    return data['booking'] as Map<String, dynamic>;
  }
}

