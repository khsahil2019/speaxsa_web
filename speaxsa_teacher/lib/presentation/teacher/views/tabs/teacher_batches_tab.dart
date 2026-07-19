import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/constants/app_colors.dart';
import '../../controllers/teacher_dashboard_controller.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/empty_state_widget.dart';
import '../../../shared/widgets/status_chip.dart';

class TeacherBatchesTab extends GetView<TeacherDashboardController> {
  const TeacherBatchesTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      body: Obx(() {
        final list = controller.batches;
        if (list.isEmpty) {
          return EmptyStateWidget(
            title: "No Batches Created",
            message: "Verify your SOP status, then create study batches to start classes.",
            buttonText: "Create Batch",
            onButtonPressed: () => _showCreateBatchDialog(context),
          );
        }

        return RefreshIndicator(
          onRefresh: controller.loadTeacherData,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            itemBuilder: (context, i) {
              final b = list[i];
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
                          Expanded(child: Text(b.batchName, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold))),
                          StatusChip(status: b.status),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text("Course: ${b.courseTitle ?? b.subject ?? 'Live Batch'}", style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 13)),
                      const SizedBox(height: 4),
                      Text("Schedule: ${b.daysOfWeek.join(', ')} | ${b.startTime ?? ''} - ${b.endTime ?? ''}", style: const TextStyle(color: Colors.grey, fontSize: 12)),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            "Enrolled: ${b.seatsFilled} / ${b.capacity} Students",
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.black87),
                          ),
                          TextButton.icon(
                            icon: const Icon(Icons.people_outline, size: 16),
                            label: const Text("Students"),
                            style: TextButton.styleFrom(
                              foregroundColor: AppColors.primary,
                              padding: const EdgeInsets.symmetric(horizontal: 8),
                            ),
                            onPressed: () => _showBatchStudentsDialog(context, b.id, b.batchName),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          icon: const Icon(Icons.videocam, size: 18),
                          label: const Text("Launch Agora Live Class"),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                          onPressed: () async {
                            final activeClass = controller.liveClasses.firstWhereOrNull(
                              (c) => c.batchId == b.id && (c.status == 'live' || c.status == 'scheduled')
                            );
                            if (activeClass != null) {
                              try {
                                final token = await StorageService.to.getToken();
                                final currentUser = AuthService.to.currentUser.value;
                                final userStr = currentUser != null ? jsonEncode(currentUser.toJson()) : '{}';
                                final encodedUser = Uri.encodeComponent(userStr);
                                final url = 'https://speaxa.in/live/room.html?classId=${activeClass.id}&role=teacher&token=$token&user=$encodedUser';
                                final uri = Uri.parse(url);
                                await launchUrl(
                                  uri,
                                  mode: LaunchMode.externalApplication,
                                );
                              } catch (e) {
                                Get.snackbar('Error', 'Could not launch class room: $e');
                              }
                            } else {
                              Get.snackbar('Info', 'No active or scheduled live class found for this batch. Please schedule one first!',
                                backgroundColor: AppColors.warning, colorText: Colors.white);
                              controller.selectedIndex.value = 4; // Switch to Live Classes Tab
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
        onPressed: () => _showCreateBatchDialog(context),
        label: const Text("Create Batch"),
        icon: const Icon(Icons.add),
        backgroundColor: AppColors.teacherRole,
        foregroundColor: Colors.white,
      ),
    );
  }

