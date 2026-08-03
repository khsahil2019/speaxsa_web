import 'dart:convert';

class BatchModel {
  final String id;
  final String? courseId;
  final String? teacherId;
  final String batchName;
  final String? subject;
  final String? startDate;
  final String? endDate;
  final String? startTime;
  final String? endTime;
  final List<String> daysOfWeek;
  final int capacity;
  final int seatsFilled;
  final String status;
  final String? agoraChannel;
  final String? courseTitle;
  final double? courseFees;
  final String? teacherName;
  final String? teacherPhoto;
  final String? teacherLevel;
  final double? teacherRating;
  final int availableSeats;
  final String? plannerUrl;
  final String? plannerName;
  final String? plannerDesc;
  final String? teachingMethod;
  final String? batchInstructions;

  BatchModel({
    required this.id,
    this.courseId,
    this.teacherId,
    required this.batchName,
    this.subject,
    this.startDate,
    this.endDate,
    this.startTime,
    this.endTime,
    this.daysOfWeek = const [],
    this.capacity = 30,
    this.seatsFilled = 0,
    this.status = 'active',
    this.agoraChannel,
    this.courseTitle,
    this.courseFees,
    this.teacherName,
    this.teacherPhoto,
    this.teacherLevel,
    this.teacherRating,
    this.availableSeats = 30,
    this.plannerUrl,
    this.plannerName,
    this.plannerDesc,
    this.teachingMethod,
    this.batchInstructions,
  });

  factory BatchModel.fromJson(Map<String, dynamic> json) {
    List<String> days = [];
    if (json['days_of_week'] is List) {
      days = List<String>.from(json['days_of_week'].map((e) => e.toString()));
    } else if (json['days_of_week'] is String && json['days_of_week'].toString().isNotEmpty) {
      try {
        final parsed = jsonDecode(json['days_of_week']);
        if (parsed is List) {
          days = List<String>.from(parsed.map((e) => e.toString()));
        }
      } catch (_) {
        days = [json['days_of_week'].toString()];
      }
    }

    final cap = json['capacity'] is num ? (json['capacity'] as num).toInt() : (int.tryParse(json['capacity']?.toString() ?? '30') ?? 30);
    final filled = json['seats_filled'] is num ? (json['seats_filled'] as num).toInt() : (int.tryParse(json['seats_filled']?.toString() ?? '0') ?? 0);
    final availParsed = json['available_seats'] != null ? int.tryParse(json['available_seats'].toString()) : null;
    final avail = availParsed ?? (cap - filled);

    return BatchModel(
      id: json['id']?.toString() ?? '',
      courseId: json['course_id']?.toString(),
      teacherId: json['teacher_id']?.toString(),
      batchName: json['batch_name']?.toString() ?? '',
      subject: json['subject']?.toString(),
      startDate: json['start_date']?.toString(),
      endDate: json['end_date']?.toString(),
      startTime: json['start_time']?.toString(),
      endTime: json['end_time']?.toString(),
      daysOfWeek: days,
      capacity: cap,
      seatsFilled: filled,
      status: json['status']?.toString() ?? 'active',
      agoraChannel: json['agora_channel']?.toString(),
      courseTitle: json['course_title']?.toString(),
      courseFees: json['fees'] is num ? (json['fees'] as num).toDouble() : json['course_fees'] is num ? (json['course_fees'] as num).toDouble() : null,
      teacherName: json['teacher_name']?.toString(),
      teacherPhoto: json['teacher_photo']?.toString(),
      teacherLevel: json['teacher_level']?.toString(),
      teacherRating: json['teacher_rating'] is num ? (json['teacher_rating'] as num).toDouble() : double.tryParse(json['teacher_rating']?.toString() ?? '5.0'),
      availableSeats: avail < 0 ? 0 : avail,
      plannerUrl: json['planner_url']?.toString(),
      plannerName: json['planner_name']?.toString(),
      plannerDesc: json['planner_desc']?.toString(),
      teachingMethod: json['teaching_method']?.toString(),
      batchInstructions: json['batch_instructions']?.toString(),
    );
  }
}
