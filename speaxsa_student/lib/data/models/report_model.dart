class MonthlyReportModel {
  final String id;
  final String studentId;
  final String batchId;
  final String teacherId;
  final String reportMonth; // YYYY-MM
  final double attendancePct;
  final double interactionScore;
  final double curiosityScore;
  final double assignmentCompletion;
  final double communicationGrowth;
  final double avgObservationScore;
  final List<String> weakTopics;
  final List<String> strongTopics;
  final String improvementTrend;
  final String? overallGrade;
  final String? teacherRemarks;
  final String? batchName;
  final String? teacherName;
  final String? generatedAt;

  MonthlyReportModel({
    required this.id,
    required this.studentId,
    required this.batchId,
    required this.teacherId,
    required this.reportMonth,
    this.attendancePct = 0.0,
    this.interactionScore = 0.0,
    this.curiosityScore = 0.0,
    this.assignmentCompletion = 0.0,
    this.communicationGrowth = 0.0,
    this.avgObservationScore = 0.0,
    this.weakTopics = const [],
    this.strongTopics = const [],
    this.improvementTrend = 'stable',
    this.overallGrade,
    this.teacherRemarks,
    this.batchName,
    this.teacherName,
    this.generatedAt,
  });

  factory MonthlyReportModel.fromJson(Map<String, dynamic> json) {
    List<String> weak = [];
    if (json['weak_topics'] is List) {
      weak = List<String>.from(json['weak_topics'].map((e) => e.toString()));
    }
    List<String> strong = [];
    if (json['strong_topics'] is List) {
      strong = List<String>.from(json['strong_topics'].map((e) => e.toString()));
    }

    double parseDouble(dynamic val) {
      if (val is num) return val.toDouble();
      if (val is String) return double.tryParse(val) ?? 0.0;
      return 0.0;
    }

    return MonthlyReportModel(
      id: json['id']?.toString() ?? '',
      studentId: json['student_id']?.toString() ?? '',
      batchId: json['batch_id']?.toString() ?? '',
      teacherId: json['teacher_id']?.toString() ?? '',
      reportMonth: json['report_month']?.toString() ?? '',
      attendancePct: parseDouble(json['attendance_pct']),
      interactionScore: parseDouble(json['interaction_score']),
      curiosityScore: parseDouble(json['curiosity_score']),
      assignmentCompletion: parseDouble(json['assignment_completion']),
      communicationGrowth: parseDouble(json['communication_growth']),
      avgObservationScore: parseDouble(json['avg_observation_score']),
      weakTopics: weak,
      strongTopics: strong,
      improvementTrend: json['improvement_trend']?.toString() ?? 'stable',
      overallGrade: json['overall_grade']?.toString(),
      teacherRemarks: json['teacher_remarks']?.toString() ?? json['teacher_feedback']?.toString(),
      batchName: json['batch_name']?.toString(),
      teacherName: json['teacher_name']?.toString(),
      generatedAt: json['generated_at']?.toString(),
    );
  }
}
