class Feedback {
  final String feedbackId;
  final String title;
  final String description;
  final String category;
  final String priority;
  final String status;
  final int createdBy;
  final int? assignedTo;
  final List<String> labels;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<FeedbackMessage>? messages;
  final List<FeedbackAttachment>? attachments;

  Feedback({
    required this.feedbackId,
    required this.title,
    required this.description,
    required this.category,
    required this.priority,
    required this.status,
    required this.createdBy,
    this.assignedTo,
    required this.labels,
    required this.createdAt,
    required this.updatedAt,
    this.messages,
    this.attachments,
  });

  factory Feedback.fromJson(Map<String, dynamic> json) {
    return Feedback(
      feedbackId: json['feedback_id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      category: json['category'] ?? '',
      priority: json['priority'] ?? 'MEDIUM',
      status: json['status'] ?? 'OPEN',
      createdBy: json['created_by'] ?? 0,
      assignedTo: json['assigned_to'],
      labels: List<String>.from(json['labels'] ?? []),
      createdAt: DateTime.parse(json['created_at'] ?? DateTime.now().toIso8601String()),
      updatedAt: DateTime.parse(json['updated_at'] ?? DateTime.now().toIso8601String()),
      messages: json['messages'] != null
          ? (json['messages'] as List).map((m) => FeedbackMessage.fromJson(m)).toList()
          : null,
      attachments: json['attachments'] != null
          ? (json['attachments'] as List).map((a) => FeedbackAttachment.fromJson(a)).toList()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'description': description,
      'category': category,
      'priority': priority,
      'labels': labels,
    };
  }
}

class FeedbackMessage {
  final String messageId;
  final String feedbackId;
  final int userId;
  final String content;
  final DateTime createdAt;
  final List<FeedbackAttachment>? attachments;

  FeedbackMessage({
    required this.messageId,
    required this.feedbackId,
    required this.userId,
    required this.content,
    required this.createdAt,
    this.attachments,
  });

  factory FeedbackMessage.fromJson(Map<String, dynamic> json) {
    return FeedbackMessage(
      messageId: json['message_id'] ?? '',
      feedbackId: json['feedback_id'] ?? '',
      userId: json['user_id'] ?? 0,
      content: json['content'] ?? '',
      createdAt: DateTime.parse(json['created_at'] ?? DateTime.now().toIso8601String()),
      attachments: json['attachments'] != null
          ? (json['attachments'] as List).map((a) => FeedbackAttachment.fromJson(a)).toList()
          : null,
    );
  }
}

class FeedbackAttachment {
  final String attachmentId;
  final String feedbackId;
  final String? messageId;
  final String s3Key;
  final String fileName;
  final int? fileSize;
  final String? mimeType;
  final int uploadedBy;
  final DateTime createdAt;
  final String? downloadUrl;

  FeedbackAttachment({
    required this.attachmentId,
    required this.feedbackId,
    this.messageId,
    required this.s3Key,
    required this.fileName,
    this.fileSize,
    this.mimeType,
    required this.uploadedBy,
    required this.createdAt,
    this.downloadUrl,
  });

  factory FeedbackAttachment.fromJson(Map<String, dynamic> json) {
    return FeedbackAttachment(
      attachmentId: json['attachment_id'] ?? '',
      feedbackId: json['feedback_id'] ?? '',
      messageId: json['message_id'],
      s3Key: json['s3_key'] ?? '',
      fileName: json['file_name'] ?? '',
      fileSize: json['file_size'],
      mimeType: json['mime_type'],
      uploadedBy: json['uploaded_by'] ?? 0,
      createdAt: DateTime.parse(json['created_at'] ?? DateTime.now().toIso8601String()),
      downloadUrl: json['download_url'],
    );
  }
}

