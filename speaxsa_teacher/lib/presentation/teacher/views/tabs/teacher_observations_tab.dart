import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../../core/constants/app_colors.dart';
import '../../controllers/teacher_dashboard_controller.dart';
import '../../../shared/widgets/custom_button.dart';
import '../../../shared/widgets/custom_text_field.dart';
import '../../../shared/widgets/empty_state_widget.dart';

class TeacherObservationsTab extends GetView<TeacherDashboardController> {
  const TeacherObservationsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      body: Obx(() {
        final list = controller.observations;
        if (list.isEmpty) {
          return EmptyStateWidget(
            title: "No Student Observations",
            message: "Record detailed behavior and academic progress rating observations for students.",
            buttonText: "Log Observation",
            onButtonPressed: () => _showLogObservationDialog(context),
          );
        }

        return RefreshIndicator(
          onRefresh: controller.loadObservations,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            itemBuilder: (context, i) {
              final obs = list[i] as Map<String, dynamic>;
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
                          Text(obs['student_name'] ?? 'Student', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(color: AppColors.teacherRole.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                            child: Text(
                              "Avg: ${obs['observation_score'] ?? 5.0}★",
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.teacherRole),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text("Batch: ${obs['batch_name'] ?? 'Study Batch'}", style: const TextStyle(color: Colors.grey, fontSize: 12)),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        children: [
                          _buildScorePill("Curiosity", obs['curiosity']),
                          _buildScorePill("Understanding", obs['understanding']),
                          _buildScorePill("Consistency", obs['consistency']),
                          _buildScorePill("Communication", obs['communication']),
                          _buildScorePill("Participation", obs['participation']),
                          _buildScorePill("Discipline", obs['discipline']),
                        ],
                      ),
                      if (obs['notes'] != null && obs['notes'].toString().isNotEmpty) ...[
                        const Divider(height: 24),
                        Text(
                          "Mentor Remarks: \"${obs['notes']}\"",
                          style: TextStyle(color: Colors.grey.shade700, fontSize: 13, fontStyle: FontStyle.italic),
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
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showLogObservationDialog(context),
        label: const Text("Log Observation"),
        icon: const Icon(Icons.add),
        backgroundColor: AppColors.teacherRole,
        foregroundColor: Colors.white,
      ),
    );
  }

  Widget _buildScorePill(String label, dynamic score) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.grey.shade200)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: const TextStyle(fontSize: 10.5, color: Colors.black54)),
          const SizedBox(width: 4),
          Text("${score ?? 5}★", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.orange)),
        ],
      ),
    );
  }

  void _showLogObservationDialog(BuildContext context) {
    final notesCtrl = TextEditingController();

    final RxString selectedBatchId = ''.obs;
    final RxString selectedStudentId = ''.obs;
    final RxList<dynamic> studentsList = <dynamic>[].obs;

    // Rating states
    final RxDouble curiosity = 5.0.obs;
    final RxDouble understanding = 5.0.obs;
    final RxDouble consistency = 5.0.obs;
    final RxDouble communication = 5.0.obs;
    final RxDouble participation = 5.0.obs;
    final RxDouble discipline = 5.0.obs;

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
                  const Text("Log Student Observation", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 20),

                  // Batch selection
                  const Text("Select Batch *", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 8),
                  Obx(() => Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade300), borderRadius: BorderRadius.circular(12)),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        isExpanded: true,
                        hint: const Text("Choose Batch"),
                        value: selectedBatchId.value.isEmpty ? null : selectedBatchId.value,
                        items: controller.batches.where((b) => b.status == 'active').map((b) {
                          return DropdownMenuItem<String>(value: b.id, child: Text(b.batchName));
                        }).toList(),
                        onChanged: (val) async {
                          if (val != null) {
                            selectedBatchId.value = val;
                            selectedStudentId.value = '';
                            studentsList.clear();
                            final students = await controller.getBatchStudents(val);
                            studentsList.assignAll(students);
                          }
                        },
                      ),
                    ),
                  )),
                  const SizedBox(height: 16),

                  // Student selection
                  const Text("Select Student *", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 8),
                  Obx(() => Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade300), borderRadius: BorderRadius.circular(12)),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        isExpanded: true,
                        hint: const Text("Choose Student"),
                        value: selectedStudentId.value.isEmpty ? null : selectedStudentId.value,
                        items: studentsList.map((s) {
                          return DropdownMenuItem<String>(value: s['id'].toString(), child: Text(s['name'] ?? 'Student'));
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            selectedStudentId.value = val;
                          }
                        },
                      ),
                    ),
                  )),
                  const SizedBox(height: 20),

                  // Ratings
                  _buildRatingSlider("Curiosity & questioning", curiosity),
                  _buildRatingSlider("Topic understanding", understanding),
                  _buildRatingSlider("Homework consistency", consistency),
                  _buildRatingSlider("Speech & communication", communication),
                  _buildRatingSlider("Class participation", participation),
                  _buildRatingSlider("Behavioral discipline", discipline),

                  const SizedBox(height: 16),
                  CustomTextField(label: 'Observation Remarks', hint: 'Write student behavioral observations...', controller: notesCtrl, maxLines: 2, prefixIcon: Icons.notes),

                  const SizedBox(height: 24),
                  CustomButton(
                    text: 'Save Observation',
                    onPressed: () {
                      if (selectedBatchId.value.isEmpty || selectedStudentId.value.isEmpty) {
                        Get.snackbar('Error', 'Please select a batch and student');
                        return;
                      }

                      // Average score calculation
                      final avg = (curiosity.value + understanding.value + consistency.value + communication.value + participation.value + discipline.value) / 6.0;

                      final body = {
                        'studentId': selectedStudentId.value,
                        'batchId': selectedBatchId.value,
                        'curiosity': curiosity.value,
                        'understanding': understanding.value,
                        'consistency': consistency.value,
                        'communication': communication.value,
                        'participation': participation.value,
                        'discipline': discipline.value,
                        'observation_score': double.parse(avg.toStringAsFixed(1)),
                        'notes': notesCtrl.text.trim(),
                      };

                      controller.createObservation(body);
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

  Widget _buildRatingSlider(String label, RxDouble stateVal) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            Obx(() => Text("${stateVal.value.toStringAsFixed(0)} / 5 ★", style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.orange, fontSize: 13))),
          ],
        ),
        Obx(() => Slider(
              value: stateVal.value,
              min: 1.0,
              max: 5.0,
              divisions: 4,
              activeColor: AppColors.primary,
              inactiveColor: Colors.grey.shade200,
              onChanged: (val) => stateVal.value = val,
            )),
      ],
    );
  }
}
