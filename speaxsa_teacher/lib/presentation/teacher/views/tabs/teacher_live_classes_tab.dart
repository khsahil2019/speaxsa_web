import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/constants/app_colors.dart';
import '../../controllers/teacher_dashboard_controller.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/empty_state_widget.dart';
import '../../../shared/widgets/status_chip.dart';

class TeacherLiveClassesTab extends GetView<TeacherDashboardController> {
  const TeacherLiveClassesTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      body: Obx(() {
        final list = controller.liveClasses;
        if (list.isEmpty) {
          return EmptyStateWidget(
            title: "No Live Classes Scheduled",
            message: "Schedule a live video lesson for one of your active batches.",
            buttonText: "Schedule Class",
            onButtonPressed: () => _showScheduleClassDialog(context),
          );
        }

        return RefreshIndicator(
          onRefresh: controller.loadLiveClasses,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            itemBuilder: (context, i) {
              final lc = list[i];
              return Card(
                margin: const EdgeInsets.only(bottom: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(child: Text(lc.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold))),
                          StatusChip(status: lc.status),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text("Batch: ${lc.batchName ?? 'Live Batch'}", style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 13)),
                      const SizedBox(height: 4),
                      Text("Date: ${lc.classDate ?? ''} • Time: ${lc.classTime ?? ''}", style: const TextStyle(color: Colors.grey, fontSize: 12)),
                      const SizedBox(height: 16),
                      if (lc.status == 'scheduled' || lc.status == 'live')
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            icon: const Icon(Icons.rocket_launch, size: 18),
                            label: Text(lc.status == 'live' ? "Join Class Room" : "Launch Class Room"),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            onPressed: () async {
                              try {
                                final token = await StorageService.to.getToken();
                                final currentUser = AuthService.to.currentUser.value;
                                final userStr = currentUser != null ? jsonEncode(currentUser.toJson()) : '{}';
                                final encodedUser = Uri.encodeComponent(userStr);
                                final url = 'https://speaxa.in/live/room.html?classId=${lc.id}&role=teacher&token=$token&user=$encodedUser';
                                final uri = Uri.parse(url);
                                await launchUrl(
                                  uri,
                                  mode: LaunchMode.externalApplication,
                                );
                              } catch (e) {
                                Get.snackbar('Error', 'Could not launch class room: $e');
                              }
                            },
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      }),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showScheduleClassDialog(context),
        label: const Text("Schedule Class"),
        icon: const Icon(Icons.add),
        backgroundColor: AppColors.teacherRole,
        foregroundColor: Colors.white,
      ),
    );
  }

  Future<void> _selectDate(BuildContext context, TextEditingController ctrl) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      ctrl.text = "${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}";
    }
  }

  Future<void> _selectTime(BuildContext context, TextEditingController ctrl) async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
    );
    if (picked != null) {
      final hour = picked.hour.toString().padLeft(2, '0');
      final minute = picked.minute.toString().padLeft(2, '0');
      ctrl.text = "$hour:$minute";
    }
  }

  void _showScheduleClassDialog(BuildContext context) {
    final titleCtrl = TextEditingController();
    final dateCtrl = TextEditingController();
    final timeCtrl = TextEditingController();

    final RxString selectedBatchId = ''.obs;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Schedule Live Class Room", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 20),

                const Text("Select Batch *", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 8),
                Obx(() => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade300),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      hint: const Text("Choose Batch"),
                      value: selectedBatchId.value.isEmpty ? null : selectedBatchId.value,
                      items: controller.batches.where((b) => b.status == 'active').map((b) {
                        return DropdownMenuItem<String>(
                          value: b.id,
                          child: Text(b.batchName),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          selectedBatchId.value = val;
                        }
                      },
                    ),
                  ),
                )),
                const SizedBox(height: 16),

                CustomTextField(label: 'Topic / Title of Class *', hint: 'e.g. Chapter 1: Kinematics introduction', controller: titleCtrl, prefixIcon: Icons.title),
                CustomTextField(
                  label: 'Date (YYYY-MM-DD) *',
                  hint: 'Select Date',
                  controller: dateCtrl,
                  readOnly: true,
                  prefixIcon: Icons.calendar_today,
                  onTap: () => _selectDate(context, dateCtrl),
                ),
                CustomTextField(
                  label: 'Start Time (24h HH:MM) *',
                  hint: 'Select Start Time',
                  controller: timeCtrl,
                  readOnly: true,
                  prefixIcon: Icons.access_time,
                  onTap: () => _selectTime(context, timeCtrl),
                ),

                const SizedBox(height: 24),
                CustomButton(
                  text: 'Schedule Class',
                  onPressed: () {
                    if (selectedBatchId.value.isEmpty || titleCtrl.text.isEmpty || dateCtrl.text.isEmpty || timeCtrl.text.isEmpty) {
                      Get.snackbar('Error', 'Please fill all required fields');
                      return;
                    }

                    // Format local schedule datetime for backend validation
                    final clientDt = "${dateCtrl.text.trim()}T${timeCtrl.text.trim()}";

                    final body = {
                      'batchId': selectedBatchId.value,
                      'title': titleCtrl.text.trim(),
                      'classDate': dateCtrl.text.trim(),
                      'classTime': timeCtrl.text.trim(),
                      'clientDateTime': clientDt,
                    };

                    controller.createLiveClass(body);
                    Navigator.pop(context);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
