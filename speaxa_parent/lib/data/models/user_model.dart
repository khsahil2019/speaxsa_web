import '../../core/constants/api_endpoints.dart';

class UserModel {
  final String id;
  final String email;
  final String phone;
  final String name;
  final String role; // student, teacher, parent, admin
  final String? photoUrl;
  final String? approvalStatus;
  final String? teacherLevel;
  final String? qualification;
  final int experienceYears;
  final String? subjectExpertise;
  final String? languages;
  final String? address;
  final String? bio;
  final double rating;
  final int totalRatings;
  final String? referralCode;
  final String? studentCode;
  final String? board;
  final String? grade;
  final int learningStreak;
  final String? altEmail;
  final String? mobileNumber;
  final Map<String, dynamic>? socialLinks;
  final String? referredBy;
  final bool phoneVerified;
  final bool emailVerified;

  UserModel({
    required this.id,
    required this.email,
    required this.phone,
    required this.name,
    required this.role,
    this.photoUrl,
    this.approvalStatus,
    this.teacherLevel,
    this.qualification,
    this.experienceYears = 0,
    this.subjectExpertise,
    this.languages,
    this.address,
    this.bio,
    this.rating = 5.0,
    this.totalRatings = 0,
    this.referralCode,
    this.studentCode,
    this.board,
    this.grade,
    this.learningStreak = 0,
    this.altEmail,
    this.mobileNumber,
    this.socialLinks,
    this.referredBy,
    this.phoneVerified = true,
    this.emailVerified = true,
  });

  String? get fullPhotoUrl {
    if (photoUrl == null || photoUrl!.isEmpty) return null;
    if (photoUrl!.startsWith('http://') || photoUrl!.startsWith('https://')) {
      return photoUrl;
    }
    final rootHost = ApiEndpoints.baseUrl.replaceAll('/api', '');
    return photoUrl!.startsWith('/') ? '$rootHost$photoUrl' : '$rootHost/$photoUrl';
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    bool isPhoneVerified = false;
    final rawPv = json['phone_verified'] ?? json['phoneVerified'] ?? json['is_phone_verified'] ?? json['isPhoneVerified'];
    if (rawPv != null) {
      final s = rawPv.toString().toLowerCase().trim();
      isPhoneVerified = rawPv == true || rawPv == 1 || s == 'true' || s == '1' || s == 't';
    } else {
      isPhoneVerified = true;
    }

    bool isEmailVerified = false;
    final rawEv = json['email_verified'] ?? json['emailVerified'] ?? json['is_email_verified'] ?? json['isEmailVerified'];
    if (rawEv != null) {
      final s = rawEv.toString().toLowerCase().trim();
      isEmailVerified = rawEv == true || rawEv == 1 || s == 'true' || s == '1' || s == 't';
    }

    return UserModel(
      id: json['id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      role: json['role']?.toString() ?? 'parent',
      photoUrl: (json['photo_url'] ?? json['photoUrl'] ?? json['avatar'] ?? json['photo'])?.toString(),
      approvalStatus: json['approval_status']?.toString() ?? json['status']?.toString(),
      teacherLevel: json['teacher_level']?.toString(),
      qualification: json['qualification']?.toString(),
      experienceYears: json['experience_years'] is int ? json['experience_years'] : int.tryParse(json['experience_years']?.toString() ?? '0') ?? 0,
      subjectExpertise: json['subject_expertise']?.toString(),
      languages: json['languages']?.toString(),
      address: json['address']?.toString(),
      bio: json['bio']?.toString(),
      rating: json['rating'] is num ? (json['rating'] as num).toDouble() : double.tryParse(json['rating']?.toString() ?? '5.0') ?? 5.0,
      totalRatings: json['total_ratings'] is int ? json['total_ratings'] : int.tryParse(json['total_ratings']?.toString() ?? '0') ?? 0,
      referralCode: json['referral_code']?.toString(),
      studentCode: json['student_code']?.toString(),
      board: json['board']?.toString(),
      grade: json['grade']?.toString(),
      learningStreak: json['learning_streak'] is int ? json['learning_streak'] : int.tryParse(json['learning_streak']?.toString() ?? '0') ?? 0,
      altEmail: json['alt_email']?.toString(),
      mobileNumber: json['mobile_number']?.toString(),
      socialLinks: json['social_links'] is Map ? Map<String, dynamic>.from(json['social_links']) : null,
      referredBy: json['referred_by']?.toString(),
      phoneVerified: isPhoneVerified,
      emailVerified: isEmailVerified,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'phone': phone,
      'name': name,
      'role': role,
      'photo_url': photoUrl,
      'approval_status': approvalStatus,
      'teacher_level': teacherLevel,
      'qualification': qualification,
      'experience_years': experienceYears,
      'subject_expertise': subjectExpertise,
      'languages': languages,
      'address': address,
      'bio': bio,
      'rating': rating,
      'total_ratings': totalRatings,
      'referral_code': referralCode,
      'student_code': studentCode,
      'board': board,
      'grade': grade,
      'learning_streak': learningStreak,
      'alt_email': altEmail,
      'mobile_number': mobileNumber,
      'social_links': socialLinks,
      'referred_by': referredBy,
      'phone_verified': phoneVerified,
      'email_verified': emailVerified,
    };
  }

  UserModel copyWith({
    String? name,
    String? phone,
    String? email,
    String? photoUrl,
    String? address,
    String? bio,
    bool? phoneVerified,
    bool? emailVerified,
  }) {
    return UserModel(
      id: id,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      name: name ?? this.name,
      role: role,
      photoUrl: photoUrl ?? this.photoUrl,
      approvalStatus: approvalStatus,
      teacherLevel: teacherLevel,
      qualification: qualification,
      experienceYears: experienceYears,
      subjectExpertise: subjectExpertise,
      languages: languages,
      address: address ?? this.address,
      bio: bio ?? this.bio,
      rating: rating,
      totalRatings: totalRatings,
      referralCode: referralCode,
      studentCode: studentCode,
      board: board,
      grade: grade,
      learningStreak: learningStreak,
      altEmail: altEmail,
      mobileNumber: mobileNumber,
      socialLinks: socialLinks,
      referredBy: referredBy,
      phoneVerified: phoneVerified ?? this.phoneVerified,
      emailVerified: emailVerified ?? this.emailVerified,
    );
  }
}
