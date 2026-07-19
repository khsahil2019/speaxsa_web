import 'dart:io';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:file_picker/file_picker.dart';
import '../../../../core/constants/app_colors.dart';
import '../../controllers/teacher_dashboard_controller.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/empty_state_widget.dart';
import '../../../shared/widgets/status_chip.dart';

class TeacherCoursesTab extends GetView<TeacherDashboardController> {
  const TeacherCoursesTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      body: Obx(() {
        final list = controller.courses;
        if (list.isEmpty) {
          return EmptyStateWidget(
            title: "No Courses Created Yet",
            message: "Create a draft course and request admin approval to start enrolling.",
            buttonText: "Create Course",
            onButtonPressed: () => _showCreateCourseDialog(context),
          );
        }

        return RefreshIndicator(
          onRefresh: controller.loadCourses,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            itemBuilder: (context, i) {
              final c = list[i];
              return Card(
                margin: const EdgeInsets.only(bottom: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (c.thumbnailUrl != null && c.thumbnailUrl!.isNotEmpty)
                      ClipRRect(
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                        child: Image.network(
                          c.thumbnailUrl!.startsWith('/') ? 'https://speaxa.in${c.thumbnailUrl}' : c.thumbnailUrl!,
                          height: 150,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(
                            height: 150,
                            color: AppColors.teacherRole.withOpacity(0.1),
                            child: const Icon(Icons.book, size: 50, color: AppColors.teacherRole),
                          ),
                        ),
                      ),
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              StatusChip(status: c.status),
                              Text("₹${c.fees.toStringAsFixed(2)}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.teacherRole)),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Text(c.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                          const SizedBox(height: 4),
                          Text("Subject: ${c.subject ?? ''} • Grade: ${c.grade ?? ''} • Board: ${c.board ?? ''}", style: const TextStyle(color: Colors.grey, fontSize: 12)),
                          if (c.description != null && c.description!.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(c.description!, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.grey.shade700, fontSize: 13)),
                          ],
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text("Batches: ${c.batchCount} • Students: ${c.enrolledStudents}", style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                              if (c.status == 'draft')
                                ElevatedButton.icon(
                                  icon: const Icon(Icons.send_and_archive, size: 16),
                                  label: const Text("Request Approval", style: TextStyle(fontSize: 12)),
                                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.teacherRole, foregroundColor: Colors.white, elevation: 0),
                                  onPressed: () => controller.requestCourseApproval(c.id),
                                )
                              else if (c.status == 'pending')
                                const Text("Awaiting Admin Review", style: TextStyle(color: Colors.orange, fontSize: 12, fontWeight: FontWeight.bold))
                              else
                                const Text("Active & Approved", style: TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        );
      }),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateCourseDialog(context),
        label: const Text("Create Course"),
        icon: const Icon(Icons.add),
        backgroundColor: AppColors.teacherRole,
        foregroundColor: Colors.white,
      ),
    );
  }

  void _showCreateCourseDialog(BuildContext context) {
    final titleCtrl = TextEditingController();
    final subjectCtrl = TextEditingController();
    final gradeCtrl = TextEditingController();
    final boardCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final durationCtrl = TextEditingController(text: '12');
    final tagCtrl = TextEditingController();
    final objectiveCtrl = TextEditingController();
    final outcomesCtrl = TextEditingController();
    final langCtrl = TextEditingController(text: 'English');
    final dailyClassCtrl = TextEditingController(text: '60 minutes');
    final assessmentCtrl = TextEditingController(text: 'Sundays');

    final RxString thumbnailPath = ''.obs;
    final RxString uploadedUrl = ''.obs;

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
                  const Text("Create New Course Draft", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 20),

                  // Thumbnail Picker
                  Obx(() => Container(
                    width: double.infinity,
                    height: 150,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    alignment: Alignment.center,
                    child: thumbnailPath.value.isEmpty
                        ? TextButton.icon(
                            icon: const Icon(Icons.image, color: AppColors.teacherRole),
                            label: const Text("Select Thumbnail / Banner *", style: TextStyle(color: AppColors.teacherRole)),
                            onPressed: () async {
                              final result = await FilePicker.pickFiles(type: FileType.image);
                              if (result != null && result.files.single.path != null) {
                                thumbnailPath.value = result.files.single.path!;
                                // Upload instantly
                                final url = await controller.uploadCourseThumbnail(thumbnailPath.value);
                                if (url != null) {
                                  uploadedUrl.value = url;
                                }
                              }
                            },
                          )
                        : Stack(
                            fit: StackFit.expand,
                            children: [
                              ClipRRect(borderRadius: BorderRadius.circular(16), child: Image.file(File(thumbnailPath.value), fit: BoxFit.cover)),
                              Positioned(
                                top: 8,
                                right: 8,
                                child: CircleAvatar(
                                  backgroundColor: Colors.red,
                                  radius: 16,
                                  child: IconButton(
                                    padding: EdgeInsets.zero,
                                    icon: const Icon(Icons.delete, color: Colors.white, size: 16),
                                    onPressed: () {
                                      thumbnailPath.value = '';
                                      uploadedUrl.value = '';
                                    },
                                  ),
                                ),
                              ),
                            ],
                          ),
                  )),
                  const SizedBox(height: 16),

                  CustomTextField(label: 'Course Title *', hint: 'e.g. Class 10 Physics Mastery', controller: titleCtrl, prefixIcon: Icons.title),
                  CustomTextField(label: 'Subject *', hint: 'e.g. Physics', controller: subjectCtrl, prefixIcon: Icons.subject),
                  CustomTextField(label: 'Grade *', hint: 'e.g. Class 10', controller: gradeCtrl, prefixIcon: Icons.school),
                  CustomTextField(label: 'Board *', hint: 'e.g. CBSE', controller: boardCtrl, prefixIcon: Icons.gavel),
                  CustomTextField(label: 'Description *', hint: 'Enter detailed course syllabus & description...', controller: descCtrl, maxLines: 3, prefixIcon: Icons.description),
                  CustomTextField(label: 'Duration (Weeks) *', hint: 'e.g. 12', controller: durationCtrl, keyboardType: TextInputType.number, prefixIcon: Icons.timelapse),
                  CustomTextField(label: 'Custom Badge / Tag Line *', hint: 'e.g. Board Exam Special', controller: tagCtrl, prefixIcon: Icons.local_offer),
                  CustomTextField(label: 'Objective *', hint: 'e.g. Learn basic and advanced mechanics concepts.', controller: objectiveCtrl, prefixIcon: Icons.flag),
                  CustomTextField(label: 'Learning Outcome *', hint: 'e.g. Score 95%+ in board examinations.', controller: outcomesCtrl, prefixIcon: Icons.auto_graph),
                  CustomTextField(label: 'Language of Instruction *', hint: 'e.g. English, Hindi', controller: langCtrl, prefixIcon: Icons.language),
                  CustomTextField(label: 'Daily Class Duration *', hint: 'e.g. 60 minutes', controller: dailyClassCtrl, prefixIcon: Icons.hourglass_empty),
                  CustomTextField(label: 'Weekly Assessment Days *', hint: 'e.g. Sundays', controller: assessmentCtrl, prefixIcon: Icons.assessment),

                  const SizedBox(height: 24),
                  CustomButton(
                    text: 'Save Course Draft',
                    onPressed: () {
                      if (titleCtrl.text.isEmpty || subjectCtrl.text.isEmpty || gradeCtrl.text.isEmpty || boardCtrl.text.isEmpty || descCtrl.text.isEmpty || uploadedUrl.value.isEmpty) {
                        Get.snackbar('Error', 'Please fill all required fields and upload a thumbnail');
                        return;
                      }

                      final body = {
                        'title': titleCtrl.text.trim(),
                        'subject': subjectCtrl.text.trim(),
                        'grade': gradeCtrl.text.trim(),
                        'board': boardCtrl.text.trim(),
                        'description': descCtrl.text.trim(),
                        'duration_weeks': int.tryParse(durationCtrl.text.trim()) ?? 12,
                        'thumbnail_url': uploadedUrl.value,
                        'custom_tag': tagCtrl.text.trim(),
                        'learning_duration': '${durationCtrl.text.trim()} weeks',
                        'objective': objectiveCtrl.text.trim(),
                        'learning_outcome': outcomesCtrl.text.trim(),
                        'language_instruction': langCtrl.text.trim(),
                        'daily_class_duration': dailyClassCtrl.text.trim(),
                        'assessment_days': assessmentCtrl.text.trim(),
                      };

                      controller.createCourse(body);
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
