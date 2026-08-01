import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/api_endpoints.dart';
import '../../controllers/teacher_dashboard_controller.dart';

class TeacherDocumentsTab extends GetView<TeacherDashboardController> {
  const TeacherDocumentsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      body: Obx(() {
        final list = controller.documents;
        final sop = controller.sopStatus.value;
        final isKycLocked = (sop?.status == 'approved' || sop?.status == 'completed' || (sop?.agreementSigned == true));

        final Map<String, dynamic> docMap = {};
        for (var item in list) {
          if (item is Map<String, dynamic>) {
            final type = (item['doc_type'] ?? 'other').toString().toLowerCase();
            docMap[type] = item;
          }
        }

        return RefreshIndicator(
          onRefresh: controller.loadTeacherData,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (isKycLocked)
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.green.shade300),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.verified_user_rounded, color: AppColors.success, size: 24),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            "KYC Verification Approved & Locked ✓\nAll credentials verified by Speaxa Admin.",
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.success),
                          ),
                        ),
                      ],
                    ),
                  ),

                const Text("Required Verification Documents", style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                const Text("Upload document proofs (PDF / JPG / PNG • Max 5MB per file):", style: TextStyle(color: Colors.grey, fontSize: 12)),
                const SizedBox(height: 16),

                _buildDocumentSectionCard(
                  context,
                  "1. Aadhaar Card Scan",
                  "Front and Back merged in one PDF/Photo for Identity Verification.",
                  "aadhaar",
                  docMap['aadhaar'],
                  isKycLocked,
                ),
                _buildDocumentSectionCard(
                  context,
                  "2. PAN Card Scan",
                  "Clear color photo of PAN card for Tax and Payout validation.",
                  "pan",
                  docMap['pan'],
                  isKycLocked,
                ),
                _buildDocumentSectionCard(
                  context,
                  "3. Degree Certificate",
                  "Highest educational certificate/diploma in PDF/Image format.",
                  "qualification",
                  docMap['qualification'] ?? docMap['degree'],
                  isKycLocked,
                ),
                _buildDocumentSectionCard(
                  context,
                  "4. Professional Resume",
                  "Updated CV listing educational credentials and experience.",
                  "resume",
                  docMap['resume'],
                  isKycLocked,
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        );
      }),
    );
  }

  Widget _buildDocumentSectionCard(BuildContext context, String title, String desc, String docType, Map<String, dynamic>? docItem, bool isLocked) {
    final bool isUploaded = docItem != null;
    final String fileName = docItem?['original_name']?.toString() ?? docItem?['file_name']?.toString() ?? 'Document Uploaded';
    final TextEditingController linkController = TextEditingController();

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isUploaded ? const Color(0xFFF0FDF4) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isUploaded ? Colors.green.shade300 : Colors.grey.shade300, width: 1.2),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 6, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: isUploaded ? AppColors.success.withValues(alpha: 0.15) : AppColors.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isUploaded ? Icons.check_circle : Icons.description_outlined,
                  color: isUploaded ? AppColors.success : AppColors.primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    Text(
                      desc,
                      style: const TextStyle(fontSize: 11, color: Colors.grey),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (isUploaded)
                      Padding(
                        padding: const EdgeInsets.only(top: 2.0),
                        child: Text(
                          "Uploaded: $fileName",
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.green.shade800),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isUploaded ? AppColors.success : AppColors.warning.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  isUploaded ? "Uploaded ✓" : "Pending",
                  style: TextStyle(
                    color: isUploaded ? Colors.white : AppColors.warning,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              if (isUploaded) ...[
                // Bottom Sheet Image / PDF Preview Button
                TextButton.icon(
                  onPressed: () => _previewDocumentBottomSheet(context, docItem),
                  icon: const Icon(Icons.remove_red_eye_outlined, size: 16, color: AppColors.primary),
                  label: const Text("Preview", style: TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.bold)),
                  style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(55, 30)),
                ),
                const SizedBox(width: 4),

                // Bottom Sheet Remove Confirmation Button
                if (!isLocked)
                  IconButton(
                    icon: const Icon(Icons.delete_outline, size: 18, color: Colors.redAccent),
                    tooltip: "Remove Document",
                    constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                    padding: EdgeInsets.zero,
                    onPressed: () => _confirmRemoveDocumentBottomSheet(context, docType, title),
                  ),
                const SizedBox(width: 4),
              ],

              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: isLocked ? Colors.grey.shade300 : AppColors.primary,
                  foregroundColor: isLocked ? Colors.grey.shade600 : Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: Icon(isUploaded ? Icons.sync : Icons.upload_file, size: 14),
                label: Text(isUploaded ? "Replace" : "Upload Document", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                onPressed: isLocked
                    ? null
                    : () async {
                        final result = await FilePicker.pickFiles();
                        if (result != null && result.files.isNotEmpty) {
                          final file = result.files.single;
                          if (file.size > 5 * 1024 * 1024) {
                            _showMax5MbErrorBottomSheet(context, file.size);
                            return;
                          }
                          if (file.path != null) {
                            controller.uploadKyc(file.path!, docType);
                          }
                        }
                      },
              ),
            ],
          ),

          if (!isUploaded && !isLocked) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: linkController,
                    style: const TextStyle(fontSize: 11),
                    decoration: InputDecoration(
                      hintText: "Or paste Google Drive / Cloud URL...",
                      hintStyle: const TextStyle(fontSize: 11, color: Colors.grey),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.grey.shade200,
                    foregroundColor: Colors.black87,
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  ),
                  onPressed: () {
                    if (linkController.text.trim().isNotEmpty) {
                      controller.linkSopUrl(docType, linkController.text.trim());
                    }
                  },
                  child: const Text("Save Link", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // ── Bottom Sheet Document Preview ─────────────────────────────────

  void _previewDocumentBottomSheet(BuildContext context, Map<String, dynamic> docItem) async {
    final String rawUrl = (docItem['file_url'] ?? docItem['file_path'] ?? '').toString();
    if (rawUrl.isEmpty) {
      Get.snackbar('Notice', 'Document file is processing', backgroundColor: AppColors.warning, colorText: Colors.white);
      return;
    }

    final String baseUrl = ApiEndpoints.baseUrl.replaceAll('/api', '');
    final String fullUrl = rawUrl.startsWith('http') ? rawUrl : '$baseUrl$rawUrl';
    final String lowerUrl = rawUrl.toLowerCase();
    final bool isImage = lowerUrl.endsWith('.png') || lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.webp') || lowerUrl.endsWith('.gif');

    if (isImage) {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (ctx) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 12), decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(10))),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Document Preview", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 8),
              Container(
                constraints: const BoxConstraints(maxHeight: 420),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: CachedNetworkImage(
                    imageUrl: fullUrl,
                    fit: BoxFit.contain,
                    placeholder: (context, url) => const Center(child: CircularProgressIndicator()),
                    errorWidget: (context, url, error) => Image.network(fullUrl, errorBuilder: (ctx, err, stack) => const Icon(Icons.broken_image, size: 60, color: Colors.grey)),
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      );
    } else {
      try {
        final uri = Uri.parse(fullUrl);
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } catch (e) {
        Get.snackbar('Error', 'Could not launch document viewer: $e', backgroundColor: AppColors.error, colorText: Colors.white);
      }
    }
  }

  // ── Bottom Sheet Remove Confirmation ──────────────────────────────

  void _confirmRemoveDocumentBottomSheet(BuildContext context, String docType, String title) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(child: Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 16), decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(10)))),
            Row(
              children: [
                const Icon(Icons.delete_forever_rounded, color: Colors.redAccent, size: 28),
                const SizedBox(width: 10),
                Expanded(child: Text("Remove $title?", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold))),
              ],
            ),
            const SizedBox(height: 10),
            Text("Are you sure you want to remove your $title? You will need to upload a new document copy for KYC verification.", style: TextStyle(fontSize: 12, color: Colors.grey.shade700, height: 1.4)),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text("Cancel", style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                    onPressed: () {
                      Navigator.pop(ctx);
                      controller.removeKycDocument(docType);
                    },
                    child: const Text("Remove", style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
          ],
        ),
      ),
    );
  }

  // ── Bottom Sheet File Exceeds 5MB Error ───────────────────────────

  void _showMax5MbErrorBottomSheet(BuildContext context, int fileSizeInBytes) {
    final double mbSize = fileSizeInBytes / (1024 * 1024);
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 16), decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(10))),
            const Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 44),
            const SizedBox(height: 10),
            const Text("File Exceeds Max 5MB Limit", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(
              "The selected file size is ${mbSize.toStringAsFixed(1)} MB. Maximum allowed upload file size is 5 MB. Please select a smaller or compressed file.",
              style: TextStyle(fontSize: 12, color: Colors.grey.shade700, height: 1.4),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                onPressed: () => Navigator.pop(ctx),
                child: const Text("Understood", style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
