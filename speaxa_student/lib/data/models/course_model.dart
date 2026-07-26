class CourseModel {
  final String id;
  final String title;
  final String? subject;
  final String? description;
  final int durationWeeks;
  final String? grade;
  final String? board;
  final double fees;
  final String? thumbnailUrl;
  final String status;
  final int batchCount;
  final int enrolledStudents;
  final bool isVerified;
  final bool isFeatured;

  CourseModel({
    required this.id,
    required this.title,
    this.subject,
    this.description,
    this.durationWeeks = 12,
    this.grade,
    this.board,
    required this.fees,
    this.thumbnailUrl,
    this.status = 'active',
    this.batchCount = 0,
    this.enrolledStudents = 0,
    this.isVerified = true,
    this.isFeatured = false,
  });

  factory CourseModel.fromJson(Map<String, dynamic> json) {
    return CourseModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      subject: json['subject']?.toString(),
      description: json['description']?.toString(),
      durationWeeks: json['duration_weeks'] is int ? json['duration_weeks'] : int.tryParse(json['duration_weeks']?.toString() ?? '12') ?? 12,
      grade: json['grade']?.toString(),
      board: json['board']?.toString(),
      fees: json['fees'] is num ? (json['fees'] as num).toDouble() : double.tryParse(json['fees']?.toString() ?? '0.0') ?? 0.0,
      thumbnailUrl: json['thumbnail_url']?.toString(),
      status: json['status']?.toString() ?? 'active',
      batchCount: json['batch_count'] is int ? json['batch_count'] : int.tryParse(json['batch_count']?.toString() ?? '0') ?? 0,
      enrolledStudents: json['enrolled_students'] is int ? json['enrolled_students'] : int.tryParse(json['enrolled_students']?.toString() ?? '0') ?? 0,
      isVerified: json['is_verified'] == true,
      isFeatured: json['is_featured'] == true,
    );
  }
}
