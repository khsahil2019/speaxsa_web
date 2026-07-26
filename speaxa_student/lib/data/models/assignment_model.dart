class AssignmentModel {
  final String id;
  final String batchId;
  final String title;
  final String? description;
  final String? fileUrl;
  final String? dueDate;
  final int maxMarks;
  final String status;
  final String? batchName;
  final String? submissionId;
  final double? marksObtained;
  final String? feedback;
  final String? submissionStatus; // submitted, late, graded, pending
  final String? submittedAt;

  AssignmentModel({
    required this.id,
    required this.batchId,
    required this.title,
    this.description,
    this.fileUrl,
    this.dueDate,
    this.maxMarks = 100,
    this.status = 'active',
    this.batchName,
    this.submissionId,
    this.marksObtained,
    this.feedback,
    this.submissionStatus,
    this.submittedAt,
  });

  factory AssignmentModel.fromJson(Map<String, dynamic> json) {
    return AssignmentModel(
      id: json['id']?.toString() ?? '',
      batchId: json['batch_id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString(),
      fileUrl: json['file_url']?.toString(),
      dueDate: json['due_date']?.toString(),
      maxMarks: json['max_marks'] is int ? json['max_marks'] : int.tryParse(json['max_marks']?.toString() ?? '100') ?? 100,
      status: json['status']?.toString() ?? 'active',
      batchName: json['batch_name']?.toString(),
      submissionId: json['submission_id']?.toString(),
      marksObtained: json['marks_obtained'] is num ? (json['marks_obtained'] as num).toDouble() : double.tryParse(json['marks_obtained']?.toString() ?? ''),
      feedback: json['feedback']?.toString(),
      submissionStatus: json['submission_status']?.toString(),
      submittedAt: json['submitted_at']?.toString(),
    );
  }
}
