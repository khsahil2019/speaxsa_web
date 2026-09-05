class ParentRequestModel {
  final String id;
  final String parentId;
  final String studentId;
  final String? parentName;
  final String? parentEmail;
  final String? parentPhone;
  final String? parentPhoto;
  final String status; // pending, approved, rejected
  final String? createdAt;

  ParentRequestModel({
    required this.id,
    required this.parentId,
    required this.studentId,
    this.parentName,
    this.parentEmail,
    this.parentPhone,
    this.parentPhoto,
    this.status = 'pending',
    this.createdAt,
  });

  factory ParentRequestModel.fromJson(Map<String, dynamic> json) {
    return ParentRequestModel(
      id: json['id']?.toString() ?? json['link_id']?.toString() ?? json['linkId']?.toString() ?? '',
      parentId: json['parent_id']?.toString() ?? json['parentId']?.toString() ?? '',
      studentId: json['student_id']?.toString() ?? json['studentId']?.toString() ?? '',
      parentName: json['parent_name']?.toString() ?? json['parentName']?.toString() ?? json['name']?.toString(),
      parentEmail: json['parent_email']?.toString() ?? json['parentEmail']?.toString() ?? json['email']?.toString(),
      parentPhone: json['parent_phone']?.toString() ?? json['parentPhone']?.toString() ?? json['phone']?.toString(),
      parentPhoto: json['parent_photo']?.toString() ?? json['photo_url']?.toString(),
      status: json['status']?.toString() ?? 'pending',
      createdAt: json['created_at']?.toString() ?? json['createdAt']?.toString() ?? json['linked_at']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'parent_id': parentId,
      'student_id': studentId,
      'parent_name': parentName,
      'parent_email': parentEmail,
      'parent_phone': parentPhone,
      'parent_photo': parentPhoto,
      'status': status,
      'created_at': createdAt,
    };
  }
}
