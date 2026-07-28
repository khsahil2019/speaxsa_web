import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/routes/app_routes.dart';

class LandingView extends StatefulWidget {
  const LandingView({super.key});

  @override
  State<LandingView> createState() => _LandingViewState();
}

class _LandingViewState extends State<LandingView> with SingleTickerProviderStateMixin {
  final PageController _pageController = PageController();
  int _currentPage = 0;
  late AnimationController _animController;

  final List<Map<String, dynamic>> _onboardingData = [
    {
      'title': 'Interactive Live Classes',
      'subtitle': 'Conduct live WebRTC classes, write on the vector digital whiteboard, launch real-time student polls, and clear doubts instantly.',
      'badge': '✨ WebRTC Live Classroom',
      'icon': Icons.video_camera_front_rounded,
      'color': AppColors.primary,
      'gradient': [Color(0xFF0F766E), Color(0xFF14B8A6)],
    },
    {
      'title': 'SOP Compliance Hub',
      'subtitle': 'Verify camera framing, headset noise-cancellation, internet speed, room lighting, and sign the digital teaching agreement to go live.',
      'badge': '🛡️ SOP 6-Step Certified',
      'icon': Icons.verified_user_rounded,
      'color': Color(0xFF0284C7),
      'gradient': [Color(0xFF0284C7), Color(0xFF38BDF8)],
    },
    {
      'title': 'Student Progress Radar',
      'subtitle': 'Assign worksheets, review student submissions, grade papers, and log 7-tier observation scores (Curiosity, Logic, Discipline).',
      'badge': '📊 7-Tier Observation',
      'icon': Icons.analytics_rounded,
      'color': Color(0xFF7C3AED),
      'gradient': [Color(0xFF7C3AED), Color(0xFFA78BFA)],
    },
    {
      'title': 'Earnings & Milestones',
      'subtitle': 'Track wallet statements in real time, request payouts, refer fellow teachers, and unlock higher mentor milestones.',
      'badge': '💰 Real-time Digital Passbook',
      'icon': Icons.account_balance_wallet_rounded,
      'color': Color(0xFFD97706),
      'gradient': [Color(0xFFD97706), Color(0xFFF59E0B)],
    },
  ];

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();
  }

  @override
  void dispose() {
    _animController.dispose();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final activeColor = _onboardingData[_currentPage]['color'] as Color;

    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // Dynamic Background Glow Blobs
          Positioned(
            top: -120,
            left: -80,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 500),
              width: 320,
              height: 320,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: activeColor.withOpacity(0.08),
              ),
            ),
          ),
          Positioned(
            bottom: -150,
            right: -100,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 500),
              width: 380,
              height: 380,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: activeColor.withOpacity(0.05),
              ),
            ),
          ),

          // Main Screen Layout
          SafeArea(
            child: Column(
              children: [
                // Top Header (Logo & Skip)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 8, offset: const Offset(0, 2)),
                              ],
                            ),
                            padding: const EdgeInsets.all(5),
                            child: Image.asset(
                              'assets/images/logo.png',
                              errorBuilder: (c, e, s) => const Icon(Icons.school_rounded, size: 22, color: AppColors.primary),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            "SPEAXA MENTOR",
                            style: GoogleFonts.outfit(
                              fontSize: 15,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF0F172A),
                              letterSpacing: 0.8,
                            ),
                          ),
                        ],
                      ),
                      if (_currentPage < _onboardingData.length - 1)
                        TextButton(
                          onPressed: () => Get.offAllNamed(Routes.LOGIN, arguments: {'role': 'teacher'}),
                          style: TextButton.styleFrom(
                            foregroundColor: Colors.grey.shade700,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            backgroundColor: Colors.grey.shade100,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          ),
                          child: Text("Skip", style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.bold)),
                        )
                      else
                        const SizedBox(height: 32),
                    ],
                  ),
                ),

                // Sliders PageView
                Expanded(
                  child: PageView.builder(
                    controller: _pageController,
                    onPageChanged: (index) => setState(() => _currentPage = index),
                    itemCount: _onboardingData.length,
                    itemBuilder: (context, index) {
                      final item = _onboardingData[index];
                      final gradientColors = item['gradient'] as List<Color>;

                      return AnimatedBuilder(
                        animation: _animController,
                        builder: (context, child) {
                          final double bobbingVal = math.sin(_animController.value * 2 * math.pi) * 8;
                          final double rotationVal = _animController.value * 2 * math.pi;

                          return Center(
                            child: SingleChildScrollView(
                              padding: const EdgeInsets.symmetric(horizontal: 28),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  // Floating Badge Pill
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: (item['color'] as Color).withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(color: (item['color'] as Color).withOpacity(0.2)),
                                    ),
                                    child: Text(
                                      item['badge'] as String,
                                      style: GoogleFonts.outfit(
                                        color: item['color'] as Color,
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 28),

                                  // Layered 3D Floating Icon Showcase
                                  Stack(
                                    alignment: Alignment.center,
                                    children: [
                                      // Rotating Ring
                                      Transform.rotate(
                                        angle: rotationVal,
                                        child: Container(
                                          width: 210,
                                          height: 210,
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                            border: Border.all(
                                              color: (item['color'] as Color).withOpacity(0.18),
                                              width: 2,
                                            ),
                                          ),
                                        ),
                                      ),
                                      // Orbiting Dot
                                      Transform.rotate(
                                        angle: -rotationVal * 1.4,
                                        child: Transform.translate(
                                          offset: const Offset(95, 0),
                                          child: Container(
                                            width: 14,
                                            height: 14,
                                            decoration: BoxDecoration(
                                              shape: BoxShape.circle,
                                              color: item['color'] as Color,
                                            ),
                                          ),
                                        ),
                                      ),
                                      // Center Floating Icon Container
                                      Transform.translate(
                                        offset: Offset(0, bobbingVal),
                                        child: Container(
                                          width: 140,
                                          height: 140,
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                            gradient: LinearGradient(
                                              colors: gradientColors,
                                              begin: Alignment.topLeft,
                                              end: Alignment.bottomRight,
                                            ),
                                            boxShadow: [
                                              BoxShadow(
                                                color: (item['color'] as Color).withOpacity(0.35),
                                                blurRadius: 28,
                                                offset: const Offset(0, 14),
                                              ),
                                            ],
                                          ),
                                          alignment: Alignment.center,
                                          child: Icon(
                                            item['icon'] as IconData,
                                            size: 60,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 44),

                                  // Title
                                  Text(
                                    item['title'] as String,
                                    style: GoogleFonts.outfit(
                                      fontSize: 24,
                                      fontWeight: FontWeight.bold,
                                      color: const Color(0xFF0F172A),
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                  const SizedBox(height: 12),

                                  // Subtitle
                                  Text(
                                    item['subtitle'] as String,
                                    style: GoogleFonts.plusJakartaSans(
                                      fontSize: 13.5,
                                      color: Colors.grey.shade600,
                                      height: 1.55,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      );
                    },
                  ),
                ),

                // Footer Controls (Indicators & Primary CTA)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
                  child: Column(
                    children: [
                      // Page Indicators
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(
                          _onboardingData.length,
                          (index) {
                            final isActive = _currentPage == index;
                            return AnimatedContainer(
                              duration: const Duration(milliseconds: 300),
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              width: isActive ? 28 : 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: isActive ? activeColor : Colors.grey.shade300,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 28),

                      // CTA Action Button
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: activeColor.withOpacity(0.3),
                                blurRadius: 16,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: activeColor,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                            onPressed: () {
                              if (_currentPage < _onboardingData.length - 1) {
                                _pageController.nextPage(
                                  duration: const Duration(milliseconds: 400),
                                  curve: Curves.easeInOut,
                                );
                              } else {
                                Get.offAllNamed(Routes.LOGIN, arguments: {'role': 'teacher'});
                              }
                            },
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  _currentPage == _onboardingData.length - 1 ? "Get Started 🚀" : "Continue",
                                  style: GoogleFonts.outfit(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const Icon(Icons.arrow_forward_rounded, size: 18),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
