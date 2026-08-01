class LiveClassModel {
  final String id;
  final String batchId;
  final String teacherId;
  final String title;
  final String? classDate;
  final String? classTime;
  final String status; // scheduled, live, ended, cancelled
  final String? agoraChannel;
  final String? teacherName;
  final String? teacherPhoto;
  final String? batchName;

  LiveClassModel({
    required this.id,
    required this.batchId,
    required this.teacherId,
    required this.title,
    this.classDate,
    this.classTime,
    this.status = 'scheduled',
    this.agoraChannel,
    this.teacherName,
    this.teacherPhoto,
    this.batchName,
  });

  factory LiveClassModel.fromJson(Map<String, dynamic> json) {
    return LiveClassModel(
      id: json['id']?.toString() ?? '',
      batchId: json['batch_id']?.toString() ?? '',
      teacherId: json['teacher_id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      classDate: json['class_date']?.toString(),
      classTime: json['class_time']?.toString(),
      status: json['status']?.toString() ?? 'scheduled',
      agoraChannel: json['agora_channel']?.toString(),
      teacherName: json['teacher_name']?.toString(),
      teacherPhoto: json['teacher_photo']?.toString(),
      batchName: json['batch_name']?.toString(),
    );
  }
}
