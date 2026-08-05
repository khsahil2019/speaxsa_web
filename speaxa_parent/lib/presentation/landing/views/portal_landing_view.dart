import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/routes/app_routes.dart';
import '../controllers/landing_controller.dart';
import 'about_speaxa_view.dart';
import 'faq_speaxa_view.dart';
import 'public_courses_view.dart';
import 'public_teachers_view.dart';

class PortalLandingView extends GetView<LandingController> {
  const PortalLandingView({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? Colors.white : const Color(0xFF0F172A);
    final subColor = isDark ? Colors.white70 : Colors.grey.shade600;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.darkCard : Colors.white,
        elevation: 0.5,
        title: Row(
          children: [
            Image.asset(
              "assets/images/logo.png",
              height: 28,
              fit: BoxFit.contain,
              errorBuilder: (context, err, stack) => const Icon(Icons.family_restroom_rounded, color: AppColors.parentRole, size: 24),
            ),
            const SizedBox(width: 8),
            Text(
              "SPEAXA PARENT",
              style: TextStyle(
                fontSize: 16,
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
          const SizedBox(width: 4),
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
                const SizedBox(height: 28),

                // 2. Navigation Shortcut Chips
                _buildNavigationChips(context, isDark),
                const SizedBox(height: 28),

                // 3. Platform Highlights
                _buildHighlightsGrid(isDark, textColor, subColor),
                const SizedBox(height: 28),

                // 4. Featured Courses
                _buildCoursesSection(isDark, textColor, subColor),
                const SizedBox(height: 28),

                // 5. Expert Mentors
                _buildMentorsSection(isDark, textColor, subColor),
                const SizedBox(height: 28),

                // 6. Frequently Asked Questions
                _buildFaqSection(isDark, textColor, subColor),
                const SizedBox(height: 32),

                // 7. Community Footer CTA
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
          colors: [Color(0xFF0284C7), Color(0xFF0D7A6D)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0284C7).withOpacity(0.25),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.stars_rounded, color: Colors.amber, size: 14),
                SizedBox(width: 6),
                Text(
                  "Empowering Parent-Child Growth",
                  style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            "Track & Support Your Child's Learning Journey 🚀",
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w900,
              height: 1.25,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            "Monitor live class attendance, review educator feedback, track monthly progress reports, and connect directly with mentors.",
            style: TextStyle(
              color: Colors.white.withOpacity(0.88),
              fontSize: 13,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 20),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF0284C7),
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                ),
                onPressed: () => Get.toNamed(Routes.LOGIN),
                child: const Text("Sign In to Portal", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5)),
              ),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.white, width: 1.5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                ),
                onPressed: () => Get.toNamed(Routes.REGISTER),
                child: const Text("Create Account", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildNavigationChips(BuildContext context, bool isDark) {
    final chips = [
      {'label': 'Browse Courses', 'icon': Icons.menu_book_rounded, 'onTap': () => Get.to(() => const PublicCoursesView())},
      {'label': 'Expert Mentors', 'icon': Icons.people_alt_rounded, 'onTap': () => Get.to(() => const PublicTeachersView())},
      {'label': 'About Speaxa', 'icon': Icons.info_outline_rounded, 'onTap': () => Get.to(() => const AboutSpeaxaView())},
      {'label': 'FAQs & Help', 'icon': Icons.help_outline_rounded, 'onTap': () => Get.to(() => const FaqSpeaxaView())},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: chips.map((c) {
          return Padding(
            padding: const EdgeInsets.only(right: 10),
            child: ActionChip(
              avatar: Icon(c['icon'] as IconData, size: 16, color: AppColors.parentRole),
              label: Text(c['label'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5)),
              backgroundColor: isDark ? AppColors.darkCard : Colors.white,
              elevation: 0,
              side: BorderSide(color: isDark ? Colors.white10 : Colors.grey.shade300),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              onPressed: c['onTap'] as VoidCallback,
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildHighlightsGrid(bool isDark, Color textColor, Color subColor) {
    final highlights = [
      {
        'title': 'Live Attendance Logs',
        'desc': 'Instant real-time class attendance logs and session participation history.',
        'icon': Icons.how_to_reg_rounded,
        'color': const Color(0xFF10B981),
      },
      {
        'title': 'Therapist & Educator Chat',
        'desc': 'Direct 1-on-1 private messaging with subject mentors and clinical speech specialists.',
        'icon': Icons.chat_bubble_rounded,
        'color': AppColors.parentRole,
      },
      {
        'title': 'Academic Report Cards',
        'desc': 'Detailed monthly evaluation reports, homework scores, and downloadable PDF cards.',
        'icon': Icons.analytics_rounded,
        'color': const Color(0xFF8B5CF6),
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text("Why Speaxa Parent?", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: textColor)),
        const SizedBox(height: 12),
        Column(
          children: highlights.map((h) {
            final color = h['color'] as Color;
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkCard : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(h['icon'] as IconData, color: color, size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(h['title'] as String, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: textColor)),
                        const SizedBox(height: 3),
                        Text(h['desc'] as String, style: TextStyle(fontSize: 12.5, color: subColor, height: 1.35)),
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
    final courses = controller.publicCourses;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text("Popular Courses", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: textColor)),
            TextButton(
              onPressed: () => Get.to(() => const PublicCoursesView()),
              child: const Text("View All →", style: TextStyle(color: AppColors.parentRole, fontWeight: FontWeight.bold, fontSize: 13)),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (courses.isEmpty)
          Text("No courses available at the moment.", style: TextStyle(color: subColor, fontSize: 13))
        else
          SizedBox(
            height: 185,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: courses.length,
              itemBuilder: (context, i) {
                final c = Map<String, dynamic>.from(courses[i]);
                final title = c['title'] ?? c['name'] ?? 'Course';
                final desc = c['description'] ?? 'Interactive curriculum for comprehensive learning.';
                final price = c['price'] != null ? "₹${c['price']}" : 'Enrolling';

                return Container(
                  width: 220,
                  margin: const EdgeInsets.only(right: 12),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkCard : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text("Course Batch", style: TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.bold)),
                          ),
                          const SizedBox(height: 8),
                          Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: textColor), maxLines: 2, overflow: TextOverflow.ellipsis),
                          const SizedBox(height: 4),
                          Text(desc, style: TextStyle(fontSize: 11.5, color: subColor), maxLines: 2, overflow: TextOverflow.ellipsis),
                        ],
                      ),
                      Text(price, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.parentRole)),
                    ],
                  ),
                );
              },
            ),
          ),
      ],
    );
  }

