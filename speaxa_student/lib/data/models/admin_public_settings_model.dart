class AdminPublicSettingsModel {
  final String appName;
  final String? contactEmail;
  final String? supportPhone;
  final String? razorpayKeyId;
  final String? agoraAppId;
  final String? termsUrl;
  final String? privacyUrl;
  final Map<String, dynamic>? featureFlags;

  AdminPublicSettingsModel({
    this.appName = 'Speaxa',
    this.contactEmail,
    this.supportPhone,
    this.razorpayKeyId,
    this.agoraAppId,
    this.termsUrl,
    this.privacyUrl,
    this.featureFlags,
  });

  factory AdminPublicSettingsModel.fromJson(Map<String, dynamic> json) {
    return AdminPublicSettingsModel(
      appName: json['app_name']?.toString() ?? json['appName']?.toString() ?? 'Speaxa',
      contactEmail: json['contact_email']?.toString() ?? json['contactEmail']?.toString(),
      supportPhone: json['support_phone']?.toString() ?? json['supportPhone']?.toString(),
      razorpayKeyId: json['razorpay_key_id']?.toString() ?? json['razorpayKeyId']?.toString(),
      agoraAppId: json['agora_app_id']?.toString() ?? json['agoraAppId']?.toString(),
      termsUrl: json['terms_url']?.toString() ?? json['termsUrl']?.toString(),
      privacyUrl: json['privacy_url']?.toString() ?? json['privacyUrl']?.toString(),
      featureFlags: json['feature_flags'] is Map ? Map<String, dynamic>.from(json['feature_flags']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'app_name': appName,
      'contact_email': contactEmail,
      'support_phone': supportPhone,
      'razorpay_key_id': razorpayKeyId,
      'agora_app_id': agoraAppId,
      'terms_url': termsUrl,
      'privacy_url': privacyUrl,
      'feature_flags': featureFlags,
    };
  }
}
