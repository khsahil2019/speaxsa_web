class PublicStatsModel {
  final int totalStudents;
  final int totalTeachers;
  final int totalCourses;
  final int totalLiveClasses;
  final double successRate;

  PublicStatsModel({
    this.totalStudents = 0,
    this.totalTeachers = 0,
    this.totalCourses = 0,
    this.totalLiveClasses = 0,
    this.successRate = 98.5,
  });

  factory PublicStatsModel.fromJson(Map<String, dynamic> json) {
    int parseInt(dynamic val) {
      if (val is int) return val;
      if (val is String) return int.tryParse(val) ?? 0;
      return 0;
    }

    double parseDouble(dynamic val) {
      if (val is num) return val.toDouble();
      if (val is String) return double.tryParse(val) ?? 98.5;
      return 98.5;
    }

    return PublicStatsModel(
      totalStudents: parseInt(json['total_students'] ?? json['totalStudents'] ?? json['students']),
      totalTeachers: parseInt(json['total_teachers'] ?? json['totalTeachers'] ?? json['teachers']),
      totalCourses: parseInt(json['total_courses'] ?? json['totalCourses'] ?? json['courses']),
      totalLiveClasses: parseInt(json['total_live_classes'] ?? json['totalLiveClasses'] ?? json['live_classes']),
      successRate: parseDouble(json['success_rate'] ?? json['successRate']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'total_students': totalStudents,
      'total_teachers': totalTeachers,
      'total_courses': totalCourses,
      'total_live_classes': totalLiveClasses,
      'success_rate': successRate,
    };
  }
}
