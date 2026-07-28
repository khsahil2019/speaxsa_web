class BatchNoteModel {
  final String id;
  final String batchId;
  final String title;
  final String? description;
  final String fileUrl;
  final String? fileType; // pdf, image, doc, zip
  final String? uploadedBy;
  final String? uploaderName;
  final String? createdAt;
  final String? batchName;

  BatchNoteModel({
    required this.id,
    required this.batchId,
    required this.title,
    this.description,
    required this.fileUrl,
    this.fileType,
    this.uploadedBy,
    this.uploaderName,
    this.createdAt,
    this.batchName,
  });

  factory BatchNoteModel.fromJson(Map<String, dynamic> json) {
    return BatchNoteModel(
      id: json['id']?.toString() ?? '',
      batchId: json['batch_id']?.toString() ?? json['batchId']?.toString() ?? '',
      title: json['title']?.toString() ?? json['note_title']?.toString() ?? 'Study Note',
      description: json['description']?.toString(),
      fileUrl: json['file_url']?.toString() ?? json['fileUrl']?.toString() ?? '',
      fileType: json['file_type']?.toString() ?? json['fileType']?.toString(),
      uploadedBy: json['uploaded_by']?.toString() ?? json['uploadedBy']?.toString(),
      uploaderName: json['uploader_name']?.toString() ?? json['teacher_name']?.toString(),
      createdAt: json['created_at']?.toString() ?? json['createdAt']?.toString(),
      batchName: json['batch_name']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'batch_id': batchId,
      'title': title,
      'description': description,
      'file_url': fileUrl,
      'file_type': fileType,
      'uploaded_by': uploadedBy,
      'uploader_name': uploaderName,
      'created_at': createdAt,
      'batch_name': batchName,
    };
  }
}
