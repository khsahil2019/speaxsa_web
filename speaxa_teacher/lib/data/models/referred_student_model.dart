class ReferredStudentModel {
  final String id;
  final String name;
  final String date;
  final String status;
  final double earned;
  final String? course;

  ReferredStudentModel({
    required this.id,
    required this.name,
    required this.date,
    required this.status,
    required this.earned,
    this.course,
  });

  factory ReferredStudentModel.fromJson(Map<String, dynamic> json) {
    // Parse Name with robust fallbacks
    final rawName = json['name'] ?? json['student_name'] ?? json['full_name'] ?? json['user_name'] ?? 'Student';
    
    // Parse Date with robust fallbacks
    String rawDate = '27 Jul 2026';
    if (json['date'] != null && json['date'].toString().isNotEmpty) {
      rawDate = json['date'].toString();
    } else if (json['joined_on'] != null && json['joined_on'].toString().isNotEmpty) {
      rawDate = json['joined_on'].toString();
    } else if (json['created_at'] != null && json['created_at'].toString().isNotEmpty) {
      final dateStr = json['created_at'].toString();
      rawDate = dateStr.contains('T') ? dateStr.split('T')[0] : dateStr;
    }

    // Parse Earned Amount with robust fallbacks
    double rawEarned = 0.0;
    final earnedValue = json['earned'] ?? json['amount'] ?? json['commission_earned'] ?? json['commission'] ?? json['points'];
    if (earnedValue is num) {
      rawEarned = earnedValue.toDouble();
    } else if (earnedValue != null) {
      rawEarned = double.tryParse(earnedValue.toString()) ?? 0.0;
    }

    return ReferredStudentModel(
      id: json['id']?.toString() ?? '',
      name: rawName.toString(),
      date: rawDate,
      status: json['status']?.toString() ?? 'Enrolled',
      earned: rawEarned,
      course: json['course']?.toString() ?? json['batch_name']?.toString() ?? 'Speaxa Batch',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'date': date,
      'status': status,
      'earned': earned,
      'course': course,
    };
  }
}
