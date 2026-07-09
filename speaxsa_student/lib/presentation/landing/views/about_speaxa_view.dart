import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/routes/app_routes.dart';

class AboutSpeaxaView extends StatelessWidget {
  const AboutSpeaxaView({super.key});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Image.asset(
              'assets/images/logo.png',
              height: 54,
              errorBuilder: (c, e, s) => const Icon(Icons.school, size: 48, color: AppColors.primary),
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: Text(
              "About ${AppConstants.appName}",
              style: Theme.of(context).textTheme.displayLarge?.copyWith(fontSize: 26, color: AppColors.primary, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 6),
          const Center(
            child: Text(
              "Bridging live education with complete academic transparency",
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey, fontSize: 13),
            ),
          ),
          const SizedBox(height: 28),

          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Our Mission", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary)),
                SizedBox(height: 8),
                Text(
                  "SPEAXA is designed to deliver high-quality tuition classes straight to your screen. By eliminating geographic boundaries, we bring the best subject experts from across the country directly to students of all levels.",
                  style: TextStyle(fontSize: 13.5, height: 1.5, color: AppColors.lightTextSecondary),
                ),
                SizedBox(height: 16),
                Text("Why Live Learning?", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                SizedBox(height: 6),
                Text(
                  "Unlike recorded videos, SPEAXA classes are 100% live. Students ask doubts instantly, write on interactive whiteboards, participate in polls, and build genuine learning discipline.",
                  style: TextStyle(fontSize: 13, height: 1.5, color: AppColors.lightTextSecondary),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          _buildPillarTile(
            context,
            icon: Icons.verified_user_outlined,
            title: "5-Step SOP Screening",
            desc: "Mentors pass camera, lighting, audio noise-cancellation, fiber speed, and demo lecture checks before onboarding.",
          ),
          _buildPillarTile(
            context,
            icon: Icons.analytics_outlined,
            title: "AI Growth Radar",
            desc: "Attendance gauges, homework submission rates, monthly progress report cards, and 7 observation metrics.",
          ),
          _buildPillarTile(
            context,
            icon: Icons.family_restroom_outlined,
            title: "Parent Transparency",
            desc: "Direct 1-on-1 messaging linking parents with child's subject teachers for complete academic alignment.",
          ),
          const SizedBox(height: 28),

          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () => Get.toNamed(Routes.LOGIN),
              child: const Text("Join Speaxa Today", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPillarTile(BuildContext context, {required IconData icon, required String title, required String desc}) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: AppColors.primary, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 4),
                  Text(desc, style: const TextStyle(color: Colors.grey, fontSize: 12.5, height: 1.4)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
