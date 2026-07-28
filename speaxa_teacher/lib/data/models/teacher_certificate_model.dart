class TeacherCertificateModel {
  final String id;
  final String title;
  final String description;
  final String certificateType;
  final String issuedAt;
  final String verificationUrl;
  final bool isVerified;
  final String digitalSignature;

  TeacherCertificateModel({
    required this.id,
    required this.title,
    required this.description,
    required this.certificateType,
    required this.issuedAt,
    required this.verificationUrl,
    this.isVerified = true,
    required this.digitalSignature,
  });

  factory TeacherCertificateModel.fromJson(Map<String, dynamic> json) {
    final certId = json['id']?.toString() ?? 'SPX-CERT-${DateTime.now().millisecondsSinceEpoch}';
    return TeacherCertificateModel(
      id: certId,
      title: json['title']?.toString() ?? 'Speaxa Master Educator Certificate',
      description: json['description']?.toString() ?? 'Awarded in recognition of teaching excellence, SOP compliance, and student engagement.',
      certificateType: json['certificate_type']?.toString() ?? 'excellence',
      issuedAt: json['issued_at']?.toString() ?? '2026-07-28',
      verificationUrl: json['certificate_url']?.toString() ?? 'https://speaxa.in/verify-certificate?id=$certId',
      isVerified: json['is_verified'] == true || json['is_verified'] == 1 || json['is_verified'] == null,
      digitalSignature: json['digital_signature']?.toString() ?? 'SPEAXA-DIGITAL-SIG-SHA256-VERIFIED',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'certificate_type': certificateType,
      'issued_at': issuedAt,
      'certificate_url': verificationUrl,
      'is_verified': isVerified,
      'digital_signature': digitalSignature,
    };
  }
}
