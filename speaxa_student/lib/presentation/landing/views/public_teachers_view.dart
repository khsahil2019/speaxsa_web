import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/landing_controller.dart';

class PublicTeachersView extends StatelessWidget {
  const PublicTeachersView({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<LandingController>();

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("SOP Verified Faculty", style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 24)),
          const SizedBox(height: 6),
          const Text("Every teacher undergoes background verification, camera/audio audits, and demo lectures", style: TextStyle(color: Colors.grey, fontSize: 13)),
          const SizedBox(height: 20),

          Obx(() {
            final teachers = controller.liveTeachers;

            if (controller.isLoading.value) {
              return const Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator()),
              );
            }

            final List<Map<String, dynamic>> displayList = teachers.isNotEmpty
                ? teachers.map((e) => Map<String, dynamic>.from(e as Map)).toList()
                : [
                    {
                      'name': 'Dr. Vikram Seth',
                      'subject_expertise': 'Physics & Mechanics',
                      'qualification': 'Ph.D. in Physics (IIT Delhi)',
                      'experience_years': 8,
                      'rating': '4.9 ★',
                      'teacher_level': 'Master Mentor'
                    },
                    {
                      'name': 'Prof. Ananya Roy',
                      'subject_expertise': 'Organic Chemistry',
                      'qualification': 'M.Sc. Chemistry (DU)',
                      'experience_years': 6,
                      'rating': '5.0 ★',
                      'teacher_level': 'Senior Faculty'
                    },
                    {
                      'name': 'Rahul Sharma',
                      'subject_expertise': 'Algebra & Calculus',
                      'qualification': 'B.Tech (BITS Pilani)',
                      'experience_years': 5,
                      'rating': '4.8 ★',
                      'teacher_level': 'Lead Faculty'
                    },
                    {
                      'name': 'Dr. Meera Kapoor',
                      'subject_expertise': 'Biology & Genetics',
                      'qualification': 'M.D. / M.Sc. Biology',
                      'experience_years': 10,
                      'rating': '5.0 ★',
                      'teacher_level': 'Master Mentor'
                    },
                  ];

            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: displayList.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.76,
              ),
              itemBuilder: (context, index) {
                final teacher = displayList[index];
                return Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardColor,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.grey.shade200),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8)
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CircleAvatar(
                        radius: 26,
                        backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                        child: Text(
                          (teacher['name'] ?? 'T')[0],
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.primary),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        teacher['name'] ?? 'Mentor',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        teacher['subject_expertise'] ?? 'Subject Expert',
                        style: const TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        teacher['qualification'] ?? 'Certified Mentor',
                        style: const TextStyle(color: Colors.grey, fontSize: 11),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const Spacer(),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.accent.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              "${teacher['rating'] ?? '5.0 ★'}",
                              style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold, fontSize: 11),
                            ),
                          ),
                          Text(
                            "${teacher['experience_years'] ?? 5}+ Yrs Exp",
                            style: const TextStyle(color: Colors.grey, fontSize: 11),
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
