import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../../core/constants/app_colors.dart';
import '../../controllers/teacher_dashboard_controller.dart';
import '../payout_history_view.dart';
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
                // Earnings Wallet Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 4)),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Available Wallet Balance", style: TextStyle(color: Colors.white70, fontSize: 13)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(10)),
                            child: const Row(
                              children: [
                                Icon(Icons.verified, color: Colors.white, size: 12),
                                SizedBox(width: 4),
                                Text("Live Ledger", style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text("₹${w?.walletBalance.toStringAsFixed(2) ?? '0.00'}", style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _buildBalanceSub("Total Earnings", "₹${w?.totalEarnings.toStringAsFixed(2) ?? '0.00'}"),
                            _buildBalanceSub("Paid Out", "₹${w?.paidEarnings.toStringAsFixed(2) ?? '0.00'}"),
                            _buildBalanceSub("Pending", "₹${w?.pendingEarnings.toStringAsFixed(2) ?? '0.00'}"),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Standardized Equal-Sized Action Buttons
                      Row(
                        children: [
                          Expanded(
                            child: SizedBox(
                              height: 38,
                              child: ElevatedButton.icon(
                                icon: const Icon(Icons.account_balance_wallet_outlined, size: 15),
                                label: const Text("Request Payout", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.white,
                                  foregroundColor: AppColors.primary,
                                  elevation: 0,
                                  padding: const EdgeInsets.symmetric(horizontal: 8),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                onPressed: () => Get.to(() => const TeacherPayoutHistoryView()),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: SizedBox(
                              height: 38,
                              child: ElevatedButton.icon(
                                icon: const Icon(Icons.picture_as_pdf_outlined, size: 15),
                                label: const Text("Email Passbook PDF", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.teal.shade700,
                                  foregroundColor: Colors.white,
                                  elevation: 0,
                                  padding: const EdgeInsets.symmetric(horizontal: 8),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                onPressed: () => controller.emailPassbookStatement(),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Statement list
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("Wallet Transaction Ledger", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    IconButton(
                      icon: const Icon(Icons.refresh, size: 20),
                      onPressed: () => controller.loadWalletStatement(),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (statements.isEmpty)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32.0),
                      child: Text("No wallet transactions recorded yet.", style: TextStyle(color: Colors.grey)),
                    ),
                  )
                else
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: statements.length,
                    itemBuilder: (context, i) {
                      final stmt = statements[i] as Map<String, dynamic>;
                      return _WalletTransactionCard(stmt: stmt);
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
        const SizedBox(height: 2),
        Text(val, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
      ],
    );
  }
}

class _WalletTransactionCard extends StatefulWidget {
  final Map<String, dynamic> stmt;

  const _WalletTransactionCard({required this.stmt});

  @override
  State<_WalletTransactionCard> createState() => _WalletTransactionCardState();
}

class _WalletTransactionCardState extends State<_WalletTransactionCard> {
  bool isExpanded = false;

  @override
  Widget build(BuildContext context) {
    final stmt = widget.stmt;
    final typeStr = stmt['type']?.toString().toLowerCase() ?? '';
    final amtVal = double.tryParse(stmt['amount']?.toString() ?? '0') ?? 0.0;
    final isCredit = typeStr == 'credit' || typeStr == 'earnings' || typeStr == 'bonus' || typeStr == 'referral' || (amtVal >= 0 && typeStr != 'debit' && typeStr != 'payout');
    final desc = stmt['description']?.toString() ?? 'Transaction';
    final dateStr = stmt['created_at']?.toString() ?? '';
    final status = stmt['status']?.toString() ?? 'completed';

    final isLongDesc = desc.length > 40;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: isCredit ? Colors.green.withOpacity(0.12) : Colors.red.withOpacity(0.12),
                  child: Icon(
                    isCredit ? Icons.add_circle_outline_rounded : Icons.arrow_upward_rounded,
                    color: isCredit ? Colors.green.shade700 : Colors.red.shade700,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        desc,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        maxLines: isExpanded ? null : 2,
                        overflow: isExpanded ? TextOverflow.visible : TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        dateStr.contains('T') ? dateStr.split('T')[0] : dateStr,
                        style: const TextStyle(fontSize: 10, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      "${isCredit ? '+' : '-'} ₹${amtVal.abs().toStringAsFixed(2)}",
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: isCredit ? Colors.green.shade700 : Colors.red.shade700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    StatusChip(status: status),
                  ],
                ),
              ],
            ),
            if (isLongDesc)
              Align(
                alignment: Alignment.centerRight,
                child: InkWell(
                  onTap: () {
                    setState(() {
                      isExpanded = !isExpanded;
                    });
                  },
                  child: Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      isExpanded ? "View Less ▲" : "View More ▼",
                      style: const TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