  Widget _buildMentorsSection(bool isDark, Color textColor, Color subColor) {
    final teachers = controller.publicTeachers;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                "Speech Specialists & Mentors",
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: textColor),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            TextButton(
              onPressed: () => Get.to(() => const PublicTeachersView()),
              child: const Text("View All →", style: TextStyle(color: AppColors.parentRole, fontWeight: FontWeight.bold, fontSize: 13)),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (teachers.isEmpty)
          Text("No mentors logged at the moment.", style: TextStyle(color: subColor, fontSize: 13))
        else
          SizedBox(
            height: 140,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: teachers.length,
              itemBuilder: (context, i) {
                final t = Map<String, dynamic>.from(teachers[i]);
                final name = t['name'] ?? 'Educator';
                final exp = t['experience_years'] != null ? "${t['experience_years']} yrs exp" : 'Certified Mentor';

                return Container(
                  width: 170,
                  margin: const EdgeInsets.only(right: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkCard : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircleAvatar(
                        radius: 22,
                        backgroundColor: AppColors.parentRole.withOpacity(0.1),
                        child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'T', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.parentRole)),
                      ),
                      const SizedBox(height: 8),
                      Text(name, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor), maxLines: 1, overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 2),
                      Text(exp, style: TextStyle(fontSize: 11, color: subColor)),
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text("Parent FAQs", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: textColor)),
            TextButton(
              onPressed: () => Get.to(() => const FaqSpeaxaView()),
              child: const Text("View All FAQs →", style: TextStyle(color: AppColors.parentRole, fontWeight: FontWeight.bold, fontSize: 13)),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkCard : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Q: How do I link my child's account?", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: textColor)),
              const SizedBox(height: 4),
              Text("A: Simply enter your child's 6-digit Student Code or email address in the Parent App dashboard to send a link authorization request.", style: TextStyle(fontSize: 12.5, color: subColor, height: 1.35)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFooterCTA(bool isDark) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkCard : Colors.grey.shade100,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
      ),
      child: Column(
        children: [
          const Text("Ready to Monitor Your Child's Progress?", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 6),
          Text("Join thousands of parents supporting interactive learning with Speaxa.", textAlign: TextAlign.center, style: TextStyle(fontSize: 12.5, color: Colors.grey.shade600)),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.parentRole,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              onPressed: () => Get.toNamed(Routes.REGISTER),
              child: const Text("Get Started Now", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ),
          ),
        ],
      ),
    );
  }
}
