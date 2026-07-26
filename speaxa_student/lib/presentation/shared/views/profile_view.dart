import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/auth_service.dart';
import '../../../data/models/user_model.dart';

class ProfileView extends StatefulWidget {
  final bool isEmbedded;
  const ProfileView({super.key, this.isEmbedded = false});

  @override
  State<ProfileView> createState() => _ProfileViewState();
}

class _ProfileViewState extends State<ProfileView> {
  bool _isUploadingAvatar = false;

  Future<void> _pickAndUploadAvatar() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery, maxWidth: 512, maxHeight: 512, imageQuality: 80);
    if (picked == null) return;

    setState(() => _isUploadingAvatar = true);
    try {
      final apiClient = Get.find<ApiClient>();
      final response = await apiClient.uploadFile(
        ApiEndpoints.uploadAvatar,
        picked.path,
        fieldName: 'avatar',
      );
      if (response != null && response['user'] != null) {
        final updatedUser = UserModel.fromJson(response['user']);
        AuthService.to.updateUserProfile(updatedUser);
        Get.snackbar('Success', 'Profile photo updated!', backgroundColor: AppColors.primary, colorText: Colors.white);
      }
    } catch (e) {
      Get.snackbar('Error', e.toString(), backgroundColor: Colors.red, colorText: Colors.white);
    } finally {
      setState(() => _isUploadingAvatar = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final content = Obx(() {
      final user = AuthService.to.currentUser.value;
      return SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // ── Profile Header Card ────────────────────────────
            _buildProfileHeaderCard(user),
            const SizedBox(height: 20),

            // ── Profile Settings / Navigation Card ──────────────
            _buildProfileSettingsCard(),
            const SizedBox(height: 20),

            // ── Logout Button ──────────────────────────────────
            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red,
                  side: const BorderSide(color: Colors.red),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.logout, size: 20),
                label: const Text("Logout Account", style: TextStyle(fontWeight: FontWeight.bold)),
                onPressed: () => AuthService.to.logout(),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      );
    });

    if (widget.isEmbedded) {
      return Scaffold(
        backgroundColor: AppColors.lightBg,
        body: content,
      );
    }

    return Scaffold(
      backgroundColor: AppColors.lightBg,
      appBar: AppBar(title: const Text("My Profile")),
      body: content,
    );
  }

  Widget _buildProfileHeaderCard(UserModel? user) {
    final baseUrl = ApiEndpoints.baseUrl.replaceAll('/api', '');
    final hasPhoto = user?.photoUrl != null && user!.photoUrl!.isNotEmpty && user.photoUrl != 'null';

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          // Top teal accent bar
          Container(
            height: 6,
            decoration: const BoxDecoration(
              color: AppColors.primary,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(20),
                topRight: Radius.circular(20),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
            child: Column(
              children: [
                // Profile Avatar with upload tap
                GestureDetector(
                  onTap: _isUploadingAvatar ? null : _pickAndUploadAvatar,
                  child: Stack(
                    children: [
                      CircleAvatar(
                        radius: 52,
                        backgroundColor: AppColors.primary.withOpacity(0.12),
                        backgroundImage: hasPhoto ? NetworkImage('$baseUrl${user!.photoUrl}') : null,
                        child: _isUploadingAvatar
                            ? const SizedBox(width: 28, height: 28, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
                            : !hasPhoto
                                ? Text(
                                    user?.name.substring(0, 1).toUpperCase() ?? 'U',
                                    style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: AppColors.primary),
                                  )
                                : null,
                      ),
                      Positioned(
                        bottom: 2,
                        right: 2,
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                          child: const Icon(Icons.camera_alt, color: Colors.white, size: 14),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                // Online status dot
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(color: AppColors.success, shape: BoxShape.circle),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Name
                Text(
                  user?.name ?? 'Student',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.lightTextPrimary),
                ),
                const SizedBox(height: 6),

                // Role badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.school_rounded, size: 14, color: AppColors.primary),
                      const SizedBox(width: 4),
                      Text(
                        "Student Portal",
                        style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Streak badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.local_fire_department, color: Colors.orangeAccent, size: 20),
                      const SizedBox(width: 6),
                      Text(
                        "${user?.learningStreak ?? 0} Day Streak",
                        style: const TextStyle(color: Colors.deepOrange, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                Text("Keep learning to build your streak!", style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
                const SizedBox(height: 16),

                // Student Code
                const Text("Student Unique Code", style: TextStyle(color: Colors.grey, fontSize: 12)),
                const SizedBox(height: 6),
                GestureDetector(
                  onTap: () {
                    if (user?.studentCode != null) {
                      Clipboard.setData(ClipboardData(text: user!.studentCode!));
                      Get.snackbar('Copied', 'Student code copied to clipboard!', backgroundColor: AppColors.primary, colorText: Colors.white, snackPosition: SnackPosition.BOTTOM);
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          user?.studentCode ?? 'Pending',
                          style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5),
                        ),
                        const SizedBox(width: 6),
                        const Icon(Icons.copy_rounded, size: 14, color: AppColors.primary),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Info rows
                const Divider(),
                const SizedBox(height: 10),
                _buildInfoRow(Icons.school_outlined, "Academic Level", "${user?.grade ?? 'N/A'} (${user?.board ?? 'N/A'})"),
                const SizedBox(height: 10),
                _buildInfoRow(Icons.email_outlined, "Email Address", user?.email ?? 'N/A'),
                const SizedBox(height: 10),
                _buildInfoRow(Icons.phone_outlined, "Phone Number", user?.phone ?? 'N/A'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.primary),
        const SizedBox(width: 10),
        Text("$label: ", style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
        Expanded(
          child: Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13), overflow: TextOverflow.ellipsis),
        ),
      ],
    );
  }

  Widget _buildProfileSettingsCard() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.only(topLeft: Radius.circular(20), topRight: Radius.circular(20))),
            leading: const Icon(Icons.person_outline, color: Colors.blueAccent),
            title: const Text("Edit Student Profile", style: TextStyle(fontWeight: FontWeight.w600)),
            subtitle: const Text("Update name, phone, class, and board", style: TextStyle(fontSize: 12, color: Colors.grey)),
            trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16, color: Colors.grey),
            onTap: () => Get.to(() => const EditProfileView()),
          ),
          const Divider(height: 1, indent: 20, endIndent: 20),
          ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.only(bottomLeft: Radius.circular(20), bottomRight: Radius.circular(20))),
            leading: const Icon(Icons.lock_outline, color: Colors.orangeAccent),
            title: const Text("Change Security Password", style: TextStyle(fontWeight: FontWeight.w600)),
            subtitle: const Text("Update your login password", style: TextStyle(fontSize: 12, color: Colors.grey)),
            trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16, color: Colors.grey),
            onTap: () => Get.to(() => const ChangePasswordView()),
          ),
        ],
      ),
    );
  }
}

