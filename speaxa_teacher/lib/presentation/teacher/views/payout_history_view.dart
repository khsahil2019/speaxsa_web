import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/auth_service.dart';
import '../controllers/teacher_dashboard_controller.dart';
import '../../shared/widgets/custom_button.dart';
import '../../shared/widgets/custom_text_field.dart';
import '../../shared/widgets/status_chip.dart';

class TeacherPayoutHistoryView extends StatefulWidget {
  const TeacherPayoutHistoryView({super.key});

  @override
  State<TeacherPayoutHistoryView> createState() => _TeacherPayoutHistoryViewState();
}

class _TeacherPayoutHistoryViewState extends State<TeacherPayoutHistoryView> {
  final TeacherDashboardController controller = Get.find<TeacherDashboardController>();
  final TextEditingController amountController = TextEditingController();

  @override
  void initState() {
    super.initState();
    controller.loadBankDetails();
    controller.loadPayoutRequests();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black87, size: 20),
          tooltip: "Back",
          onPressed: () => Get.back(),
        ),
        title: const Text("Payout Requests & Bank Account", style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.black87)),
        elevation: 0,
        backgroundColor: AppColors.lightBg,
      ),
      body: Obx(() {
        final wallet = controller.wallet.value;
        final balance = wallet?.walletBalance ?? 0.0;
        final paidOut = wallet?.paidEarnings ?? 0.0;
        final pending = wallet?.pendingEarnings ?? 0.0;
        final user = AuthService.to.currentUser.value;
        final bank = controller.bankDetails;
        final requests = controller.payoutRequestsList;

        final holderName = (bank['bank_account_name'] ?? bank['account_holder_name'] ?? user?.name ?? '').toString();
        final bankName = (bank['bank_name'] ?? '').toString();
        final accNo = (bank['bank_account_number'] ?? bank['account_number'] ?? '').toString();
        final ifsc = (bank['bank_ifsc_code'] ?? bank['ifsc_code'] ?? '').toString();
        final upiId = (bank['upi_id'] ?? '').toString();

        return RefreshIndicator(
          onRefresh: () async {
            await controller.loadTeacherData();
            await controller.loadBankDetails();
            await controller.loadPayoutRequests();
            await controller.loadWalletStatement();
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. SPEAXA DIGITAL BANK PASSBOOK STATEMENT CARD
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
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text("SPEAXA Digital Bank Passbook", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                                SizedBox(height: 2),
                                Text("Official Verified Educator Ledger", style: TextStyle(color: Colors.white70, fontSize: 11)),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: const BoxDecoration(color: Colors.white24, shape: BoxShape.circle),
                            child: const Icon(Icons.account_balance, color: Colors.white, size: 20),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text("₹${balance.toStringAsFixed(2)}", style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),

                      // Bank Details Box inside Passbook Card
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(14)),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _buildPassbookDetail("Holder", holderName),
                                _buildPassbookDetail("Bank", bankName),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _buildPassbookDetail("A/C No", accNo),
                                _buildPassbookDetail("IFSC", ifsc),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _buildPassbookDetail("UPI ID", upiId),
                                _buildPassbookDetail("Pending Payouts", "₹${pending.toStringAsFixed(2)}"),
                              ],
                            ),
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
                                icon: const Icon(Icons.edit_note, size: 15),
                                label: const Text("Edit Bank / UPI", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.white,
                                  foregroundColor: AppColors.primary,
                                  elevation: 0,
                                  padding: const EdgeInsets.symmetric(horizontal: 8),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                onPressed: () => _showEditBankDialog(context, bank),
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
                const SizedBox(height: 20),

                // 2. NEW PAYOUT REQUEST FORM CARD
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.payment, color: AppColors.primary, size: 20),
                            SizedBox(width: 8),
                            Text("Request Payout", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          ],
                        ),
                        const SizedBox(height: 12),
                        CustomTextField(
                          label: 'Withdrawal Amount (₹)',
                          hint: 'Enter amount e.g. 2500',
                          controller: amountController,
                          keyboardType: TextInputType.number,
                          prefixIcon: Icons.currency_rupee,
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(10)),
                          child: Row(
                            children: [
                              const Icon(Icons.check_circle_outline, color: Colors.green, size: 16),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  "Payout will be credited to: $bankName ($accNo) / $upiId",
                                  style: const TextStyle(fontSize: 11, color: Colors.black87),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            icon: const Icon(Icons.send_rounded, size: 16),
                            label: const Text("Submit Payout Request ✓"),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: () {
                              final amt = double.tryParse(amountController.text.trim());
                              if (amt == null || amt <= 0) {
                                Get.snackbar('Validation Error', 'Please enter a valid payout amount', backgroundColor: AppColors.error, colorText: Colors.white);
                                return;
                              }
                              if (amt > balance) {
                                Get.snackbar('Validation Error', 'Amount exceeds available wallet balance', backgroundColor: AppColors.error, colorText: Colors.white);
                                return;
                              }
                              controller.requestPayout(amt, bankInfo: {
                                'bank_name': bankName,
                                'account_number': accNo,
                                'ifsc_code': ifsc,
                                'upi_id': upiId,
                              });
                              amountController.clear();
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // 3. PAYOUT REQUESTS HISTORY LIST
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("Payout Request History", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    IconButton(
                      icon: const Icon(Icons.refresh, size: 18),
                      onPressed: controller.loadPayoutRequests,
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                if (requests.isEmpty)
                  Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    child: const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(
                        child: Text("No payout requests submitted yet.", style: TextStyle(color: Colors.grey, fontSize: 12)),
                      ),
                    ),
                  )
                else
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: requests.length,
                    itemBuilder: (context, i) {
                      final item = requests[i] as Map<String, dynamic>;
                      final amt = double.tryParse(item['amount']?.toString() ?? '0') ?? 0.0;
                      final status = item['status']?.toString() ?? 'pending';
                      final reqId = item['id']?.toString() ?? 'PAY-${1000 + i}';
                      final dateStr = (item['requested_at'] ?? item['created_at'] ?? 'Today').toString();
                      final routeDesc = (item['bank_account'] ?? item['upi_id'] ?? item['description'] ?? 'Bank Payout').toString();

                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          leading: CircleAvatar(
                            backgroundColor: AppColors.primary.withOpacity(0.1),
                            child: const Icon(Icons.receipt_long, color: AppColors.primary, size: 20),
                          ),
                          title: Text("Req ID: $reqId", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 2),
                              Text(
                                item['upi_id'] != null && item['upi_id'].toString().isNotEmpty
                                    ? "UPI: ${item['upi_id']}"
                                    : (item['bank_account'] != null && item['bank_account'].toString().isNotEmpty
                                        ? "Bank: ${item['bank_account']}"
                                        : (routeDesc.isNotEmpty ? routeDesc : "UPI: $upiId")),
                                style: const TextStyle(fontSize: 11, color: Colors.black87, fontWeight: FontWeight.w600),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Wrap(
                                spacing: 8,
                                crossAxisAlignment: WrapCrossAlignment.center,
                                children: [
                                  Text("Date: ${dateStr.contains('T') ? dateStr.split('T')[0] : dateStr}", style: const TextStyle(fontSize: 10, color: Colors.grey)),
                                  if (item['remarks'] != null || item['admin_remarks'] != null)
                                    Text("• Remarks: ${item['remarks'] ?? item['admin_remarks'] ?? '—'}", style: const TextStyle(fontSize: 10, color: Colors.grey), overflow: TextOverflow.ellipsis),
                                ],
                              ),
                            ],
                          ),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text("₹${amt.toStringAsFixed(2)}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              const SizedBox(height: 2),
                              StatusChip(status: status),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        );
      }),
    );
  }

  Widget _buildPassbookDetail(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 10)),
        Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12), overflow: TextOverflow.ellipsis),
      ],
    );
  }

  void _showEditBankDialog(BuildContext context, Map bankData) {
    final nameCtrl = TextEditingController(text: bankData['account_holder_name']?.toString() ?? '');
    final bankCtrl = TextEditingController(text: bankData['bank_name']?.toString() ?? '');
    final accCtrl = TextEditingController(text: bankData['account_number']?.toString() ?? '');
    final ifscCtrl = TextEditingController(text: bankData['ifsc_code']?.toString() ?? '');
    final upiCtrl = TextEditingController(text: bankData['upi_id']?.toString() ?? '');

    String branchInfo = '';
    String ifscErrorText = '';
    bool isSearchingIfsc = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            void performIfscLookup(String val) async {
              final code = val.trim().toUpperCase();
              final ifscRegex = RegExp(r'^[A-Z]{4}0[A-Z0-9]{6}$');

              if (code.length == 11) {
                if (!ifscRegex.hasMatch(code)) {
                  setModalState(() {
                    ifscErrorText = "Invalid IFSC Code structure (e.g. HDFC0001829)";
                    branchInfo = '';
                  });
                  return;
                }

                setModalState(() {
                  isSearchingIfsc = true;
                  ifscErrorText = '';
                });

                final details = await controller.fetchIfscDetails(code);

                setModalState(() {
                  isSearchingIfsc = false;
                  if (details != null && details['BANK'] != null) {
                    bankCtrl.text = details['BANK'].toString();
                    branchInfo = "✓ ${details['BANK']} — Branch: ${details['BRANCH'] ?? ''} (${details['CITY'] ?? ''})";
                    ifscErrorText = '';
                  } else {
                    ifscErrorText = "Bank not found for IFSC code $code";
                    branchInfo = '';
                  }
                });
              } else {
                setModalState(() {
                  ifscErrorText = '';
                  branchInfo = '';
                });
              }
            }

            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("Manage Bank Account & UPI Details", style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    const Text("Enter bank info with IFSC auto-lookup & validation", style: TextStyle(color: Colors.grey, fontSize: 11)),
                    const SizedBox(height: 14),

                    CustomTextField(
                      label: 'Account Holder Name',
                      hint: 'Full legal name as per Bank A/C',
                      controller: nameCtrl,
                      prefixIcon: Icons.person,
                    ),

                    // IFSC Code with Auto-Lookup Listener
                    CustomTextField(
                      label: 'IFSC Code (11-Digits)',
                      hint: 'e.g. HDFC0001829',
                      controller: ifscCtrl,
                      prefixIcon: Icons.code,
                      onChanged: performIfscLookup,
                    ),

                    if (isSearchingIfsc)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          children: [
                            SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2)),
                            SizedBox(width: 8),
                            Text("Fetching bank details...", style: TextStyle(fontSize: 11, color: Colors.blue)),
                          ],
                        ),
                      ),

                    if (branchInfo.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text(branchInfo, style: TextStyle(fontSize: 11, color: Colors.green.shade700, fontWeight: FontWeight.bold)),
                      ),

                    if (ifscErrorText.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text(ifscErrorText, style: const TextStyle(fontSize: 11, color: Colors.red, fontWeight: FontWeight.bold)),
                      ),

                    CustomTextField(
                      label: 'Bank Name',
                      hint: 'Auto-filled via IFSC or enter name',
                      controller: bankCtrl,
                      prefixIcon: Icons.account_balance,
                    ),

                    CustomTextField(
                      label: 'Account Number (9-18 Digits)',
                      hint: 'Enter bank account number',
                      controller: accCtrl,
                      keyboardType: TextInputType.number,
                      prefixIcon: Icons.numbers,
                    ),

                    CustomTextField(
                      label: 'UPI ID (For Instant Payouts)',
                      hint: 'e.g. educator@upi',
                      controller: upiCtrl,
                      prefixIcon: Icons.qr_code,
                    ),
                    const SizedBox(height: 16),

                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.check_circle_rounded, size: 16),
                        label: const Text("Save Verified Bank Account Details ✓", style: TextStyle(fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 12)),
                        onPressed: () {
                          final name = nameCtrl.text.trim();
                          final bankName = bankCtrl.text.trim();
                          final accNo = accCtrl.text.trim();
                          final ifscCode = ifscCtrl.text.trim().toUpperCase();
                          final upi = upiCtrl.text.trim();

                          // Strict Validations matching Website Panel
                          if (name.length < 3) {
                            Get.snackbar('Validation Failed', 'Account Holder Name must be at least 3 characters', backgroundColor: AppColors.error, colorText: Colors.white);
                            return;
                          }
                          if (ifscCode.length != 11 || !RegExp(r'^[A-Z]{4}0[A-Z0-9]{6}$').hasMatch(ifscCode)) {
                            Get.snackbar('Validation Failed', 'Invalid 11-character IFSC Code (e.g. HDFC0001829)', backgroundColor: AppColors.error, colorText: Colors.white);
                            return;
                          }
                          if (bankName.isEmpty) {
                            Get.snackbar('Validation Failed', 'Bank Name cannot be empty', backgroundColor: AppColors.error, colorText: Colors.white);
                            return;
                          }
                          if (!RegExp(r'^\d{9,18}$').hasMatch(accNo)) {
                            Get.snackbar('Validation Failed', 'Account Number must contain between 9 and 18 digits', backgroundColor: AppColors.error, colorText: Colors.white);
                            return;
                          }
                          if (upi.isNotEmpty && !RegExp(r'^[\w.-]+@[\w.-]+$').hasMatch(upi)) {
                            Get.snackbar('Validation Failed', 'Invalid UPI ID format (e.g. educator@upi)', backgroundColor: AppColors.error, colorText: Colors.white);
                            return;
                          }

                          controller.saveBankDetails({
                            'account_holder_name': name,
                            'bank_name': bankName,
                            'account_number': accNo,
                            'ifsc_code': ifscCode,
                            'upi_id': upi,
                          });
                          Navigator.pop(ctx);
                        },
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
