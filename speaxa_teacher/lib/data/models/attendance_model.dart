class AttendanceRecord {
  final String id;
  final String? classId;
  final String? batchId;
  final String studentId;
  final String attendanceDate;
  final String status; // present, absent, late, excused
  final int durationMins;
  final String? classTitle;
  final String? batchName;

  AttendanceRecord({
    required this.id,
    this.classId,
    this.batchId,
    required this.studentId,
    required this.attendanceDate,
    required this.status,
    this.durationMins = 0,
    this.classTitle,
    this.batchName,
  });

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    return AttendanceRecord(
      id: json['id']?.toString() ?? '',
      classId: json['class_id']?.toString(),
      batchId: json['batch_id']?.toString(),
      studentId: json['student_id']?.toString() ?? '',
      attendanceDate: json['attendance_date']?.toString() ?? '',
      status: json['status']?.toString() ?? 'absent',
      durationMins: json['duration_mins'] is int ? json['duration_mins'] : int.tryParse(json['duration_mins']?.toString() ?? '0') ?? 0,
      classTitle: json['class_title']?.toString(),
      batchName: json['batch_name']?.toString(),
    );
  }
}

class AttendanceData {
  final List<AttendanceRecord> records;
  final int total;
  final int present;
  final int attendancePct;

  AttendanceData({
    required this.records,
    required this.total,
    required this.present,
    required this.attendancePct,
  });

  factory AttendanceData.fromJson(Map<String, dynamic> json) {
    final list = json['records'] as List? ?? [];
    final stats = json['stats'] as Map<String, dynamic>? ?? {};
    return AttendanceData(
      records: list.map((e) => AttendanceRecord.fromJson(e)).toList(),
      total: stats['total'] is int ? stats['total'] : int.tryParse(stats['total']?.toString() ?? '0') ?? 0,
      present: stats['present'] is int ? stats['present'] : int.tryParse(stats['present']?.toString() ?? '0') ?? 0,
      attendancePct: stats['attendancePct'] is int ? stats['attendancePct'] : int.tryParse(stats['attendancePct']?.toString() ?? '0') ?? 0,
    );
  }
}