class EditProfileView extends StatefulWidget {
  const EditProfileView({super.key});

  @override
  State<EditProfileView> createState() => _EditProfileViewState();
}

class _EditProfileViewState extends State<EditProfileView> {
  late TextEditingController _nameCtrl;
  late TextEditingController _phoneCtrl;
  String? _selectedGrade;
  String? _selectedBoard;
  bool _isSaving = false;

  final List<String> _grades = [
    'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
    'Class 11', 'Class 12',
  ];
  final List<String> _boards = ['CBSE', 'ICSE', 'State Board'];

  @override
  void initState() {
    super.initState();
    final user = AuthService.to.currentUser.value;
    _nameCtrl = TextEditingController(text: user?.name ?? '');
    _phoneCtrl = TextEditingController(text: user?.phone ?? '');
    _selectedGrade = user?.grade;
    _selectedBoard = user?.board;
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (_nameCtrl.text.trim().isEmpty || _phoneCtrl.text.trim().isEmpty) {
      Get.snackbar('Error', 'Name and Phone fields are required', backgroundColor: Colors.orange, colorText: Colors.white);
      return;
    }
    setState(() => _isSaving = true);
    try {
      final apiClient = Get.find<ApiClient>();
      final data = <String, dynamic>{};
      data['name'] = _nameCtrl.text.trim();
      data['phone'] = _phoneCtrl.text.trim();
      if (_selectedGrade != null) data['grade'] = _selectedGrade;
      if (_selectedBoard != null) data['board'] = _selectedBoard;

      final response = await apiClient.put(ApiEndpoints.profile, data: data);
      if (response != null && response['user'] != null) {
        final updatedUser = UserModel.fromJson(response['user']);
        AuthService.to.updateUserProfile(updatedUser);
        Get.snackbar('Saved', 'Profile updated successfully!', backgroundColor: AppColors.primary, colorText: Colors.white);
        Get.back();
      }
    } catch (e) {
      Get.snackbar('Error', e.toString(), backgroundColor: Colors.red, colorText: Colors.white);
    } finally {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A);

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
      appBar: AppBar(
        title: const Text("Edit Profile", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        elevation: 0,
        backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
        foregroundColor: textColor,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Profile Details",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              "Update your personal academic details.",
              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            ),
            const SizedBox(height: 24),
            Text(
              "Full Name",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _nameCtrl,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.person_outline, size: 18),
                hintText: "Enter your full name",
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              "Phone Number",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.phone_outlined, size: 18),
                hintText: "Enter your phone number",
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              "Grade / Class",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade300),
                borderRadius: BorderRadius.circular(12),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _grades.contains(_selectedGrade) ? _selectedGrade : null,
                  isExpanded: true,
                  items: _grades.map((String val) {
                    return DropdownMenuItem<String>(
                      value: val,
                      child: Text(val),
                    );
                  }).toList(),
                  onChanged: (val) {
                    setState(() {
                      _selectedGrade = val;
                    });
                  },
                ),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              "Syllabus Board",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade300),
                borderRadius: BorderRadius.circular(12),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _boards.contains(_selectedBoard) ? _selectedBoard : null,
                  isExpanded: true,
                  items: _boards.map((String val) {
                    return DropdownMenuItem<String>(
                      value: val,
                      child: Text(val),
                    );
                  }).toList(),
                  onChanged: (val) {
                    setState(() {
                      _selectedBoard = val;
                    });
                  },
                ),
              ),
            ),
            const SizedBox(height: 28),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: _isSaving
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.save_outlined, size: 20),
                label: Text(
                  _isSaving ? "Saving..." : "Save Changes",
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                onPressed: _isSaving ? null : _saveProfile,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ChangePasswordView extends StatefulWidget {
  const ChangePasswordView({super.key});

  @override
  State<ChangePasswordView> createState() => _ChangePasswordViewState();
}

class _ChangePasswordViewState extends State<ChangePasswordView> {
  final _currentPassCtrl = TextEditingController();
  final _newPassCtrl = TextEditingController();
  bool _isChangingPass = false;

  Future<void> _changePassword() async {
    if (_currentPassCtrl.text.isEmpty || _newPassCtrl.text.isEmpty) {
      Get.snackbar('Error', 'Both password fields are required', backgroundColor: Colors.orange, colorText: Colors.white);
      return;
    }
    if (_newPassCtrl.text.length < 6) {
      Get.snackbar('Error', 'New password must be at least 6 characters', backgroundColor: Colors.orange, colorText: Colors.white);
      return;
    }

    setState(() => _isChangingPass = true);
    try {
      final apiClient = Get.find<ApiClient>();
      await apiClient.post(ApiEndpoints.changePassword, data: {
        'currentPassword': _currentPassCtrl.text,
        'newPassword': _newPassCtrl.text,
      });

      _currentPassCtrl.clear();
      _newPassCtrl.clear();

      Get.snackbar('Success', 'Password changed successfully!', backgroundColor: AppColors.primary, colorText: Colors.white);
      Get.back();
    } catch (e) {
      Get.snackbar('Error', 'Failed to update password: $e', backgroundColor: Colors.red, colorText: Colors.white);
    } finally {
      setState(() => _isChangingPass = false);
    }
  }

  @override
  void dispose() {
    _currentPassCtrl.dispose();
    _newPassCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A);

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
      appBar: AppBar(
        title: const Text("Change Password", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        elevation: 0,
        backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
        foregroundColor: textColor,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Update Security Password",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              "Choose a strong password with at least 6 characters.",
              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            ),
            const SizedBox(height: 24),
            Text(
              "Current Password",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _currentPassCtrl,
              obscureText: true,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.lock_open, size: 18),
                hintText: "Enter current password",
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              "New Password",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _newPassCtrl,
              obscureText: true,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.lock_outline, size: 18),
                hintText: "Enter new password",
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 28),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: _isChangingPass
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.save_outlined, size: 20),
                label: Text(
                  _isChangingPass ? "Updating..." : "Update Password",
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                onPressed: _isChangingPass ? null : _changePassword,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
