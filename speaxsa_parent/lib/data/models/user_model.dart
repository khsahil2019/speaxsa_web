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
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      role: json['role']?.toString() ?? 'student',
      photoUrl: json['photo_url']?.toString(),
      approvalStatus: json['approval_status']?.toString(),
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
    };
  }
}
