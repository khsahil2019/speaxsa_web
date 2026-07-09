import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/storage_service.dart';
import '../widgets/custom_button.dart';

class ProfileView extends StatelessWidget {
  const ProfileView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("My Profile")),
      body: Obx(() {
        final user = AuthService.to.currentUser.value;
        final isDark = StorageService.to.isDarkMode();

        return SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Center(
                child: Stack(
                  children: [
                    CircleAvatar(
                      radius: 50,
                      backgroundColor: AppColors.primary.withOpacity(0.2),
                      child: Text(
                        user?.name.substring(0, 1).toUpperCase() ?? 'U',
                        style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: AppColors.primary),
                      ),
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                        child: const Icon(Icons.camera_alt, color: Colors.white, size: 18),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(user?.name ?? 'User Name', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              Text(user?.email ?? '', style: const TextStyle(color: Colors.grey)),
              const SizedBox(height: 8),
              Chip(
                label: Text(user?.role.toUpperCase() ?? 'USER'),
                backgroundColor: AppColors.primary.withOpacity(0.1),
                labelStyle: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 24),

              Card(
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(Icons.phone_outlined),
                      title: const Text("Phone"),
                      subtitle: Text(user?.phone ?? 'N/A'),
                    ),
                    const Divider(height: 1),
                    if (user?.role == 'student') ...[
                      ListTile(
                        leading: const Icon(Icons.qr_code),
                        title: const Text("Student Code"),
                        subtitle: Text(user?.studentCode ?? 'N/A'),
                      ),
                      const Divider(height: 1),
                      ListTile(
                        leading: const Icon(Icons.class_outlined),
                        title: const Text("Grade & Board"),
                        subtitle: Text("${user?.grade ?? 'N/A'} (${user?.board ?? 'N/A'})"),
                      ),
                    ] else if (user?.role == 'teacher') ...[
                      ListTile(
                        leading: const Icon(Icons.verified_user_outlined),
                        title: const Text("Teacher Level"),
                        subtitle: Text(user?.teacherLevel ?? 'Verified Mentor'),
                      ),
                      const Divider(height: 1),
                      ListTile(
                        leading: const Icon(Icons.card_giftcard),
                        title: const Text("Referral Code"),
                        subtitle: Text(user?.referralCode ?? 'N/A'),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 24),

              Card(
                child: SwitchListTile(
                  secondary: const Icon(Icons.dark_mode_outlined),
                  title: const Text("Dark Theme Mode"),
                  value: isDark,
                  onChanged: (val) {
                    StorageService.to.setDarkMode(val);
                    Get.changeThemeMode(val ? ThemeMode.dark : ThemeMode.light);
                  },
                ),
              ),
              const SizedBox(height: 32),

              CustomButton(
                text: 'Logout Account',
                isSecondary: true,
                onPressed: () => AuthService.to.logout(),
              ),
            ],
          ),
        );
      }),
    );
  }
}
