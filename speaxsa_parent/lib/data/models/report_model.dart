class MonthlyReportModel {
  final String id;
  final String studentId;
  final String batchId;
  final String teacherId;
  final String reportMonth; // YYYY-MM
  final int totalClasses;
  final int attendedClasses;
  final double attendancePct;
  final int assignmentsAssigned;
  final int assignmentsSubmitted;
  final double? avgMarks;
  final String? teacherFeedback;
  final String? batchName;
  final String? teacherName;

  MonthlyReportModel({
    required this.id,
    required this.studentId,
    required this.batchId,
    required this.teacherId,
    required this.reportMonth,
    this.totalClasses = 0,
    this.attendedClasses = 0,
    this.attendancePct = 0.0,
    this.assignmentsAssigned = 0,
    this.assignmentsSubmitted = 0,
    this.avgMarks,
    this.teacherFeedback,
    this.batchName,
    this.teacherName,
  });

  factory MonthlyReportModel.fromJson(Map<String, dynamic> json) {
    return MonthlyReportModel(
      id: json['id']?.toString() ?? '',
      studentId: json['student_id']?.toString() ?? '',
      batchId: json['batch_id']?.toString() ?? '',
      teacherId: json['teacher_id']?.toString() ?? '',
      reportMonth: json['report_month']?.toString() ?? '',
      totalClasses: json['total_classes'] is int ? json['total_classes'] : int.tryParse(json['total_classes']?.toString() ?? '0') ?? 0,
      attendedClasses: json['attended_classes'] is int ? json['attended_classes'] : int.tryParse(json['attended_classes']?.toString() ?? '0') ?? 0,
      attendancePct: json['attendance_pct'] is num ? (json['attendance_pct'] as num).toDouble() : double.tryParse(json['attendance_pct']?.toString() ?? '0.0') ?? 0.0,
      assignmentsAssigned: json['assignments_assigned'] is int ? json['assignments_assigned'] : int.tryParse(json['assignments_assigned']?.toString() ?? '0') ?? 0,
      assignmentsSubmitted: json['assignments_submitted'] is int ? json['assignments_submitted'] : int.tryParse(json['assignments_submitted']?.toString() ?? '0') ?? 0,
      avgMarks: json['avg_marks'] is num ? (json['avg_marks'] as num).toDouble() : double.tryParse(json['avg_marks']?.toString() ?? ''),
      teacherFeedback: json['teacher_feedback']?.toString(),
      batchName: json['batch_name']?.toString(),
      teacherName: json['teacher_name']?.toString(),
    );
  }
}
