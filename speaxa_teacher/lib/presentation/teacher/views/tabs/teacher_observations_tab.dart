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
            message: "Record detailed behavior and 0-100 academic observation scores for your students.",
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
              final c = num.tryParse(obs['curiosity']?.toString() ?? '') ?? 0;
              final u = num.tryParse(obs['understanding']?.toString() ?? '') ?? 0;
              final con = num.tryParse(obs['consistency']?.toString() ?? '') ?? 0;
              final comm = num.tryParse(obs['communication']?.toString() ?? '') ?? 0;
              final p = num.tryParse(obs['participation']?.toString() ?? '') ?? 0;
              final d = num.tryParse(obs['discipline']?.toString() ?? '') ?? 0;

              final metrics = [c, u, con, comm, p, d].where((m) => m > 0).map((m) => m <= 5 ? m * 20 : m).toList();
              final computedAvg = metrics.isNotEmpty ? (metrics.reduce((a, b) => a + b) / metrics.length).round() : 80;

              final rawScore = obs['observation_score'] ?? obs['score'];
              final scoreNum = (rawScore is num && rawScore > 0) ? (rawScore <= 5 ? (rawScore * 20).round() : rawScore.round()) : computedAvg;

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
                          Expanded(
                            child: Text(
                              obs['student_name'] ?? 'Student',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(color: AppColors.teacherRole.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                            child: Text(
                              "Avg Score: $scoreNum / 100",
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
      floatingActionButton: FloatingActionButton.small(
        onPressed: () => _showLogObservationDialog(context),
        tooltip: "Log Observation",
        backgroundColor: AppColors.teacherRole,
        foregroundColor: Colors.white,
        child: const Icon(Icons.add_rounded),
      ),
    );
  }

  Widget _buildScorePill(String label, dynamic score) {
    if (score == null) return const SizedBox.shrink();
    num scoreVal = (score is num) ? (score <= 5 ? score * 20 : score) : (double.tryParse(score.toString()) ?? 0);
    if (scoreVal <= 0) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.grey.shade200)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: const TextStyle(fontSize: 10.5, color: Colors.black54)),
          const SizedBox(width: 4),
          Text("${scoreVal.toInt()}/100", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary)),
        ],
      ),
    );
  }

  void _showLogObservationDialog(BuildContext context) {
    final notesCtrl = TextEditingController();

    final RxString selectedBatchId = ''.obs;
    final RxString selectedStudentId = ''.obs;
    final RxList<dynamic> studentsList = <dynamic>[].obs;

    // 0 to 100 Rating states (Step / Gap of 5)
    final RxDouble curiosity = 80.0.obs;
    final RxDouble understanding = 80.0.obs;
    final RxDouble consistency = 80.0.obs;
    final RxDouble communication = 80.0.obs;
    final RxDouble participation = 80.0.obs;
    final RxDouble discipline = 80.0.obs;

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
                  const Text("Log Student Observation (0-100 Score)", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
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

                  // 0 to 100 Ratings (Step 5)
                  _buildRatingSlider("Curiosity & Questioning", curiosity),
                  _buildRatingSlider("Topic Understanding", understanding),
                  _buildRatingSlider("Homework Consistency", consistency),
                  _buildRatingSlider("Speech & Communication", communication),
                  _buildRatingSlider("Class Participation", participation),
                  _buildRatingSlider("Behavioral Discipline", discipline),

                  const SizedBox(height: 16),
                  CustomTextField(label: 'Observation Remarks', hint: 'Write student behavioral observations...', controller: notesCtrl, maxLines: 2, prefixIcon: Icons.notes),

                  const SizedBox(height: 24),
                  CustomButton(
                    text: 'Save Observation Score',
                    onPressed: () {
                      if (selectedBatchId.value.isEmpty || selectedStudentId.value.isEmpty) {
                        Get.snackbar('Error', 'Please select a batch and student');
                        return;
                      }

                      final avg = (curiosity.value + understanding.value + consistency.value + communication.value + participation.value + discipline.value) / 6.0;

                      final body = {
                        'studentId': selectedStudentId.value,
                        'batchId': selectedBatchId.value,
                        'curiosity': curiosity.value.toInt(),
                        'understanding': understanding.value.toInt(),
                        'consistency': consistency.value.toInt(),
                        'communication': communication.value.toInt(),
                        'participation': participation.value.toInt(),
                        'discipline': discipline.value.toInt(),
                        'observation_score': avg.round(),
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

  // 0 to 100 Score Slider with 5 Gap / Step
  Widget _buildRatingSlider(String label, RxDouble stateVal) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            Obx(() => Text("${stateVal.value.toInt()} / 100", style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 13))),
          ],
        ),
        Obx(() => Slider(
              value: stateVal.value,
              min: 0.0,
              max: 100.0,
              divisions: 20, // Gap of 5 (100 / 20 = 5)
              activeColor: AppColors.primary,
              inactiveColor: Colors.grey.shade200,
              onChanged: (val) => stateVal.value = val,
            )),
        const SizedBox(height: 4),
      ],
    );
  }
}
