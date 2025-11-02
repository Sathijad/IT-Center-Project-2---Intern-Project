class AttendanceLog {
  final int id;
  final int userId;
  final DateTime clockIn;
  final DateTime? clockOut;
  final int? durationMinutes;
  final double? latitude;
  final double? longitude;
  final String source;
  final DateTime createdAt;

  AttendanceLog({
    required this.id,
    required this.userId,
    required this.clockIn,
    this.clockOut,
    this.durationMinutes,
    this.latitude,
    this.longitude,
    required this.source,
    required this.createdAt,
  });

  factory AttendanceLog.fromJson(Map<String, dynamic> json) {
    return AttendanceLog(
      id: json['id'] as int,
      userId: json['userId'] as int,
      clockIn: DateTime.parse(json['clockIn'] as String),
      clockOut: json['clockOut'] != null
          ? DateTime.parse(json['clockOut'] as String)
          : null,
      durationMinutes: json['durationMinutes'] as int?,
      latitude: json['latitude'] != null ? (json['latitude'] as num).toDouble() : null,
      longitude: json['longitude'] != null ? (json['longitude'] as num).toDouble() : null,
      source: json['source'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'clockIn': clockIn.toIso8601String(),
      'clockOut': clockOut?.toIso8601String(),
      'durationMinutes': durationMinutes,
      'latitude': latitude,
      'longitude': longitude,
      'source': source,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  String get formattedDuration {
    if (durationMinutes == null) return '-';
    final hours = durationMinutes! ~/ 60;
    final minutes = durationMinutes! % 60;
    return '${hours}h ${minutes}m';
  }
}

