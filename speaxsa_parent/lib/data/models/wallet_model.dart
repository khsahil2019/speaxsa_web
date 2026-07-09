class TeacherWalletModel {
  final String teacherId;
  final double totalEarnings;
  final double paidEarnings;
  final double pendingEarnings;
  final double walletBalance;

  TeacherWalletModel({
    required this.teacherId,
    this.totalEarnings = 0.0,
    this.paidEarnings = 0.0,
    this.pendingEarnings = 0.0,
    this.walletBalance = 0.0,
  });

  factory TeacherWalletModel.fromJson(Map<String, dynamic> json) {
    return TeacherWalletModel(
      teacherId: json['teacher_id']?.toString() ?? '',
      totalEarnings: json['total_earnings'] is num ? (json['total_earnings'] as num).toDouble() : double.tryParse(json['total_earnings']?.toString() ?? '0.0') ?? 0.0,
      paidEarnings: json['paid_earnings'] is num ? (json['paid_earnings'] as num).toDouble() : double.tryParse(json['paid_earnings']?.toString() ?? '0.0') ?? 0.0,
      pendingEarnings: json['pending_earnings'] is num ? (json['pending_earnings'] as num).toDouble() : double.tryParse(json['pending_earnings']?.toString() ?? '0.0') ?? 0.0,
      walletBalance: json['wallet_balance'] is num ? (json['wallet_balance'] as num).toDouble() : double.tryParse(json['wallet_balance']?.toString() ?? '0.0') ?? 0.0,
    );
  }
}
