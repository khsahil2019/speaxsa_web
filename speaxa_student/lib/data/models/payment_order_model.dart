class PaymentOrderModel {
  final String orderId;
  final double amount;
  final String currency;
  final String? keyId;
  final String? batchId;
  final String? courseId;
  final String status;
  final String? paymentId;
  final String? signature;

  PaymentOrderModel({
    required this.orderId,
    required this.amount,
    this.currency = 'INR',
    this.keyId,
    this.batchId,
    this.courseId,
    this.status = 'created',
    this.paymentId,
    this.signature,
  });

  factory PaymentOrderModel.fromJson(Map<String, dynamic> json) {
    return PaymentOrderModel(
      orderId: json['order_id']?.toString() ?? json['orderId']?.toString() ?? json['id']?.toString() ?? '',
      amount: json['amount'] is num ? (json['amount'] as num).toDouble() : double.tryParse(json['amount']?.toString() ?? '0.0') ?? 0.0,
      currency: json['currency']?.toString() ?? 'INR',
      keyId: json['key_id']?.toString() ?? json['keyId']?.toString() ?? json['razorpay_key_id']?.toString(),
      batchId: json['batch_id']?.toString() ?? json['batchId']?.toString(),
      courseId: json['course_id']?.toString() ?? json['courseId']?.toString(),
      status: json['status']?.toString() ?? 'created',
      paymentId: json['payment_id']?.toString() ?? json['paymentId']?.toString(),
      signature: json['signature']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'order_id': orderId,
      'amount': amount,
      'currency': currency,
      'key_id': keyId,
      'batch_id': batchId,
      'course_id': courseId,
      'status': status,
      'payment_id': paymentId,
      'signature': signature,
    };
  }
}
