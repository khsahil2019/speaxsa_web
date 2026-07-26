class RecordingModel {
  final String id;
  final String classId;
  final String batchId;
  final String title;
  final String recordingUrl;
  final int durationMins;
  final String? thumbnailUrl;
  final String? recordedAt;
  final String? batchName;

  RecordingModel({
    required this.id,
    required this.classId,
    required this.batchId,
    required this.title,
    required this.recordingUrl,
    this.durationMins = 0,
    this.thumbnailUrl,
    this.recordedAt,
    this.batchName,
  });

  factory RecordingModel.fromJson(Map<String, dynamic> json) {
    return RecordingModel(
      id: json['id']?.toString() ?? '',
      classId: json['class_id']?.toString() ?? '',
      batchId: json['batch_id']?.toString() ?? '',
      title: json['title']?.toString() ?? json['class_title']?.toString() ?? 'Class Recording',
      recordingUrl: json['recording_url']?.toString() ?? '',
      durationMins: json['duration_mins'] is int
          ? json['duration_mins']
          : (int.tryParse(json['duration_mins']?.toString() ?? '0') ?? 0),
      thumbnailUrl: json['thumbnail_url']?.toString(),
      recordedAt: json['recorded_at']?.toString() ?? json['class_date']?.toString(),
      batchName: json['batch_name']?.toString(),
    );
  }
}
