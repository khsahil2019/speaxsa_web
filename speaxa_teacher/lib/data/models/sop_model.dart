class SopModel {
  final String id;
  final String teacherId;
  final String? cameraSopUrl;
  final String? lightingSopUrl;
  final String? audioSopUrl;
  final String? internetProofUrl;
  final String? demoTeachingUrl;
  final String status; // pending, sop_pending, approved, rejected, suspended
  final bool agreementSigned;
  final String? digitalSignature;
  final String? signatureImage;
  final String? availability;
  final String? adminNotes;
  final String? submittedAt;
  final dynamic teacherChecklist;

  SopModel({
    required this.id,
    required this.teacherId,
    this.cameraSopUrl,
    this.lightingSopUrl,
    this.audioSopUrl,
    this.internetProofUrl,
    this.demoTeachingUrl,
    this.status = 'pending',
    this.agreementSigned = false,
    this.digitalSignature,
    this.signatureImage,
    this.availability,
    this.adminNotes,
    this.submittedAt,
    this.teacherChecklist,
  });

  factory SopModel.fromJson(Map<String, dynamic> json) {
    return SopModel(
      id: json['id']?.toString() ?? '',
      teacherId: json['teacher_id']?.toString() ?? '',
      cameraSopUrl: json['camera_sop_url']?.toString(),
      lightingSopUrl: json['lighting_sop_url']?.toString(),
      audioSopUrl: json['audio_sop_url']?.toString(),
      internetProofUrl: json['internet_proof_url']?.toString(),
      demoTeachingUrl: json['demo_teaching_url']?.toString(),
      status: json['status']?.toString() ?? 'pending',
      agreementSigned: json['agreement_signed'] == true,
      digitalSignature: json['digital_signature']?.toString(),
      signatureImage: json['signature_image']?.toString(),
      availability: json['availability']?.toString(),
      adminNotes: json['admin_notes']?.toString(),
      submittedAt: json['submitted_at']?.toString(),
      teacherChecklist: json['teacher_checklist'],
    );
  }
}
