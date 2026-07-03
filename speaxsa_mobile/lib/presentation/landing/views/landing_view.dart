import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/routes/app_routes.dart';
import '../controllers/landing_controller.dart';

class LandingView extends StatefulWidget {
  const LandingView({super.key});

  @override
  State<LandingView> createState() => _LandingViewState();
}

class _LandingViewState extends State<LandingView> {
  final LandingController controller = Get.put(LandingController());
  final RxInt _selectedFeatureTab = 0.obs;
  final RxInt _expandedFaqIndex = (-1).obs;

  final List<Map<String, dynamic>> _features = [
    {
      'title': 'Live Interactive Classes',
      'subtitle': '90-min HD WebRTC sessions with live polls & instant doubt resolution',
      'icon': Icons.video_camera_front_rounded,
      'color': AppColors.primary,
      'overview': 'At Speaxsa, live classes are not just passive broadcasts. Our classrooms are fully interactive spaces featuring digital whiteboards, live polls, real-time feedback, and instant doubt resolution.',
      'capabilities': [
        'Low-latency HD WebRTC video & audio streaming.',
        'Interactive live polls with instant percentage results.',
        'Dedicated Q&A queue with real-time mentor answers.',
        'Auto-generated HD session recordings within 2 hours.'
      ],
    },
    {
      'title': 'Digital Whiteboard Studio',
      'subtitle': 'Real-time graph, geometry & formula canvas',
      'icon': Icons.draw_rounded,
      'color': Color(0xFF0284C7),
      'overview': 'Our interactive vector canvas enables teachers to render mathematical equations, physics diagrams, and organic chemistry mechanisms with crystal clarity.',
      'capabilities': [
        'Dual-user simultaneous drawing capabilities.',
        'High-resolution vector export directly to PDF.',
        'Pre-loaded math, geometry, and circuit diagram tools.'
      ],
    },
    {
      'title': 'Smart PDF Notes',
      'subtitle': 'Instant post-session chapter workbooks & formulas',
      'icon': Icons.menu_book_rounded,
      'color': Color(0xFF10B981),
      'overview': 'Every session automatically generates structured handwritten notes, formula cheat-sheets, and chapter workbooks accessible for offline study.',
      'capabilities': [
        'Offline PDF download inside the mobile app.',
        'Chapter-wise searchable formula index.',
        'Handwritten step-by-step mentor solution keys.'
      ],
    },
    {
      'title': 'AI Doubt Copilot',
      'subtitle': '24/7 instant math & science step-by-step solver',
      'icon': Icons.psychology_rounded,
      'color': Color(0xFFF59E0B),
      'overview': 'Stuck on a homework question at night? Snap a photo or type your query into Speaxsa AI Copilot for immediate step-by-step guidance.',
      'capabilities': [
        'Instant step-by-step equation breakdown.',
        'Multi-lingual explanation (English, Hindi, Hinglish).',
        'Direct escalation to live human SOP mentors.'
      ],
    },
    {
      'title': 'Parent Growth Radar',
      'subtitle': 'Real-time attendance, test score & behavior analytics',
      'icon': Icons.analytics_rounded,
      'color': Color(0xFF8B5CF6),
      'overview': 'Comprehensive academic transparency linking parents with teachers. Track attendance, monthly test radar, homework submission rates, and teacher feedback.',
      'capabilities': [
        'Real-time class entrance & exit timestamps.',
        '7-tier observation scores (Curiosity, Logic, Discipline).',
        'Direct 1-on-1 parent-teacher chat room.'
      ],
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 4,
        icon: const Icon(Icons.smart_toy_rounded, size: 20),
        label: const Text("AI Copilot", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        onPressed: () => _showAiCopilotModal(context),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── 1. Top Navigation Bar ──────────────────────────────────────────────
              Obx(() {
                final platformName = controller.adminSettings['platform_name'] ?? AppConstants.appName;
                final liveClassesCount = controller.platformStats['classesCompleted'] ?? 12;

                return Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 12, offset: const Offset(0, 4))
                            ],
                          ),
                          padding: const EdgeInsets.all(6),
                          child: Image.asset(
                            'assets/images/logo.png',
                            errorBuilder: (c, e, s) => const Icon(Icons.school, size: 28, color: AppColors.primary),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              platformName,
                              style: Theme.of(context).textTheme.displayLarge?.copyWith(
                                    fontSize: 22,
                                    color: AppColors.lightTextPrimary,
                                    fontWeight: FontWeight.w900,
                                  ),
                            ),
                            Row(
                              children: [
                                Container(
                                  width: 7,
                                  height: 7,
                                  decoration: const BoxDecoration(color: AppColors.success, shape: BoxShape.circle),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  "$liveClassesCount Batches Managed",
                                  style: const TextStyle(fontSize: 10.5, color: AppColors.primary, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        elevation: 2,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () => Get.toNamed(Routes.LOGIN),
                      child: const Text("Sign In", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    ),
                  ],
                );
              }),
              const SizedBox(height: 20),

              // ── 2. Hero Banner Card (Dynamic Admin Settings) ───────────────────────
              Obx(() {
                final announcement = controller.adminSettings['announcement'] ?? "India's Affordable Learning Network";
                final teacherCount = controller.platformStats['teachers'] ?? 500;
                final studentCount = controller.platformStats['students'] ?? 10000;
                final courseCount = controller.platformStats['courses'] ?? 100;

                return Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    gradient: AppColors.heroGradient,
                    borderRadius: BorderRadius.circular(28),
                    boxShadow: [
                      BoxShadow(color: AppColors.primary.withValues(alpha: 0.35), blurRadius: 20, offset: const Offset(0, 8))
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.white30),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.campaign_rounded, color: AppColors.warning, size: 16),
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                announcement,
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11.5),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        "Welcome to the Speaxsa\nAdministrator & Learning Portal!",
                        style: TextStyle(color: Colors.white, fontSize: 25, fontWeight: FontWeight.w900, height: 1.25),
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        "Premium education made affordable for every student across India.",
                        style: TextStyle(color: Colors.white70, fontSize: 13.5, height: 1.4),
                      ),
                      const SizedBox(height: 18),

                      // Live Stats Badges from Admin DB
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _buildHeroBadge(Icons.verified_rounded, "$teacherCount+ Teachers", AppColors.warning),
                            const SizedBox(width: 14),
                            _buildHeroBadge(Icons.groups_rounded, "$studentCount+ Students", Colors.white),
                            const SizedBox(width: 14),
                            _buildHeroBadge(Icons.video_camera_front_rounded, "$courseCount+ Live Batches", Colors.white),
                          ],
                        ),
                      ),
                      const SizedBox(height: 22),

                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white.withValues(alpha: 0.22),
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            side: const BorderSide(color: Colors.white54, width: 1.2),
                          ),
                          icon: const Icon(Icons.rocket_launch_rounded, size: 18),
                          label: const Text("Start Learning Now", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                          onPressed: () => Get.toNamed(Routes.LOGIN, arguments: {'role': 'student'}),
                        ),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            side: const BorderSide(color: Colors.white60, width: 1.5),
                          ),
                          onPressed: () => Get.toNamed(Routes.LOGIN, arguments: {'role': 'teacher'}),
                          child: const Text("Explore SOP Teachers", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 32),

              // ── 3. Quick Portals Section ───────────────────────────────────────────
              const Text("Quick Portals", style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
              const SizedBox(height: 4),
              const Text("Direct access to your personalized role dashboard", style: TextStyle(color: Colors.grey, fontSize: 13)),
              const SizedBox(height: 16),

              _buildRoleCard(
                context,
                title: "Student Portal",
                description: "Access online live lectures, practice sheets, recordings, and AI Study Copilot.",
                icon: Icons.school_rounded,
                color: AppColors.primary,
                onTap: () => Get.toNamed(Routes.LOGIN, arguments: {'role': 'student'}),
              ),
              const SizedBox(height: 14),

              _buildRoleCard(
                context,
                title: "Teacher Workspace",
                description: "Manage batches, publish modules, schedule live classes, and track wallet earnings.",
                icon: Icons.assignment_ind_rounded,
                color: AppColors.primary,
                onTap: () => Get.toNamed(Routes.LOGIN, arguments: {'role': 'teacher'}),
              ),
              const SizedBox(height: 14),

              _buildRoleCard(
                context,
                title: "Parent Portal",
                description: "Track child attendance, view test performance, and message teachers directly.",
                icon: Icons.family_restroom_rounded,
                color: AppColors.parentRole,
                onTap: () => Get.toNamed(Routes.LOGIN, arguments: {'role': 'parent'}),
              ),
              const SizedBox(height: 36),

              // ── 4. Interactive Feature Showcase ───────────────────────────────────
              const Text("The Learning Experience", style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
              const SizedBox(height: 4),
              const Text("Explore the core technology driving Speaxsa classrooms", style: TextStyle(color: Colors.grey, fontSize: 13)),
              const SizedBox(height: 16),

              // Horizontal Feature Selector Tabs
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Obx(() => Row(
                  children: List.generate(_features.length, (index) {
                    final isSelected = _selectedFeatureTab.value == index;
                    final feature = _features[index];
                    return GestureDetector(
                      onTap: () => _selectedFeatureTab.value = index,
                      child: Container(
                        margin: const EdgeInsets.only(right: 10),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.primary : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: isSelected ? AppColors.primary : Colors.grey.shade200),
                          boxShadow: isSelected
                              ? [BoxShadow(color: AppColors.primary.withValues(alpha: 0.25), blurRadius: 8, offset: const Offset(0, 3))]
                              : [],
                        ),
                        child: Row(
                          children: [
                            Icon(feature['icon'] as IconData, size: 18, color: isSelected ? Colors.white : AppColors.primary),
                            const SizedBox(width: 8),
                            Text(
                              feature['title'] as String,
                              style: TextStyle(
                                color: isSelected ? Colors.white : AppColors.lightTextPrimary,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                )),
              ),
              const SizedBox(height: 16),

              // Active Feature Preview Display Card
              Obx(() {
                final feature = _features[_selectedFeatureTab.value];
                return Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 14, offset: const Offset(0, 6))
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.rolePillBg,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Icon(feature['icon'] as IconData, color: AppColors.primary, size: 28),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(feature['title'] as String, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
                                const SizedBox(height: 2),
                                Text(feature['subtitle'] as String, style: const TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        feature['overview'] as String,
                        style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 13.5, height: 1.5),
                      ),
                      const SizedBox(height: 18),

                      const Text("Key Capabilities:", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      const SizedBox(height: 10),

                      ...(feature['capabilities'] as List<String>).map((cap) => Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 18),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    cap,
                                    style: const TextStyle(fontSize: 13, height: 1.35, color: AppColors.lightTextPrimary),
                                  ),
                                ),
                              ],
                            ),
                          )),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 36),

              // ── 5. Built for Parents Who Care ──────────────────────────────────────
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: Colors.grey.shade200),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppColors.rolePillBg,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.family_restroom_rounded, color: AppColors.primary, size: 24),
                        ),
                        const SizedBox(width: 14),
                        const Expanded(
                          child: Text(
                            "Built for Parents Who Care",
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      "Real-time attendance tracking, AI behavioral insights, test performance analytics, and teacher feedback — all in one premium dashboard.",
                      style: TextStyle(color: AppColors.lightTextSecondary, fontSize: 13.5, height: 1.5),
                    ),
                    const SizedBox(height: 18),

                    // Parent Radar Meters Preview
                    _buildParentMeter("Class Attendance Rate", 0.96, "96% Present"),
                    const SizedBox(height: 10),
                    _buildParentMeter("Monthly Concept Mastery", 0.92, "92% Score"),
                    const SizedBox(height: 18),

                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        _buildPillTag("Attendance Tracking"),
                        _buildPillTag("Performance Radar"),
                        _buildPillTag("AI Reports"),
                        _buildPillTag("Teacher Direct Chat"),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 36),

              // ── 6. Live Featured Batches (Configured from Admin Panel) ─────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: const [
                  Text("Live Featured Batches", style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                  Text("speaxa.in", style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 13)),
                ],
              ),
              const SizedBox(height: 12),

              Obx(() {
                final courses = controller.liveCourses;
                final displayList = courses.isNotEmpty
                    ? courses.map((e) => Map<String, dynamic>.from(e as Map)).toList()
                    : [
                        {
                          'title': 'Class 10 CBSE Physics Mastery',
                          'subject': 'Physics',
                          'class_level': 'Class 10',
                          'price': 999,
                          'teacher_name': 'Dr. Vikram Seth',
                          'description': 'Light, Electricity, and Magnetic Effects with interactive poll quizzes.'
                        },
                        {
                          'title': 'Class 12 Organic Chemistry',
                          'subject': 'Chemistry',
                          'class_level': 'Class 12',
                          'price': 1299,
                          'teacher_name': 'Prof. Ananya Roy',
                          'description': 'Reaction mechanisms, synthetic pathways, and board question practice.'
                        },
                      ];

                return Column(
                  children: displayList.map((c) => Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 10, offset: const Offset(0, 4))
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.rolePillBg,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(Icons.video_library_rounded, color: AppColors.primary, size: 24),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(c['title'] ?? 'Live Batch', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14.5), maxLines: 1, overflow: TextOverflow.ellipsis),
                              const SizedBox(height: 4),
                              Text("By ${c['teacher_name'] ?? 'SOP Mentor'} • ₹${c['price'] ?? 999}/mo", style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 12)),
                            ],
                          ),
                        ),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          ),
                          onPressed: () => Get.toNamed(Routes.LOGIN),
                          child: const Text("Enroll", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                        ),
                      ],
                    ),
                  )).toList(),
                );
              }),

              const SizedBox(height: 36),

              // ── 7. Frequently Asked Questions Accordion ─────────────────────────────
              const Text("Frequently Asked Questions", style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
              const SizedBox(height: 4),
              const Text("Common questions about live classes & parent dashboards", style: TextStyle(color: Colors.grey, fontSize: 13)),
              const SizedBox(height: 16),

              _buildFaqAccordion(0, "How do students join a live class room?", "Students log into their dashboard, navigate to 'My Batches', and tap 'Join Class'. The interactive live video room opens directly inside the app with video, audio, whiteboard, and chat support."),
              _buildFaqAccordion(1, "What parameters does the parent dashboard track?", "The parent portal visualizes real-time attendance (Present, Late, Absent), graded test scores, monthly progress reports, and 7 teacher-graded observation scores."),
              _buildFaqAccordion(2, "How are teachers verified through SOP?", "Before teaching, mentors undergo a 5-step Quality Audit (Camera framing, Audio noise cancellation, Internet speed proof, Backdrop lighting, and a 10-minute demo lecture)."),

              const SizedBox(height: 36),

              // ── 8. Support Helpline Card (Bound to Admin Settings) ─────────────────
              Obx(() {
                final phone = controller.adminSettings['support_phone'] ?? "1800-120-456-456";
                final email = controller.adminSettings['support_email'] ?? "support@speaxa.in";
                final platformName = controller.adminSettings['platform_name'] ?? AppConstants.appName;

                return Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 4))
                    ],
                  ),
                  child: Column(
                    children: [
                      Image.asset('assets/images/logo.png', height: 44, errorBuilder: (c, e, s) => const Icon(Icons.school, size: 36, color: AppColors.primary)),
                      const SizedBox(height: 10),
                      Text(platformName, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: AppColors.primary)),
                      const SizedBox(height: 4),
                      Text("Helpline: $phone", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.lightTextPrimary)),
                      const SizedBox(height: 2),
                      Text("Email: $email", style: const TextStyle(color: Colors.grey, fontSize: 12)),
                      const SizedBox(height: 18),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          onPressed: () => Get.toNamed(Routes.LOGIN),
                          child: const Text("Get Started Today", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
                        ),
                      ),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeroBadge(IconData icon, String text, Color iconColor) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: iconColor, size: 16),
        const SizedBox(width: 4),
        Text(text, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
      ],
    );
  }

  Widget _buildRoleCard(
    BuildContext context, {
    required String title,
    required String description,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 10, offset: const Offset(0, 4))
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: AppColors.rolePillBg,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: color, size: 26),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Text(
                        description,
                        style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 12.5, height: 1.4),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(Icons.chevron_right_rounded, size: 24, color: Colors.grey),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildParentMeter(String label, double val, String trailingText) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
            Text(trailingText, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary)),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: LinearProgressIndicator(
            value: val,
            minHeight: 8,
            backgroundColor: AppColors.rolePillBg,
            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
          ),
        ),
      ],
    );
  }

  Widget _buildPillTag(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.lightBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.lightTextPrimary),
      ),
    );
  }

  Widget _buildFaqAccordion(int index, String q, String a) {
    return Obx(() {
      final isExpanded = _expandedFaqIndex.value == index;
      return Card(
        margin: const EdgeInsets.only(bottom: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _expandedFaqIndex.value = isExpanded ? -1 : index,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(child: Text(q, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14))),
                    Icon(isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down, color: AppColors.primary),
                  ],
                ),
                if (isExpanded) ...[
                  const SizedBox(height: 10),
                  const Divider(height: 1),
                  const SizedBox(height: 10),
                  Text(a, style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 13, height: 1.5)),
                ],
              ],
            ),
          ),
        ),
      );
    });
  }

  void _showAiCopilotModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: const [
                      Icon(Icons.smart_toy_outlined, color: AppColors.primary, size: 26),
                      SizedBox(width: 10),
                      Text("Speaxsa AI Copilot", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Get.back()),
                ],
              ),
              const SizedBox(height: 12),
              const Text("Ask any doubt or query about courses, admissions, or study material:", style: TextStyle(color: Colors.grey, fontSize: 13)),
              const SizedBox(height: 16),
              TextField(
                decoration: InputDecoration(
                  hintText: "e.g., How do I enroll in Class 10 Physics?",
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                  prefixIcon: const Icon(Icons.search_rounded),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: () {
                    Get.back();
                    Get.snackbar("AI Copilot", "Welcome to Speaxsa! Sign in to start asking live doubts.", backgroundColor: AppColors.primary, colorText: Colors.white);
                  },
                  child: const Text("Ask AI Assistant", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
