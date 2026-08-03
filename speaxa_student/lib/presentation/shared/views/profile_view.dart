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

  void _showPhoneOtpModal(BuildContext context, String currentPhone) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => PhoneOtpVerificationBottomSheet(phone: currentPhone),
    );
  }

  void _showEmailOtpModal(BuildContext context, String currentEmail) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => EmailOtpVerificationBottomSheet(email: currentEmail),
    );
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
            _buildProfileHeaderCard(context, user),
            const SizedBox(height: 20),

            // ── Profile Settings / Navigation Card ──────────────
            _buildProfileSettingsCard(),
            const SizedBox(height: 20),

            // ── Logout & Delete Account Buttons ────────────────
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                      side: const BorderSide(color: Colors.red),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    icon: const Icon(Icons.logout, size: 18),
                    label: const Text("Logout", style: TextStyle(fontWeight: FontWeight.bold)),
                    onPressed: () => AuthService.to.logout(),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red.shade700,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    icon: const Icon(Icons.delete_forever, size: 18),
                    label: const Text("Delete Account", style: TextStyle(fontWeight: FontWeight.bold)),
                    onPressed: () => _showDeleteAccountConfirmation(context),
                  ),
                ),
              ],
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

  void _showDeleteAccountConfirmation(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.red),
            SizedBox(width: 8),
            Text("Delete Account?"),
          ],
        ),
        content: const Text(
          "Are you sure you want to permanently delete your student account? All your course enrollments, learning progress, certificates, submitted assignments, and attendance records will be permanently erased. This action CANNOT be undone.",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade700,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              Navigator.pop(dialogCtx);
              try {
                final success = await AuthService.to.deleteAccount();
                if (success) {
                  Get.snackbar(
                    'Account Deleted',
                    'Your account has been permanently deleted.',
                    snackPosition: SnackPosition.BOTTOM,
                    backgroundColor: Colors.black87,
                    colorText: Colors.white,
                  );
                }
              } catch (e) {
                Get.snackbar(
                  'Error',
                  'Failed to delete account. Please try again.',
                  snackPosition: SnackPosition.BOTTOM,
                  backgroundColor: Colors.red,
                  colorText: Colors.white,
                );
              }
            },
            child: const Text("Delete Permanently"),
          ),
        ],
      ),
    );
  }

  Widget _buildVerifiedBadge({required bool isVerified, VoidCallback? onVerifyTap}) {
    if (isVerified) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: const Color(0xFF10B981).withOpacity(0.12),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.verified_rounded, color: Color(0xFF10B981), size: 13),
            SizedBox(width: 3),
            Text(
              "Verified",
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.bold,
                color: Color(0xFF10B981),
              ),
            ),
          ],
        ),
      );
    }

    return InkWell(
      onTap: onVerifyTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: Colors.orange.withOpacity(0.12),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.orange.withOpacity(0.3)),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline_rounded, color: Colors.orange, size: 13),
            SizedBox(width: 3),
            Text(
              "Verify OTP",
              style: TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.bold,
                color: Colors.orange,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileHeaderCard(BuildContext context, UserModel? user) {
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
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.school_rounded, size: 14, color: AppColors.primary),
                      SizedBox(width: 4),
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

                // Info rows with Verified badges
                const Divider(),
                const SizedBox(height: 10),
                _buildInfoRow(Icons.school_outlined, "Academic Level", "${user?.grade ?? 'N/A'} (${user?.board ?? 'N/A'})"),
                const SizedBox(height: 12),
                _buildInfoRow(
                  Icons.email_outlined,
                  "Email Address",
                  user?.email ?? 'N/A',
                  badge: _buildVerifiedBadge(
                    isVerified: user?.emailVerified ?? true,
                    onVerifyTap: () => _showEmailOtpModal(context, user?.email ?? ''),
                  ),
                ),
                const SizedBox(height: 12),
                _buildInfoRow(
                  Icons.phone_outlined,
                  "Phone Number",
                  user?.phone ?? 'N/A',
                  badge: _buildVerifiedBadge(
                    isVerified: user?.phoneVerified ?? true,
                    onVerifyTap: () => _showPhoneOtpModal(context, user?.phone ?? ''),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value, {Widget? badge}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Icon(icon, size: 18, color: AppColors.primary),
        const SizedBox(width: 10),
        Text("$label: ", style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
        Expanded(
          child: Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13), overflow: TextOverflow.ellipsis),
        ),
        if (badge != null) ...[
          const SizedBox(width: 6),
          badge,
        ],
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
  late TextEditingController _emailCtrl;
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
    _emailCtrl = TextEditingController(text: user?.email ?? '');
    _selectedGrade = user?.grade;
    _selectedBoard = user?.board;
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  void _showPhoneOtpModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => PhoneOtpVerificationBottomSheet(phone: _phoneCtrl.text.trim()),
    );
  }

  void _showEmailOtpModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => EmailOtpVerificationBottomSheet(email: _emailCtrl.text.trim()),
    );
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
      data['email'] = _emailCtrl.text.trim();
      if (_selectedGrade != null) data['grade'] = _selectedGrade;
      if (_selectedBoard != null) data['board'] = _selectedBoard;

      final response = await apiClient.put(ApiEndpoints.profile, data: data);
      if (response != null && response['user'] != null) {
        final updatedUser = UserModel.fromJson(response['user']);
        AuthService.to.updateUserProfile(updatedUser);
        Get.snackbar('Saved', 'Profile updated successfully!', backgroundColor: AppColors.primary, colorText: Colors.white);
        Get.back();
      } else {
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
    final user = AuthService.to.currentUser.value;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
      appBar: AppBar(
        leading: Padding(
          padding: const EdgeInsets.only(left: 12, top: 8, bottom: 8),
          child: Container(
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkCard : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
            ),
            child: IconButton(
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
              icon: Icon(Icons.arrow_back_ios_new_rounded, color: isDark ? AppColors.darkTextPrimary : Colors.black87, size: 18),
              onPressed: () => Get.back(),
            ),
          ),
        ),
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
              "Update your personal academic details and verify contact information.",
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

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text("Phone Number", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor)),
                if (user?.phoneVerified ?? true)
                  const Row(
                    children: [
                      Icon(Icons.verified_rounded, color: Color(0xFF10B981), size: 14),
                      SizedBox(width: 3),
                      Text("Verified", style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 11)),
                    ],
                  )
                else
                  TextButton.icon(
                    style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: Size.zero, tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                    onPressed: () => _showPhoneOtpModal(context),
                    icon: const Icon(Icons.security, size: 13, color: Colors.orange),
                    label: const Text("Verify OTP", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.orange)),
                  ),
              ],
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

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text("Email Address", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor)),
                if (user?.emailVerified ?? true)
                  const Row(
                    children: [
                      Icon(Icons.verified_rounded, color: Color(0xFF10B981), size: 14),
                      SizedBox(width: 3),
                      Text("Verified", style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 11)),
                    ],
                  )
                else
                  TextButton.icon(
                    style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: Size.zero, tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                    onPressed: () => _showEmailOtpModal(context),
                    icon: const Icon(Icons.mail_outline, size: 13, color: Colors.orange),
                    label: const Text("Verify Email", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.orange)),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.email_outlined, size: 18),
                hintText: "Enter your email address",
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
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade400),
                borderRadius: BorderRadius.circular(12),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _grades.contains(_selectedGrade) ? _selectedGrade : null,
                  hint: const Text("Select Class/Grade"),
                  isExpanded: true,
                  onChanged: (val) => setState(() => _selectedGrade = val),
                  items: _grades.map((g) => DropdownMenuItem(value: g, child: Text(g))).toList(),
                ),
              ),
            ),
            const SizedBox(height: 18),

            Text(
              "Educational Board",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade400),
                borderRadius: BorderRadius.circular(12),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _boards.contains(_selectedBoard) ? _selectedBoard : null,
                  hint: const Text("Select Board"),
                  isExpanded: true,
                  onChanged: (val) => setState(() => _selectedBoard = val),
                  items: _boards.map((b) => DropdownMenuItem(value: b, child: Text(b))).toList(),
                ),
              ),
            ),
            const SizedBox(height: 32),

            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _isSaving ? null : _saveProfile,
                child: _isSaving
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text("SAVE CHANGES", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class PhoneOtpVerificationBottomSheet extends StatefulWidget {
  final String phone;
  const PhoneOtpVerificationBottomSheet({super.key, required this.phone});

  @override
  State<PhoneOtpVerificationBottomSheet> createState() => _PhoneOtpVerificationBottomSheetState();
}

class _PhoneOtpVerificationBottomSheetState extends State<PhoneOtpVerificationBottomSheet> {
  late TextEditingController _phoneCtrl;
  final TextEditingController _otpCtrl = TextEditingController();
  bool _otpSent = false;
  bool _isLoading = false;
  String? _receivedDevOtp;

  @override
  void initState() {
    super.initState();
    _phoneCtrl = TextEditingController(text: widget.phone);
  }

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendPhoneOtp() async {
    if (_phoneCtrl.text.trim().isEmpty) {
      Get.snackbar('Error', 'Please enter a valid phone number');
      return;
    }
    setState(() => _isLoading = true);
    try {
      final apiClient = Get.find<ApiClient>();
      final res = await apiClient.post('/auth/profile/send-phone-otp', data: {'phone': _phoneCtrl.text.trim()});
      setState(() {
        _otpSent = true;
        _receivedDevOtp = res?['otp']?.toString();
        if (_receivedDevOtp != null) {
          _otpCtrl.text = _receivedDevOtp!;
        }
      });
      Get.snackbar('OTP Sent', res?['message'] ?? 'Verification OTP sent to phone', backgroundColor: AppColors.primary, colorText: Colors.white);
    } catch (e) {
      Get.snackbar('Error', e.toString(), backgroundColor: Colors.red, colorText: Colors.white);
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _verifyPhoneOtp() async {
    if (_otpCtrl.text.trim().isEmpty) {
      Get.snackbar('Error', 'Please enter 6-digit OTP code');
      return;
    }
    setState(() => _isLoading = true);
    try {
      final apiClient = Get.find<ApiClient>();
      final res = await apiClient.post('/auth/profile/verify-phone-otp', data: {
        'phone': _phoneCtrl.text.trim(),
        'otp': _otpCtrl.text.trim(),
      });
      final currentUser = AuthService.to.currentUser.value;
      if (currentUser != null) {
        final updatedUser = currentUser.copyWith(
          phone: _phoneCtrl.text.trim(),
          phoneVerified: true,
        );
        AuthService.to.updateUserProfile(updatedUser);
      }
      Get.snackbar('Verified!', res?['message'] ?? 'Mobile number verified successfully!', backgroundColor: const Color(0xFF10B981), colorText: Colors.white);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      Get.snackbar('Verification Failed', e.toString(), backgroundColor: Colors.red, colorText: Colors.white);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? AppColors.darkCard : Colors.white;
    final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF1E293B);

    return Container(
      padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(context).viewInsets.bottom + 24),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(color: isDark ? Colors.white24 : Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              const Icon(Icons.phonelink_ring_rounded, color: AppColors.primary, size: 24),
              const SizedBox(width: 10),
              Expanded(
                child: Text("Mobile OTP Verification", style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: textColor)),
              ),
              IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(context)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            _otpSent ? "Enter 6-digit OTP code sent to your phone" : "We will send a 6-digit SMS verification code to your phone.",
            style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
          ),
          const SizedBox(height: 20),

          Text("Phone Number", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor)),
          const SizedBox(height: 6),
          TextField(
            controller: _phoneCtrl,
            enabled: !_otpSent,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.phone, size: 18),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 16),

          if (_otpSent) ...[
            Text("Verification OTP Code", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor)),
            const SizedBox(height: 6),
            TextField(
              controller: _otpCtrl,
              keyboardType: TextInputType.number,
              maxLength: 6,
              style: const TextStyle(letterSpacing: 6, fontWeight: FontWeight.bold, fontSize: 18),
              decoration: InputDecoration(
                hintText: "123456",
                prefixIcon: const Icon(Icons.lock_clock_outlined, size: 18),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            if (_receivedDevOtp != null) ...[
              const SizedBox(height: 4),
              Text("DEV Mode OTP: $_receivedDevOtp", style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12)),
            ],
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _isLoading ? null : _verifyPhoneOtp,
                icon: _isLoading ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.check_circle_rounded, size: 18),
                label: const Text("VERIFY & CONFIRM", style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ] else ...[
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _isLoading ? null : _sendPhoneOtp,
                icon: _isLoading ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.send_rounded, size: 18),
                label: const Text("SEND VERIFICATION OTP", style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class EmailOtpVerificationBottomSheet extends StatefulWidget {
  final String email;
  const EmailOtpVerificationBottomSheet({super.key, required this.email});

  @override
  State<EmailOtpVerificationBottomSheet> createState() => _EmailOtpVerificationBottomSheetState();
}

class _EmailOtpVerificationBottomSheetState extends State<EmailOtpVerificationBottomSheet> {
  late TextEditingController _emailCtrl;
  final TextEditingController _otpCtrl = TextEditingController();
  bool _otpSent = false;
  bool _isLoading = false;
  String? _receivedDevOtp;

  @override
  void initState() {
    super.initState();
    _emailCtrl = TextEditingController(text: widget.email);
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  Future<void> _sendEmailOtp() async {
    if (_emailCtrl.text.trim().isEmpty) {
      Get.snackbar('Error', 'Please enter a valid email address');
      return;
    }
    setState(() => _isLoading = true);
    try {
      final apiClient = Get.find<ApiClient>();
      final res = await apiClient.post('/auth/send-otp', data: {
        'identifier': _emailCtrl.text.trim(),
        'purpose': 'verify_email',
      });
      setState(() {
        _otpSent = true;
        _receivedDevOtp = res?['otp']?.toString();
        if (_receivedDevOtp != null) {
          _otpCtrl.text = _receivedDevOtp!;
        }
      });
      Get.snackbar('OTP Sent', res?['message'] ?? 'Verification code sent to your email', backgroundColor: AppColors.primary, colorText: Colors.white);
    } catch (e) {
      Get.snackbar('Error', e.toString(), backgroundColor: Colors.red, colorText: Colors.white);
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _verifyEmailOtp() async {
    if (_otpCtrl.text.trim().isEmpty) {
      Get.snackbar('Error', 'Please enter 6-digit OTP code');
      return;
    }
    setState(() => _isLoading = true);
    try {
      final apiClient = Get.find<ApiClient>();
      final res = await apiClient.post('/auth/verify-otp', data: {
        'identifier': _emailCtrl.text.trim(),
        'otp': _otpCtrl.text.trim(),
        'purpose': 'verify_email',
      });
      final currentUser = AuthService.to.currentUser.value;
      if (currentUser != null) {
        final updatedUser = currentUser.copyWith(
          email: _emailCtrl.text.trim(),
          emailVerified: true,
        );
        AuthService.to.updateUserProfile(updatedUser);
      }
      Get.snackbar('Verified!', res?['message'] ?? 'Email address verified successfully!', backgroundColor: const Color(0xFF10B981), colorText: Colors.white);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      Get.snackbar('Verification Failed', e.toString(), backgroundColor: Colors.red, colorText: Colors.white);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? AppColors.darkCard : Colors.white;
    final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF1E293B);

    return Container(
      padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(context).viewInsets.bottom + 24),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(color: isDark ? Colors.white24 : Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              const Icon(Icons.mark_email_read_rounded, color: AppColors.primary, size: 24),
              const SizedBox(width: 10),
              Expanded(
                child: Text("Email OTP Verification", style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: textColor)),
              ),
              IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(context)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            _otpSent ? "Enter 6-digit OTP code sent to your email" : "We will send a 6-digit verification code to your email address.",
            style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
          ),
          const SizedBox(height: 20),

          Text("Email Address", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor)),
          const SizedBox(height: 6),
          TextField(
            controller: _emailCtrl,
            enabled: !_otpSent,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(
              prefixIcon: const Icon(Icons.email, size: 18),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 16),

          if (_otpSent) ...[
            Text("Verification OTP Code", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor)),
            const SizedBox(height: 6),
            TextField(
              controller: _otpCtrl,
              keyboardType: TextInputType.number,
              maxLength: 6,
              style: const TextStyle(letterSpacing: 6, fontWeight: FontWeight.bold, fontSize: 18),
              decoration: InputDecoration(
                hintText: "123456",
                prefixIcon: const Icon(Icons.lock_clock_outlined, size: 18),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            if (_receivedDevOtp != null) ...[
              const SizedBox(height: 4),
              Text("DEV Mode OTP: $_receivedDevOtp", style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12)),
            ],
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _isLoading ? null : _verifyEmailOtp,
                icon: _isLoading ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.check_circle_rounded, size: 18),
                label: const Text("VERIFY & CONFIRM", style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ] else ...[
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _isLoading ? null : _sendEmailOtp,
                icon: _isLoading ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.send_rounded, size: 18),
                label: const Text("SEND VERIFICATION OTP", style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ],
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
  final _oldPassCtrl = TextEditingController();
  final _newPassCtrl = TextEditingController();
  final _confirmPassCtrl = TextEditingController();
  bool _isSaving = false;
  bool _obscureOld = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _oldPassCtrl.dispose();
    _newPassCtrl.dispose();
    _confirmPassCtrl.dispose();
    super.dispose();
  }

  Future<void> _changePassword() async {
    final oldPass = _oldPassCtrl.text.trim();
    final newPass = _newPassCtrl.text.trim();
    final confirmPass = _confirmPassCtrl.text.trim();

    if (oldPass.isEmpty || newPass.isEmpty || confirmPass.isEmpty) {
      Get.snackbar('Error', 'All fields are required', backgroundColor: Colors.orange, colorText: Colors.white);
      return;
    }
    if (newPass != confirmPass) {
      Get.snackbar('Error', 'New password and confirmation do not match', backgroundColor: Colors.orange, colorText: Colors.white);
      return;
    }
    if (newPass.length < 6) {
      Get.snackbar('Error', 'Password must be at least 6 characters', backgroundColor: Colors.orange, colorText: Colors.white);
      return;
    }

    setState(() => _isSaving = true);
    try {
      final apiClient = Get.find<ApiClient>();
      await apiClient.post(ApiEndpoints.changePassword, data: {
        'oldPassword': oldPass,
        'newPassword': newPass,
      });
      Get.snackbar('Success', 'Password changed successfully!', backgroundColor: AppColors.primary, colorText: Colors.white);
      Get.back();
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
        leading: Padding(
          padding: const EdgeInsets.only(left: 12, top: 8, bottom: 8),
          child: Container(
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkCard : Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
            ),
            child: IconButton(
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
              icon: Icon(Icons.arrow_back_ios_new_rounded, color: isDark ? AppColors.darkTextPrimary : Colors.black87, size: 18),
              onPressed: () => Get.back(),
            ),
          ),
        ),
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
            Text("Current Password", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor)),
            const SizedBox(height: 8),
            TextField(
              controller: _oldPassCtrl,
              obscureText: _obscureOld,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.lock_outline, size: 18),
                suffixIcon: IconButton(
                  icon: Icon(_obscureOld ? Icons.visibility_off : Icons.visibility, size: 18),
                  onPressed: () => setState(() => _obscureOld = !_obscureOld),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 18),

            Text("New Password", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor)),
            const SizedBox(height: 8),
            TextField(
              controller: _newPassCtrl,
              obscureText: _obscureNew,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.lock_clock_outlined, size: 18),
                suffixIcon: IconButton(
                  icon: Icon(_obscureNew ? Icons.visibility_off : Icons.visibility, size: 18),
                  onPressed: () => setState(() => _obscureNew = !_obscureNew),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 18),

            Text("Confirm New Password", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: textColor)),
            const SizedBox(height: 8),
            TextField(
              controller: _confirmPassCtrl,
              obscureText: _obscureConfirm,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.check_circle_outline, size: 18),
                suffixIcon: IconButton(
                  icon: Icon(_obscureConfirm ? Icons.visibility_off : Icons.visibility, size: 18),
                  onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 32),

            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _isSaving ? null : _changePassword,
                child: _isSaving
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text("UPDATE PASSWORD", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
