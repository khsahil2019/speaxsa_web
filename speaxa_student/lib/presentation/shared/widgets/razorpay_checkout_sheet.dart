import 'package:flutter/material.dart';
import 'package:get/get.dart';

class RazorpayCheckoutSheet extends StatefulWidget {
  final double amount;
  final String courseTitle;
  final String batchName;
  final String email;
  final String phone;
  final Function(String paymentId) onSuccess;

  const RazorpayCheckoutSheet({
    super.key,
    required this.amount,
    required this.courseTitle,
    required this.batchName,
    required this.email,
    required this.phone,
    required this.onSuccess,
  });

  @override
  State<RazorpayCheckoutSheet> createState() => _RazorpayCheckoutSheetState();
}

class _RazorpayCheckoutSheetState extends State<RazorpayCheckoutSheet> {
  String _selectedMethod = 'upi';
  bool _isProcessing = false;

  void _processPayment() {
    setState(() => _isProcessing = true);

    // Simulate real bank/Razorpay processing delay
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() => _isProcessing = false);
        Navigator.pop(context);
        
        // Generate a standard Razorpay-styled payment ID
        final mockPaymentId = 'pay_rzp_${DateTime.now().millisecondsSinceEpoch.toString().substring(4)}';
        widget.onSuccess(mockPaymentId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: _isProcessing ? _buildProcessingView() : _buildCheckoutView(),
    );
  }

  Widget _buildProcessingView() {
    return Container(
      height: 380,
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(
            width: 56,
            height: 56,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              color: Color(0xFF176BFB), // Razorpay Blue
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            "Processing Secure Payment",
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            "Please do not close this window or press back.",
            style: TextStyle(
              fontSize: 12.5,
              color: Colors.grey.shade500,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.shield_outlined, size: 14, color: Colors.grey),
              const SizedBox(width: 6),
              Text(
                "Secured by Razorpay PCI-DSS Compliant",
                style: TextStyle(fontSize: 10.5, color: Colors.grey.shade500, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCheckoutView() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Razorpay Navy Header ───────────────────────────
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
          decoration: const BoxDecoration(
            color: Color(0xFF0A192F), // Razorpay Navy
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 22,
                        height: 22,
                        decoration: BoxDecoration(
                          color: const Color(0xFF176BFB),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        alignment: Alignment.center,
                        child: const Text(
                          "R",
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13),
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        "razorpay",
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                          letterSpacing: -0.5,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.shield, color: Color(0xFF10B981), size: 12),
                        SizedBox(width: 4),
                        Text(
                          "SECURE",
                          style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.courseTitle,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14.5),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          "Batch: ${widget.batchName}",
                          style: TextStyle(color: Colors.grey.shade400, fontSize: 11.5),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        "AMOUNT TO PAY",
                        style: TextStyle(color: Colors.grey.shade400, fontSize: 8.5, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                      ),
                      Text(
                        "₹${widget.amount.toStringAsFixed(0)}",
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 19),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),

        // ── Contact Details Bar ────────────────────────────
        Container(
          width: double.infinity,
          color: Colors.grey.shade50,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "${widget.email}  |  ${widget.phone}",
                style: TextStyle(color: Colors.grey.shade600, fontSize: 11, fontWeight: FontWeight.w500),
              ),
              Text(
                "VERIFIED CLIENT",
                style: TextStyle(color: Colors.grey.shade500, fontSize: 10, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
        const Divider(height: 1),

        // ── Payment Options ────────────────────────────────
        Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                "PREFERRED PAYMENT METHODS",
                style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 0.5),
              ),
              const SizedBox(height: 12),

              _buildPaymentOption(
                id: 'upi',
                icon: Icons.qr_code_rounded,
                title: "UPI (Google Pay / PhonePe / Paytm)",
                subtitle: "Pay instantly using UPI apps or QR code",
              ),
              _buildPaymentOption(
                id: 'card',
                icon: Icons.credit_card_rounded,
                title: "Credit / Debit Card",
                subtitle: "Visa, Mastercard, RuPay, Maestro",
              ),
              _buildPaymentOption(
                id: 'netbanking',
                icon: Icons.account_balance_rounded,
                title: "Netbanking",
                subtitle: "All Indian banks supported",
              ),
              _buildPaymentOption(
                id: 'wallet',
                icon: Icons.wallet_rounded,
                title: "Wallets",
                subtitle: "Paytm, Mobikwik, PhonePe wallet",
              ),

              const SizedBox(height: 24),

              // Pay button
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF176BFB), // Razorpay Blue
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  onPressed: _processPayment,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.lock_rounded, size: 16),
                      const SizedBox(width: 8),
                      Text(
                        "Pay Now  •  ₹${widget.amount.toStringAsFixed(0)}",
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              const Center(
                child: Text(
                  "By continuing, you agree to our Terms & Privacy Statement.",
                  style: TextStyle(fontSize: 9.5, color: Colors.grey),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentOption({
    required String id,
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    final isSelected = _selectedMethod == id;
    return InkWell(
      onTap: () => setState(() => _selectedMethod = id),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
        child: Row(
          children: [
            Icon(
              icon,
              color: isSelected ? const Color(0xFF176BFB) : Colors.grey.shade500,
              size: 24,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                      color: isSelected ? const Color(0xFF176BFB) : const Color(0xFF1E242B),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                  ),
                ],
              ),
            ),
            Radio<String>(
              value: id,
              groupValue: _selectedMethod,
              activeColor: const Color(0xFF176BFB),
              onChanged: (val) {
                if (val != null) setState(() => _selectedMethod = val);
              },
            ),
          ],
        ),
      ),
    );
  }
}
