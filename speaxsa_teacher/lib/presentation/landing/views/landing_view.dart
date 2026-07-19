import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:get/get.dart';
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
      'icon': Icons.video_camera_front_rounded,
      'color': AppColors.teacherRole,
      'gradient': [Color(0xFF0D7A6D), Color(0xFF14B8A6)],
    },
    {
      'title': 'SOP Compliance Hub',
      'subtitle': 'Verify camera framing, headset noise-cancellation, internet speed, room lighting, and sign the digital teaching agreement to go live.',
      'icon': Icons.verified_user_rounded,
      'color': Color(0xFF0284C7),
      'gradient': [Color(0xFF0284C7), Color(0xFF38BDF8)],
    },
    {
      'title': 'Student Progress Radar',
      'subtitle': 'Assign worksheets, review student submissions, grade papers, and log 7-tier observation scores (Curiosity, Logic, Discipline).',
      'icon': Icons.analytics_rounded,
      'color': Color(0xFF8B5CF6),
      'gradient': [Color(0xFF8B5CF6), Color(0xFFA78BFA)],
    },
    {
      'title': 'Earnings & Milestones',
      'subtitle': 'Track wallet statements in real time, request payouts, refer fellow teachers, and unlock higher mentor milestones.',
      'icon': Icons.account_balance_wallet_rounded,
      'color': Color(0xFFF59E0B),
      'gradient': [Color(0xFFD4AF37), Color(0xFFF59E0B)],
    },
  ];

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(); // Continuous loop for rotating/bobbing animations
  }

  @override
  void dispose() {
    _animController.dispose();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // Background Decorative Gradients/Blobs
          Positioned(
            top: -120,
            left: -80,
            child: Container(
              width: 320,
              height: 320,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _onboardingData[_currentPage]['color'].withOpacity(0.06),
              ),
            ),
          ),
          Positioned(
            bottom: -150,
            right: -100,
            child: Container(
              width: 380,
              height: 380,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _onboardingData[_currentPage]['color'].withOpacity(0.04),
              ),
            ),
          ),

          // Main Layout Content
          SafeArea(
            child: Column(
              children: [
                // Top Header (Skip button & Logo placeholder)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Mini brand logo
                      Row(
                        children: [
                          Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.06),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                )
                              ],
                            ),
                            padding: const EdgeInsets.all(4),
                            child: Image.asset(
                              'assets/images/logo.png',
                              errorBuilder: (c, e, s) => const Icon(Icons.school, size: 20, color: AppColors.primary),
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            "SPEAXA MENTOR",
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF1E293B),
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                      // Skip Button
                      if (_currentPage < _onboardingData.length - 1)
                        TextButton(
                          onPressed: () => Get.offAllNamed(Routes.LOGIN, arguments: {'role': 'teacher'}),
                          style: TextButton.styleFrom(
                            foregroundColor: Colors.grey.shade600,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                            backgroundColor: Colors.grey.shade100,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(20),
                            ),
                          ),
                          child: const Text(
                            "Skip",
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                          ),
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
                    onPageChanged: (index) {
                      setState(() {
                        _currentPage = index;
                      });
                    },
                    itemCount: _onboardingData.length,
                    itemBuilder: (context, index) {
                      final item = _onboardingData[index];
                      final gradientColors = item['gradient'] as List<Color>;

                      return AnimatedBuilder(
                        animation: _animController,
                        builder: (context, child) {
                          // Bobbing floating offset (up and down by 10 pixels)
                          final double bobbingVal = math.sin(_animController.value * 2 * math.pi) * 10;
                          // Rotation angle for the outer decorative circle
                          final double rotationVal = _animController.value * 2 * math.pi;

                          return Center(
                            child: SingleChildScrollView(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 32.0),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    // Layered 3D-like Onboarding Illustration Card
                                    Stack(
                                      alignment: Alignment.center,
                                      children: [
                                        // 1. Rotating Outer Ring
                                        Transform.rotate(
                                          angle: rotationVal,
                                          child: Container(
                                            width: 200,
                                            height: 200,
                                            decoration: BoxDecoration(
                                              shape: BoxShape.circle,
                                              border: Border.all(
                                                color: item['color'].withOpacity(0.15),
                                                width: 2,
                                                style: BorderStyle.solid,
                                              ),
                                            ),
                                          ),
                                        ),
                                        // 2. Secondary orbiting circle
                                        Transform.rotate(
                                          angle: -rotationVal * 1.5,
                                          child: Transform.translate(
                                            offset: const Offset(90, 0),
                                            child: Container(
                                              width: 14,
                                              height: 14,
                                              decoration: BoxDecoration(
                                                shape: BoxShape.circle,
                                                color: item['color'].withOpacity(0.4),
                                              ),
                                            ),
                                          ),
                                        ),
                                        // 3. Central floating icon card
                                        Transform.translate(
                                          offset: Offset(0, bobbingVal),
                                          child: Container(
                                            width: 136,
                                            height: 136,
                                            decoration: BoxDecoration(
                                              shape: BoxShape.circle,
                                              gradient: LinearGradient(
                                                colors: gradientColors,
                                                begin: Alignment.topLeft,
                                                end: Alignment.bottomRight,
                                              ),
                                              boxShadow: [
                                                BoxShadow(
                                                  color: item['color'].withOpacity(0.3),
                                                  blurRadius: 24,
                                                  offset: const Offset(0, 12),
                                                ),
                                              ],
                                            ),
                                            alignment: Alignment.center,
                                            child: Icon(
                                              item['icon'] as IconData,
                                              size: 58,
                                              color: Colors.white,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 56),

                                    // Title
                                    Text(
                                      item['title'] as String,
                                      style: const TextStyle(
                                        fontSize: 25,
                                        fontWeight: FontWeight.w900,
                                        color: Color(0xFF1E293B),
                                        letterSpacing: -0.5,
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                    const SizedBox(height: 16),

                                    // Subtitle description
                                    Text(
                                      item['subtitle'] as String,
                                      style: TextStyle(
                                        fontSize: 13.5,
                                        color: Colors.grey.shade600,
                                        height: 1.55,
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      );
                    },
                  ),
                ),

                // Controls Footer
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 28.0),
                  child: Column(
                    children: [
                      // Smooth Custom Dot indicators
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(
                          _onboardingData.length,
                          (index) {
                            final isActive = _currentPage == index;
                            return AnimatedContainer(
                              duration: const Duration(milliseconds: 300),
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              width: isActive ? 24 : 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: isActive
                                    ? _onboardingData[_currentPage]['color'] as Color
                                    : Colors.grey.shade300,
                                borderRadius: BorderRadius.circular(4),
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 36),

                      // Animated CTA Button (changes background color to match active slide)
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: (_onboardingData[_currentPage]['color'] as Color).withOpacity(0.24),
                                blurRadius: 16,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _onboardingData[_currentPage]['color'] as Color,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
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
                                  _currentPage == _onboardingData.length - 1
                                      ? "Get Started"
                                      : "Continue",
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 0.2,
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
