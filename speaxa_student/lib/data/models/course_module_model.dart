class LessonModel {
  final String id;
  final String moduleId;
  final String title;
  final String? description;
  final String? videoUrl;
  final String? pdfUrl;
  final int durationMins;
  final int orderIndex;
  final bool isFreePreview;

  LessonModel({
    required this.id,
    required this.moduleId,
    required this.title,
    this.description,
    this.videoUrl,
    this.pdfUrl,
    this.durationMins = 0,
    this.orderIndex = 0,
    this.isFreePreview = false,
  });

  factory LessonModel.fromJson(Map<String, dynamic> json) {
    return LessonModel(
      id: json['id']?.toString() ?? '',
      moduleId: json['module_id']?.toString() ?? json['moduleId']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString(),
      videoUrl: json['video_url']?.toString() ?? json['videoUrl']?.toString(),
      pdfUrl: json['pdf_url']?.toString() ?? json['pdfUrl']?.toString(),
      durationMins: json['duration_mins'] is int ? json['duration_mins'] : int.tryParse(json['duration_mins']?.toString() ?? '0') ?? 0,
      orderIndex: json['order_index'] is int ? json['order_index'] : int.tryParse(json['order_index']?.toString() ?? '0') ?? 0,
      isFreePreview: json['is_free_preview'] == true || json['isFreePreview'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'module_id': moduleId,
      'title': title,
      'description': description,
      'video_url': videoUrl,
      'pdf_url': pdfUrl,
      'duration_mins': durationMins,
      'order_index': orderIndex,
      'is_free_preview': isFreePreview,
    };
  }
}

class CourseModuleModel {
  final String id;
  final String courseId;
  final String title;
  final String? description;
  final int orderIndex;
  final List<LessonModel> lessons;

  CourseModuleModel({
    required this.id,
    required this.courseId,
    required this.title,
    this.description,
    this.orderIndex = 0,
    this.lessons = const [],
  });

  factory CourseModuleModel.fromJson(Map<String, dynamic> json) {
    List<LessonModel> lessonList = [];
    if (json['lessons'] is List) {
      lessonList = (json['lessons'] as List).map((e) => LessonModel.fromJson(e)).toList();
    }
    return CourseModuleModel(
      id: json['id']?.toString() ?? '',
      courseId: json['course_id']?.toString() ?? json['courseId']?.toString() ?? '',
      title: json['title']?.toString() ?? json['module_name']?.toString() ?? 'Module',
      description: json['description']?.toString(),
      orderIndex: json['order_index'] is int ? json['order_index'] : int.tryParse(json['order_index']?.toString() ?? '0') ?? 0,
      lessons: lessonList,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'course_id': courseId,
      'title': title,
      'description': description,
      'order_index': orderIndex,
      'lessons': lessons.map((e) => e.toJson()).toList(),
    };
  }
}
