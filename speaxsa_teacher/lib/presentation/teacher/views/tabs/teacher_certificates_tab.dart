import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../../core/constants/app_colors.dart';
import '../../controllers/teacher_dashboard_controller.dart';
import '../../../shared/widgets/empty_state_widget.dart';

class TeacherCertificatesTab extends GetView<TeacherDashboardController> {
  const TeacherCertificatesTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      body: Obx(() {
        final list = controller.certificates;
        if (list.isEmpty) {
          return const EmptyStateWidget(
            title: "No Certificates Yet",
            message: "Performance, training, and tier level upgrade certificates will appear here once issued.",
          );
        }

        return RefreshIndicator(
          onRefresh: controller.loadCertificates,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            itemBuilder: (context, i) {
              final cert = list[i] as Map<String, dynamic>;
              final certTitle = cert['title'] ?? 'Speaxa Certificate';
              final certDesc = cert['description'] ?? 'Issued for outstanding mentorship performance';
              final dateStr = cert['issued_at'] ?? '';
              final verifyUrl = cert['certificate_url'] ?? '';

              return Card(
                margin: const EdgeInsets.only(bottom: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.workspace_premium, color: Colors.amber, size: 40),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(certTitle, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                const SizedBox(height: 4),
                                Text(certDesc, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                                const SizedBox(height: 6),
                                Text("Issued: ${dateStr.split('T')[0]}", style: const TextStyle(color: Colors.grey, fontSize: 11)),
                              ],
                            ),
                          ),
                        ],
                      ),
                      if (verifyUrl.isNotEmpty) ...[
                        const Divider(height: 24),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            icon: const Icon(Icons.verified, size: 16),
                            label: const Text("Verify Certificate online"),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.primary,
                              side: const BorderSide(color: AppColors.primary),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            onPressed: () {
                              Get.snackbar('Verify Certificate', 'Redirecting to: $verifyUrl');
                            },
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            },
          ),
        );
      }),
    );
  }
}
