class NotificationModel {
  final String id;
  final String userId;
  final String title;
  final String message;
  final String type; // class_reminder, assignment_due, report_generated, general
  final bool isRead;
  final String? createdAt;
  final String? actionUrl;
  final Map<String, dynamic>? metadata;

  NotificationModel({
    required this.id,
    required this.userId,
    required this.title,
    required this.message,
    this.type = 'general',
    this.isRead = false,
    this.createdAt,
    this.actionUrl,
    this.metadata,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? json['userId']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      message: json['message']?.toString() ?? json['body']?.toString() ?? '',
      type: json['type']?.toString() ?? 'general',
      isRead: json['is_read'] == true || json['read'] == true || json['is_read'] == 1,
      createdAt: json['created_at']?.toString() ?? json['createdAt']?.toString(),
      actionUrl: json['action_url']?.toString() ?? json['actionUrl']?.toString(),
      metadata: json['metadata'] is Map ? Map<String, dynamic>.from(json['metadata']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'title': title,
      'message': message,
      'type': type,
      'is_read': isRead,
      'created_at': createdAt,
      'action_url': actionUrl,
      'metadata': metadata,
    };
  }
}
