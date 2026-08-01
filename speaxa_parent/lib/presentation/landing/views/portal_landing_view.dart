import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/routes/app_routes.dart';
import '../controllers/landing_controller.dart';

class PortalLandingView extends GetView<LandingController> {
  const PortalLandingView({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? Colors.white : const Color(0xFF1E293B);
    final subColor = isDark ? Colors.white70 : Colors.grey.shade600;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBg : Colors.white,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.darkCard : Colors.white,
        elevation: 0.5,
        title: Row(
          children: [
            Container(
              width: 16,
              height: 16,
              decoration: const BoxDecoration(
                color: AppColors.parentRole,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              "SPEAXA PARENT",
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w900,
                color: textColor,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
        automaticallyImplyLeading: false,
        actions: [
          TextButton(
            onPressed: () => Get.toNamed(Routes.LOGIN),
            style: TextButton.styleFrom(
              foregroundColor: AppColors.parentRole,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            ),
            child: const Text(
              "Sign In",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Obx(() {
        if (controller.isLoading.value) {
          return const Center(child: CircularProgressIndicator(color: AppColors.parentRole));
        }

        return RefreshIndicator(
          onRefresh: controller.fetchPublicData,
          color: AppColors.parentRole,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Welcome Hero Section
                _buildHeroBanner(context, isDark),
                const SizedBox(height: 32),

                // 2. Platform Highlights
                _buildHighlightsGrid(isDark, textColor, subColor),
                const SizedBox(height: 32),

                // 3. Featured Courses
                _buildCoursesSection(isDark, textColor, subColor),
                const SizedBox(height: 32),

                // 4. Expert Mentors
                _buildMentorsSection(isDark, textColor, subColor),
                const SizedBox(height: 32),

                // 5. Frequently Asked Questions
                _buildFaqSection(isDark, textColor, subColor),
                const SizedBox(height: 40),

                // 6. Community Footer CTA
                _buildFooterCTA(isDark),
                const SizedBox(height: 24),
              ],
            ),
          ),
        );
      }),
    );
  }

  Widget _buildHeroBanner(BuildContext context, bool isDark) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0284C7), Color(0xFF0F766E)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0284C7).withOpacity(0.24),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Empower Your Child's Speech Journey 🚀",
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.bold,
              height: 1.25,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            "Track class attendance, review AI-driven speech observations, and connect directly with clinical pathologists and school teachers.",
            style: TextStyle(
              color: Colors.white.withOpacity(0.8),
              fontSize: 13,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF0284C7),
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                ),
                onPressed: () => Get.toNamed(Routes.LOGIN),
                child: const Text("Get Started", style: TextStyle(fontWeight: FontWeight.bold)),
              ),
              const SizedBox(width: 12),
              TextButton(
                style: TextButton.styleFrom(
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
                onPressed: () => Get.toNamed(Routes.REGISTER),
                child: const Text(
                  "Create Account",
                  style: TextStyle(fontWeight: FontWeight.bold, decoration: TextDecoration.underline),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHighlightsGrid(bool isDark, Color textColor, Color subColor) {
    final highlights = [
      {
        'title': 'Milestones Radar',
        'desc': 'Visual analytics for cognitive speech progress, clarity, and discipline.',
        'icon': Icons.radar_rounded,
        'color': const Color(0xFFF59E0B),
      },
      {
        'title': 'Therapist Connect',
        'desc': 'Send private messages directly to assigned subject speech mentors.',
        'icon': Icons.chat_bubble_rounded,
        'color': const Color(0xFF0D7A6D),
      },
      {
        'title': 'Clinical Progress',
        'desc': 'Detailed reports showing homework feedback and monthly grades.',
        'icon': Icons.assignment_turned_in_rounded,
        'color': const Color(0xFF8B5CF6),
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Core Parent Portal Features",
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: textColor),
        ),
        const SizedBox(height: 14),
        Column(
          children: highlights.map((h) {
            final color = h['color'] as Color;
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkCard : Colors.grey.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.08),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(h['icon'] as IconData, color: color, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          h['title'] as String,
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: textColor),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          h['desc'] as String,
                          style: TextStyle(fontSize: 12, color: subColor, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildCoursesSection(bool isDark, Color textColor, Color subColor) {
    if (controller.liveCourses.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Featured Batches & Classes",
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: textColor),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 180,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: controller.liveCourses.length,
            itemBuilder: (context, idx) {
              final course = controller.liveCourses[idx];
              final String courseName = course['name']?.toString() ?? 'Specialized Session';
              final String subject = course['subject']?.toString() ?? 'Speech Therapy';
              final String description = course['description']?.toString() ?? 'Comprehensive clinical developmental program.';

              return GestureDetector(
                onTap: () => Get.toNamed(Routes.LOGIN),
                child: Container(
                  width: 230,
                  margin: const EdgeInsets.only(right: 14),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkCard : Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.01),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      )
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.parentRole.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          subject,
                          style: const TextStyle(
                            color: AppColors.parentRole,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        courseName,
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: textColor),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        description,
                        style: TextStyle(fontSize: 12, color: subColor, height: 1.4),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildMentorsSection(bool isDark, Color textColor, Color subColor) {
    if (controller.liveTeachers.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Our Expert Speech Therapists",
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: textColor),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 115,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: controller.liveTeachers.length,
            itemBuilder: (context, idx) {
              final t = controller.liveTeachers[idx];
              final String name = t['name']?.toString() ?? 'Specialist';
              final String qualification = t['qualification']?.toString() ?? 'Speech Pathologist';
              final double rating = double.tryParse(t['rating']?.toString() ?? '') ?? 4.9;

              return Container(
                width: 220,
                margin: const EdgeInsets.only(right: 14),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkCard : Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 22,
                      backgroundColor: AppColors.primary.withOpacity(0.12),
                      child: Text(
                        name.isNotEmpty ? name[0].toUpperCase() : 'T',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            name,
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: textColor),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            qualification,
                            style: TextStyle(fontSize: 10.5, color: subColor),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.star_rounded, color: Colors.orangeAccent, size: 14),
                              const SizedBox(width: 4),
                              Text(
                                rating.toStringAsFixed(1),
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: textColor),
                              ),
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
        ),
      ],
    );
  }

  Widget _buildFaqSection(bool isDark, Color textColor, Color subColor) {
    final faqs = [
      {
        'q': "How do I link my child's account?",
        'a': "After signing in, navigate to your Profile page and select 'Add Child Code'. Enter the student ID code assigned to your child to send a linking request.",
      },
      {
        'q': "How often are therapist reviews updated?",
        'a': "Specialist observations, clinical marks, and behavioral ratings are synced continuously following each speech therapy session.",
      },
      {
        'q': "Can I message multiple therapists?",
        'a': "Yes! The Therapist Connect tab automatically displays all mentors and speech pathologists assigned to your child's active batches, allowing direct private messages.",
      },
      {
        'q': "Is my child's developmental progress secure?",
        'a': "Absolutely. Speaxa implements complete end-to-end data encryption for all progress details, observations logs, and parent-therapist chat messages.",
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          "Parent FAQs",
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: textColor),
        ),
        const SizedBox(height: 12),
        ...faqs.map((faq) {
          return ExpansionTile(
            title: Text(
              faq['q']!,
              style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold, color: textColor),
            ),
            collapsedIconColor: subColor,
            iconColor: AppColors.parentRole,
            childrenPadding: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
            children: [
              Text(
                faq['a']!,
                style: TextStyle(fontSize: 12.5, color: subColor, height: 1.5),
              ),
            ],
          );
        }),
      ],
    );
  }

  Widget _buildFooterCTA(bool isDark) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : Colors.grey.shade50,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
      ),
      child: Column(
        children: [
          const Icon(Icons.diversity_3_rounded, color: AppColors.parentRole, size: 40),
          const SizedBox(height: 12),
          Text(
            "Empower Progress Today",
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : const Color(0xFF1E293B),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            "Access personalized learning, feedback, and logs for your child.",
            style: TextStyle(fontSize: 12, color: isDark ? Colors.white70 : Colors.grey.shade600),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: 200,
            height: 45,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.parentRole,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () => Get.toNamed(Routes.LOGIN),
              child: const Text("Sign In Now", style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}
