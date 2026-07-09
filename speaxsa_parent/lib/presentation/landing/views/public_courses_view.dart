import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/routes/app_routes.dart';
import '../controllers/landing_controller.dart';

class PublicCoursesView extends StatelessWidget {
  const PublicCoursesView({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<LandingController>();

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Explore Live Courses", style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 24)),
          const SizedBox(height: 6),
          const Text("Live curriculum tailored to boost clarity, logic, and exam scores", style: TextStyle(color: Colors.grey, fontSize: 13)),
          const SizedBox(height: 20),

          Obx(() {
            final courses = controller.liveCourses;

            if (controller.isLoading.value) {
              return const Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator()),
              );
            }

            final List<Map<String, dynamic>> displayList = courses.isNotEmpty
                ? courses.map((e) => Map<String, dynamic>.from(e as Map)).toList()
                : [
                    {
                      'title': 'Class 10 CBSE Physics Mastery',
                      'subject': 'Physics',
                      'class_level': 'Class 10',
                      'price': 999,
                      'teacher_name': 'Dr. Vikram Seth',
                      'description': 'Comprehensive live coverage of light, electricity, and magnetic effects with interactive polls.'
                    },
                    {
                      'title': 'Class 12 Organic Chemistry',
                      'subject': 'Chemistry',
                      'class_level': 'Class 12',
                      'price': 1299,
                      'teacher_name': 'Prof. Ananya Roy',
                      'description': 'Complete reaction mechanisms, synthetic pathways, and board exam question solving.'
                    },
                    {
                      'title': 'Class 9 Mathematics Foundation',
                      'subject': 'Mathematics',
                      'class_level': 'Class 9',
                      'price': 899,
                      'teacher_name': 'Rahul Sharma',
                      'description': 'Polynomials, coordinate geometry, and surface areas with daily live problem solving.'
                    },
                    {
                      'title': 'Class 11 Biology Concepts',
                      'subject': 'Biology',
                      'class_level': 'Class 11',
                      'price': 1099,
                      'teacher_name': 'Dr. Meera Kapoor',
                      'description': 'Cellular biology, human physiology, and plant kingdom with 3D diagram explanations.'
                    },
                  ];

            return ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: displayList.length,
              itemBuilder: (context, index) {
                final course = displayList[index];
                return Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardColor,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 4))
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              "${course['class_level'] ?? 'All Grades'} • ${course['subject'] ?? 'General'}",
                              style: const TextStyle(color: AppColors.primaryDark, fontWeight: FontWeight.bold, fontSize: 11),
                            ),
                          ),
                          Text(
                            "₹${course['price'] ?? 999}/mo",
                            style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        course['title'] ?? 'Live Batch',
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        course['description'] ?? 'Live interactive classes with certified subject mentors.',
                        style: const TextStyle(color: Colors.grey, fontSize: 13, height: 1.4),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.person_outline, size: 16, color: AppColors.primary),
                              const SizedBox(width: 4),
                              Text(
                                course['teacher_name'] ?? 'SOP Verified Mentor',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            ),
                            onPressed: () => Get.toNamed(Routes.LOGIN),
                            child: const Text("Enroll Now", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            );
          }),
        ],
      ),
    );
  }
}
