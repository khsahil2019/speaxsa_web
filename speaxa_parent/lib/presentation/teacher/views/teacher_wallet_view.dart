import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/teacher_dashboard_controller.dart';

class TeacherWalletView extends GetView<TeacherDashboardController> {
  const TeacherWalletView({super.key});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final w = controller.wallet.value;

      return SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Available Wallet Balance", style: TextStyle(color: Colors.white70, fontSize: 13)),
                  const SizedBox(height: 4),
                  Text("₹${w?.walletBalance.toStringAsFixed(2) ?? '0.00'}", style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildBalanceSub("Total Earnings", "₹${w?.totalEarnings.toStringAsFixed(2) ?? '0.00'}"),
                      _buildBalanceSub("Paid Out", "₹${w?.paidEarnings.toStringAsFixed(2) ?? '0.00'}"),
                      _buildBalanceSub("Pending", "₹${w?.pendingEarnings.toStringAsFixed(2) ?? '0.00'}"),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            const Text("Teacher Incentive Slabs & Allowance", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),

            Card(
              child: ListTile(
                leading: const Icon(Icons.stars, color: Colors.amber, size: 32),
                title: const Text("Junior Teacher Slab"),
                subtitle: const Text("50% course revenue share + slab rewards"),
                trailing: ElevatedButton(onPressed: () => Get.snackbar('Payout', 'Automatic weekly Razorpay payouts'), child: const Text("Payout Info")),
              ),
            ),
          ],
        ),
      );
    });
  }

  Widget _buildBalanceSub(String label, String val) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11)),
        Text(val, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
      ],
    );
  }
}
