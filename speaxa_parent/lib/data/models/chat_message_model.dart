class ChatMessageModel {
  final int id;
  final String parentId;
  final String teacherId;
  final String studentId;
  final String senderId;
  final String message;
  final String createdAt;
  final bool isRead;
  final String? senderName;
  final String? senderRole;

  ChatMessageModel({
    required this.id,
    required this.parentId,
    required this.teacherId,
    required this.studentId,
    required this.senderId,
    required this.message,
    required this.createdAt,
    this.isRead = false,
    this.senderName,
    this.senderRole,
  });

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    return ChatMessageModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      parentId: json['parent_id']?.toString() ?? '',
      teacherId: json['teacher_id']?.toString() ?? '',
      studentId: json['student_id']?.toString() ?? '',
      senderId: json['sender_id']?.toString() ?? '',
      message: json['message']?.toString() ?? '',
      createdAt: json['created_at']?.toString() ?? '',
      isRead: json['is_read'] == true,
      senderName: json['sender_name']?.toString(),
      senderRole: json['sender_role']?.toString(),
    );
  }
}
