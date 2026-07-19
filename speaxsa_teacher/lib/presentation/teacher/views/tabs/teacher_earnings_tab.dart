import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../../core/constants/app_colors.dart';
import '../../controllers/teacher_dashboard_controller.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/empty_state_widget.dart';
import '../../../shared/widgets/status_chip.dart';

class TeacherEarningsTab extends GetView<TeacherDashboardController> {
  const TeacherEarningsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      body: Obx(() {
        final w = controller.wallet.value;
        final statements = controller.walletStatement;

        return RefreshIndicator(
          onRefresh: () async {
            await controller.loadTeacherData();
            await controller.loadWalletStatement();
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Earnings Card
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
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          icon: const Icon(Icons.payment, size: 16),
                          label: const Text("Request Payout"),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: AppColors.primary,
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          onPressed: () => _showRequestPayoutDialog(context, w?.walletBalance ?? 0.0),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Statement list
                const Text("Wallet Transaction Ledger", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                if (statements.isEmpty)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(24.0),
                      child: Text("No transactions recorded yet.", style: TextStyle(color: Colors.grey)),
                    ),
                  )
                else
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: statements.length,
                    itemBuilder: (context, i) {
                      final stmt = statements[i] as Map<String, dynamic>;
                      final isCredit = stmt['type']?.toString().toLowerCase() == 'credit';
                      final amt = stmt['amount'] ?? 0.0;
                      final desc = stmt['description'] ?? 'Transaction';
                      final dateStr = stmt['created_at'] ?? '';
                      final status = stmt['status'] ?? 'completed';

                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: isCredit ? Colors.green.withOpacity(0.1) : Colors.red.withOpacity(0.1),
                            child: Icon(
                              isCredit ? Icons.arrow_downward : Icons.arrow_upward,
                              color: isCredit ? Colors.green : Colors.red,
                            ),
                          ),
                          title: Text(desc, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          subtitle: Text(dateStr.split('T')[0], style: const TextStyle(fontSize: 11, color: Colors.grey)),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                "${isCredit ? '+' : '-'} ₹${amt.toString()}",
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                  color: isCredit ? Colors.green : Colors.red,
                                ),
                              ),
                              const SizedBox(height: 2),
                              StatusChip(status: status),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
              ],
            ),
          ),
        );
      }),
    );
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

  void _showRequestPayoutDialog(BuildContext context, double balance) {
    final amtCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text("Request Payout"),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Available Balance: ₹${balance.toStringAsFixed(2)}", style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
              const SizedBox(height: 12),
              CustomTextField(
                label: 'Payout Amount (₹)',
                hint: 'e.g. 5000',
                controller: amtCtrl,
                keyboardType: TextInputType.number,
                prefixIcon: Icons.currency_rupee,
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text("Cancel")),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white),
              onPressed: () {
                final amt = double.tryParse(amtCtrl.text.trim());
                if (amt == null || amt <= 0) {
                  Get.snackbar('Error', 'Please enter a valid payout amount');
                  return;
                }
                if (amt > balance) {
                  Get.snackbar('Error', 'Insufficient wallet balance');
                  return;
                }
                controller.requestPayout(amt);
                Navigator.pop(context);
              },
              child: const Text("Submit Request"),
            ),
          ],
        );
      },
    );
  }
}
