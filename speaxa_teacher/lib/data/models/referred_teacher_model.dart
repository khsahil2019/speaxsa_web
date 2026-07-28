class ReferredTeacherModel {
  final String id;
  final String name;
  final String date;
  final String status;
  final double earned;
  final String level;

  ReferredTeacherModel({
    required this.id,
    required this.name,
    required this.date,
    required this.status,
    required this.earned,
    required this.level,
  });

  factory ReferredTeacherModel.fromJson(Map<String, dynamic> json) {
    final rawName = json['name'] ?? json['teacher_name'] ?? json['full_name'] ?? 'Educator';

    String rawDate = 'N/A';
    if (json['date'] != null && json['date'].toString().isNotEmpty) {
      rawDate = json['date'].toString();
    } else if (json['joined_on'] != null && json['joined_on'].toString().isNotEmpty) {
      rawDate = json['joined_on'].toString();
    } else if (json['created_at'] != null && json['created_at'].toString().isNotEmpty) {
      final dateStr = json['created_at'].toString();
      rawDate = dateStr.contains('T') ? dateStr.split('T')[0] : dateStr;
    }

    double rawEarned = 0.0;
    final earnedValue = json['earned'] ?? json['amount'] ?? json['commission_earned'] ?? json['commission'];
    if (earnedValue is num) {
      rawEarned = earnedValue.toDouble();
    } else if (earnedValue != null) {
      rawEarned = double.tryParse(earnedValue.toString()) ?? 0.0;
    }

    return ReferredTeacherModel(
      id: json['id']?.toString() ?? '',
      name: rawName.toString(),
      date: rawDate,
      status: json['status']?.toString() ?? 'Verified',
      earned: rawEarned,
      level: json['teacher_level']?.toString() ?? json['level']?.toString() ?? 'Mentor',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'date': date,
      'status': status,
      'earned': earned,
      'level': level,
    };
  }
}
