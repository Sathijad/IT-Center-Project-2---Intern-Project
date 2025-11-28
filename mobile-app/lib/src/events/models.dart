class EventItem {
  final String id;
  final String title;
  final String summary;
  final String body;
  final String status;
  final List<String> tags;
  final DateTime createdAt;

  EventItem({
    required this.id,
    required this.title,
    required this.summary,
    required this.body,
    required this.status,
    required this.tags,
    required this.createdAt,
  });

  factory EventItem.fromJson(Map<String, dynamic> json) {
    return EventItem(
      id: json['id'] as String,
      title: json['title'] ?? '',
      summary: json['summary'] ?? '',
      body: json['body'] ?? json['summary'] ?? '',
      status: json['status'] ?? '',
      tags: (json['tags'] as List<dynamic>? ?? []).map((e) => e.toString()).toList(),
      createdAt: DateTime.tryParse(json['createdAt'] ?? json['created_at'] ?? '') ?? DateTime.now(),
    );
  }
}