  void _showBatchStudentsDialog(BuildContext context, String batchId, String batchName) async {
    final students = await controller.getBatchStudents(batchId);

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Students in $batchName", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Expanded(
                child: students.isEmpty
                    ? const Center(child: Text("No students enrolled yet", style: TextStyle(color: Colors.grey)))
                    : ListView.builder(
                        itemCount: students.length,
                        itemBuilder: (context, i) {
                          final s = students[i] as Map<String, dynamic>;
                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: AppColors.primary.withOpacity(0.1),
                              child: Text(s['name']?.substring(0, 1).toUpperCase() ?? 'S', style: const TextStyle(color: AppColors.primary)),
                            ),
                            title: Text(s['name'] ?? 'Student', style: const TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Text("Code: ${s['student_code'] ?? 'N/A'} • Grade: ${s['grade'] ?? 'N/A'}"),
                          );
                        },
                      ),
              ),
            ],
          ),
        );
      },
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

  void _showCreateBatchDialog(BuildContext context) {
    final nameCtrl = TextEditingController();
    final subjectCtrl = TextEditingController();
    final capCtrl = TextEditingController(text: '30');
    final startDateCtrl = TextEditingController();
    final endDateCtrl = TextEditingController();
    final startTimeCtrl = TextEditingController();
    final endTimeCtrl = TextEditingController();
    final plannerDescCtrl = TextEditingController();
    final teachMethodCtrl = TextEditingController();
    final instructCtrl = TextEditingController();

    final RxString selectedCourseId = ''.obs;
    final RxString selectedCourseTitle = ''.obs;
    final RxList<String> selectedDays = <String>[].obs;
    final RxString plannerPath = ''.obs;
    final RxString videoPath = ''.obs;

    final daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.9,
          maxChildSize: 0.95,
          minChildSize: 0.5,
          expand: false,
          builder: (context, scrollController) {
            return SingleChildScrollView(
              controller: scrollController,
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Create Study Batch", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 20),

                  // Course Selector
                  const Text("Select Course *", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
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
                        hint: const Text("Choose Course"),
                        value: selectedCourseId.value.isEmpty ? null : selectedCourseId.value,
                        items: controller.courses.where((c) => c.status == 'approved' || c.status == 'active').map((c) {
                          return DropdownMenuItem<String>(
                            value: c.id,
                            child: Text("${c.title} (${c.grade})"),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            selectedCourseId.value = val;
                            selectedCourseTitle.value = controller.courses.firstWhere((c) => c.id == val).title;
                          }
                        },
                      ),
                    ),
                  )),
                  const SizedBox(height: 16),

                  CustomTextField(label: 'Batch Name *', hint: 'e.g. Newton Class 10 Physics Batch A', controller: nameCtrl, prefixIcon: Icons.badge),
                  CustomTextField(label: 'Subject *', hint: 'e.g. Physics', controller: subjectCtrl, prefixIcon: Icons.subject),
                  CustomTextField(label: 'Capacity (Max 30) *', hint: '30', controller: capCtrl, keyboardType: TextInputType.number, prefixIcon: Icons.group),

                  const Text("Days of the Week *", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: daysOfWeek.map((day) => Obx(() {
                      final isSelected = selectedDays.contains(day);
                      return FilterChip(
                        selected: isSelected,
                        label: Text(day, style: TextStyle(color: isSelected ? Colors.white : Colors.black87, fontSize: 12)),
                        selectedColor: AppColors.teacherRole,
                        checkmarkColor: Colors.white,
                        onSelected: (selected) {
                          if (selected) {
                            selectedDays.add(day);
                          } else {
                            selectedDays.remove(day);
                          }
                        },
                      );
                    })).toList(),
                  ),
                  const SizedBox(height: 16),

                  CustomTextField(
                    label: 'Start Date (YYYY-MM-DD) *',
                    hint: 'Select Start Date',
                    controller: startDateCtrl,
                    readOnly: true,
                    prefixIcon: Icons.date_range,
                    onTap: () => _selectDate(context, startDateCtrl),
                  ),
                  CustomTextField(
                    label: 'End Date (YYYY-MM-DD) *',
                    hint: 'Select End Date',
                    controller: endDateCtrl,
                    readOnly: true,
                    prefixIcon: Icons.date_range,
                    onTap: () => _selectDate(context, endDateCtrl),
                  ),
                  CustomTextField(
                    label: 'Start Time (HH:MM) *',
                    hint: 'Select Start Time',
                    controller: startTimeCtrl,
                    readOnly: true,
                    prefixIcon: Icons.access_time,
                    onTap: () => _selectTime(context, startTimeCtrl),
                  ),
                  CustomTextField(
                    label: 'End Time (HH:MM) *',
                    hint: 'Select End Time',
                    controller: endTimeCtrl,
                    readOnly: true,
                    prefixIcon: Icons.access_time,
                    onTap: () => _selectTime(context, endTimeCtrl),
                  ),
                  CustomTextField(label: 'Learning Syllabus / Schedule Description *', hint: 'Chapter 1: Electrostatics (2 weeks)...', controller: plannerDescCtrl, maxLines: 3, prefixIcon: Icons.description),
                  CustomTextField(label: 'Teaching Methodology *', hint: 'e.g. Vector animations, weekly quizzes...', controller: teachMethodCtrl, prefixIcon: Icons.tips_and_updates),
                  CustomTextField(label: 'Prerequisites / Instructions *', hint: 'e.g. Bring notebook, revise Grade 9 kinematics.', controller: instructCtrl, prefixIcon: Icons.rule),

                  const SizedBox(height: 16),

                  // Syllabus / Planner Upload
                  const Text("Course Planner File (PDF) *", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 8),
                  Obx(() => Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade300)),
                    child: plannerPath.value.isEmpty
                        ? TextButton.icon(
                            icon: const Icon(Icons.file_upload, color: AppColors.teacherRole),
                            label: const Text("Select PDF Course Planner", style: TextStyle(color: AppColors.teacherRole)),
                            onPressed: () async {
                              final result = await FilePicker.pickFiles(type: FileType.custom, allowedExtensions: ['pdf']);
                              if (result != null && result.files.single.path != null) {
                                plannerPath.value = result.files.single.path!;
                              }
                            },
                          )
                        : Row(
                            children: [
                              const Icon(Icons.picture_as_pdf, color: Colors.red),
                              const SizedBox(width: 8),
                              Expanded(child: Text(plannerPath.value.split('/').last, maxLines: 1, overflow: TextOverflow.ellipsis)),
                              IconButton(icon: const Icon(Icons.delete, color: Colors.grey), onPressed: () => plannerPath.value = ''),
                            ],
                          ),
                  )),

                  const SizedBox(height: 16),

                  // Demo Video Upload
                  const Text("Batch Demo Video File (MP4) *", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 8),
                  Obx(() => Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade300)),
                    child: videoPath.value.isEmpty
                        ? TextButton.icon(
                            icon: const Icon(Icons.video_library, color: AppColors.teacherRole),
                            label: const Text("Select MP4 Demo Video", style: TextStyle(color: AppColors.teacherRole)),
                            onPressed: () async {
                              final result = await FilePicker.pickFiles(type: FileType.video);
                              if (result != null && result.files.single.path != null) {
                                videoPath.value = result.files.single.path!;
                              }
                            },
                          )
                        : Row(
                            children: [
                              const Icon(Icons.videocam, color: Colors.blue),
                              const SizedBox(width: 8),
                              Expanded(child: Text(videoPath.value.split('/').last, maxLines: 1, overflow: TextOverflow.ellipsis)),
                              IconButton(icon: const Icon(Icons.delete, color: Colors.grey), onPressed: () => videoPath.value = ''),
                            ],
                          ),
                  )),

                  const SizedBox(height: 24),
                  CustomButton(
                    text: 'Create Study Batch',
                    onPressed: () {
                      if (selectedCourseId.value.isEmpty || nameCtrl.text.isEmpty || subjectCtrl.text.isEmpty || selectedDays.isEmpty || plannerPath.value.isEmpty || videoPath.value.isEmpty) {
                        Get.snackbar('Error', 'Please fill all fields, select days, and upload files');
                        return;
                      }

                      final body = {
                        'course_id': selectedCourseId.value,
                        'batch_name': nameCtrl.text.trim(),
                        'subject': subjectCtrl.text.trim(),
                        'start_date': startDateCtrl.text.trim(),
                        'end_date': endDateCtrl.text.trim(),
                        'start_time': startTimeCtrl.text.trim(),
                        'end_time': endTimeCtrl.text.trim(),
                        'days_of_week': selectedDays,
                        'capacity': int.tryParse(capCtrl.text.trim()) ?? 30,
                        'planner_desc': plannerDescCtrl.text.trim(),
                        'teaching_method': teachMethodCtrl.text.trim(),
                        'batch_instructions': instructCtrl.text.trim(),
                      };

                      controller.createBatch(body, plannerPath.value, videoPath.value);
                      Navigator.pop(context);
                    },
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
