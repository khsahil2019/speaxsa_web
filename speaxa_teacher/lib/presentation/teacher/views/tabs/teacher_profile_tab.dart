import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:file_picker/file_picker.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/api_endpoints.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../data/models/user_model.dart';

class TeacherProfileTab extends StatefulWidget {
  const TeacherProfileTab({super.key});

  @override
  State<TeacherProfileTab> createState() => _TeacherProfileTabState();
}

class _TeacherProfileTabState extends State<TeacherProfileTab> {
  bool _isUploadingAvatar = false;

  @override
  void initState() {
    super.initState();
    AuthService.to.fetchLatestUserProfile();
  }

  Future<void> _pickAndUploadAvatar() async {
    final result = await FilePicker.pickFiles(type: FileType.image);
    if (result == null || result.files.single.path == null) return;

    setState(() => _isUploadingAvatar = true);
    try {
      final apiClient = Get.find<ApiClient>();
      final response = await apiClient.uploadFile(
        ApiEndpoints.uploadAvatar,
        result.files.single.path!,
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

  ImageProvider? _getAvatarImage(UserModel? user, String baseUrl) {
    if (user == null) return null;
    final photoUrl = user.photoUrl;
    if (photoUrl == null || photoUrl.isEmpty || photoUrl == 'null') return null;

    if (photoUrl.startsWith('file://')) {
      final localPath = photoUrl.replaceFirst('file://', '');
      return FileImage(File(localPath));
    }
    final fullUrl = photoUrl.startsWith('http') ? photoUrl : '$baseUrl${photoUrl.startsWith('/') ? '' : '/'}$photoUrl';
    return NetworkImage(fullUrl);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      body: Obx(() {
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
      }),
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
          "Are you sure you want to permanently delete your account? All your batches, live classes, wallet balance, certificates, and student records will be permanently erased. This action CANNOT be undone.",
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
                        backgroundImage: _getAvatarImage(user, baseUrl),
                        child: _isUploadingAvatar
                            ? const SizedBox(width: 28, height: 28, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
                            : !hasPhoto
                                ? Text(
                                    user?.name.substring(0, 1).toUpperCase() ?? 'T',
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
                  user?.name ?? 'Teacher Partner',
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
                      const Icon(Icons.verified_user_outlined, size: 14, color: AppColors.primary),
                      const SizedBox(width: 4),
                      Text(
                        user?.teacherLevel ?? "Trainee Teacher",
                        style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Rating badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.star, color: Colors.orangeAccent, size: 20),
                      const SizedBox(width: 6),
                      Text(
                        "${user?.rating ?? 5.0} • (${user?.totalRatings ?? 0} Ratings)",
                        style: const TextStyle(color: Colors.deepOrange, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Referral Code
                const Text("Referral Invite Code", style: TextStyle(color: Colors.grey, fontSize: 12)),
                const SizedBox(height: 6),
                GestureDetector(
                  onTap: () {
                    if (user?.referralCode != null) {
                      Clipboard.setData(ClipboardData(text: user!.referralCode!));
                      Get.snackbar('Copied', 'Referral code copied to clipboard!', backgroundColor: AppColors.primary, colorText: Colors.white, snackPosition: SnackPosition.BOTTOM);
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
                          user?.referralCode ?? 'Pending',
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
                _buildInfoRow(Icons.school_outlined, "Qualification", user?.qualification ?? 'Not Specified'),
                const SizedBox(height: 10),
                _buildInfoRow(Icons.work_history_outlined, "Experience", "${user?.experienceYears ?? 0} Years"),
                const SizedBox(height: 10),
                _buildInfoRow(Icons.subject_outlined, "Subjects", user?.subjectExpertise ?? 'Not Specified'),
                const SizedBox(height: 10),
                _buildContactRow(
                  icon: Icons.email_outlined,
                  label: "Email Address",
                  value: user?.email ?? 'N/A',
                  isVerified: (user?.emailVerified == true),
                  onResend: () async {
                    if (user?.email != null) {
                      try {
                        final apiClient = Get.find<ApiClient>();
                        await apiClient.post('/auth/resend-verification', data: {'email': user!.email, 'identifier': user.email});
                        Get.snackbar('Verification Sent', 'Verification link re-sent to ${user.email} ✓', backgroundColor: AppColors.success, colorText: Colors.white);
                      } catch (e) {
                        Get.snackbar('Notice', 'Verification link sent to ${user?.email}. Please check inbox.', backgroundColor: AppColors.primary, colorText: Colors.white);
                      }
                    }
                  },
                ),
                const SizedBox(height: 10),
                _buildContactRow(
                  icon: Icons.phone_outlined,
                  label: "Phone Number",
                  value: user?.phone ?? 'N/A',
                  isVerified: (user?.phoneVerified ?? true) == true,
                ),
                const SizedBox(height: 10),
                _buildInfoRow(Icons.location_on_outlined, "Address", user?.address ?? 'Not Specified'),
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

  Widget _buildContactRow({
    required IconData icon,
    required String label,
    required String value,
    required bool isVerified,
    VoidCallback? onResend,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 18, color: AppColors.primary),
            const SizedBox(width: 10),
            Text("$label: ", style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
            Expanded(
              child: Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13), overflow: TextOverflow.ellipsis),
            ),
            const SizedBox(width: 6),
            if (isVerified)
              const Icon(Icons.verified, color: AppColors.success, size: 18)
            else
              const Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 18),
          ],
        ),
        if (!isVerified && onResend != null)
          Padding(
            padding: const EdgeInsets.only(left: 28, top: 4),
            child: InkWell(
              onTap: onResend,
              child: const Text(
                "Resend Email Verification Link →",
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary, decoration: TextDecoration.underline),
              ),
            ),
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
            title: const Text("Edit Teacher Profile", style: TextStyle(fontWeight: FontWeight.w600)),
            subtitle: const Text("Update qualification, subjects, and address", style: TextStyle(fontSize: 12, color: Colors.grey)),
            trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 16, color: Colors.grey),
            onTap: () => Get.to(() => const EditTeacherProfileView()),
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

class EditTeacherProfileView extends StatefulWidget {
  const EditTeacherProfileView({super.key});

  @override
  State<EditTeacherProfileView> createState() => _EditTeacherProfileViewState();
}

class _EditTeacherProfileViewState extends State<EditTeacherProfileView> {
  late TextEditingController _nameCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _altEmailCtrl;
  late TextEditingController _qualCtrl;
  late TextEditingController _expCtrl;
  late TextEditingController _subjectCtrl;
  late TextEditingController _languagesCtrl;
  late TextEditingController _linkedinCtrl;
  late TextEditingController _twitterCtrl;
  late TextEditingController _bioCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _gradeCtrl;
  late TextEditingController _boardCtrl;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final user = AuthService.to.currentUser.value;
    _nameCtrl = TextEditingController(text: user?.name ?? '');
    _phoneCtrl = TextEditingController(text: user?.phone ?? '');
    _altEmailCtrl = TextEditingController(text: user?.altEmail ?? '');
    _qualCtrl = TextEditingController(text: user?.qualification ?? '');
    _expCtrl = TextEditingController(text: user?.experienceYears?.toString() ?? '0');
    _subjectCtrl = TextEditingController(text: user?.subjectExpertise ?? '');
    _languagesCtrl = TextEditingController(text: user?.languages ?? '');
    _linkedinCtrl = TextEditingController(text: user?.socialLinks?['linkedin'] ?? '');
    _twitterCtrl = TextEditingController(text: user?.socialLinks?['twitter'] ?? '');
    _bioCtrl = TextEditingController(text: user?.bio ?? '');
    _addressCtrl = TextEditingController(text: user?.address ?? '');
    _gradeCtrl = TextEditingController(text: user?.grade ?? '');
    _boardCtrl = TextEditingController(text: user?.board ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _altEmailCtrl.dispose();
    _qualCtrl.dispose();
    _expCtrl.dispose();
    _subjectCtrl.dispose();
    _languagesCtrl.dispose();
    _linkedinCtrl.dispose();
    _twitterCtrl.dispose();
    _bioCtrl.dispose();
    _addressCtrl.dispose();
    _gradeCtrl.dispose();
    _boardCtrl.dispose();
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
      data['mobile_number'] = _phoneCtrl.text.trim();
      data['alt_email'] = _altEmailCtrl.text.trim();
      data['qualification'] = _qualCtrl.text.trim();
      data['experience_years'] = int.tryParse(_expCtrl.text.trim()) ?? 0;
      data['subject_expertise'] = _subjectCtrl.text.trim();
      data['languages'] = _languagesCtrl.text.trim();
      data['social_links'] = {
        'linkedin': _linkedinCtrl.text.trim(),
        'twitter': _twitterCtrl.text.trim(),
      };
      data['bio'] = _bioCtrl.text.trim();
      data['address'] = _addressCtrl.text.trim();
      data['grade'] = _gradeCtrl.text.trim();
      data['board'] = _boardCtrl.text.trim();

      final response = await apiClient.put(ApiEndpoints.profile, data: data);
      if (response != null && response['user'] != null) {
        final updatedUser = UserModel.fromJson(response['user']);
        AuthService.to.updateUserProfile(updatedUser);
        Get.snackbar('Saved ✓', 'Profile updated successfully!', backgroundColor: AppColors.primary, colorText: Colors.white);
        Get.back();
      }
    } catch (e) {
      Get.snackbar('Error', e.toString(), backgroundColor: AppColors.error, colorText: Colors.white);
    } finally {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final textColor = const Color(0xFF0F172A);

    return Scaffold(
      backgroundColor: AppColors.lightBg,
      appBar: AppBar(
        title: const Text("Edit Profile", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        elevation: 0,
        backgroundColor: AppColors.lightBg,
        foregroundColor: textColor,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Mentor Profile Details",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              "Update your educational and professional settings.",
              style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
            ),
            const SizedBox(height: 24),
            _buildFieldLabel("Full Name"),
            const SizedBox(height: 8),
            _buildTextField(_nameCtrl, "Enter full name", Icons.person_outline),

            const SizedBox(height: 18),
            _buildFieldLabel("Phone Number"),
            const SizedBox(height: 8),
            _buildTextField(_phoneCtrl, "Enter phone number", Icons.phone_outlined, keyboardType: TextInputType.phone),

            const SizedBox(height: 18),
            _buildFieldLabel("Alternate Contact Email"),
            const SizedBox(height: 8),
            _buildTextField(_altEmailCtrl, "e.g. alt@email.com", Icons.email_outlined, keyboardType: TextInputType.emailAddress),

            const SizedBox(height: 18),
            _buildFieldLabel("Qualification / Degree Title"),
            const SizedBox(height: 8),
            _buildTextField(_qualCtrl, "e.g. MSc Physics, BEd", Icons.school_outlined),

            const SizedBox(height: 18),
            _buildFieldLabel("Experience Years"),
            const SizedBox(height: 8),
            _buildTextField(_expCtrl, "e.g. 5", Icons.work_history_outlined, keyboardType: TextInputType.number),

            const SizedBox(height: 18),
            _buildFieldLabel("Subject Expertise"),
            const SizedBox(height: 8),
            _buildTextField(_subjectCtrl, "e.g. Physics, Mathematics", Icons.subject_outlined),

            const SizedBox(height: 18),
            _buildFieldLabel("Languages Spoken"),
            const SizedBox(height: 8),
            _buildTextField(_languagesCtrl, "e.g. English, Hindi", Icons.translate_outlined),

            const SizedBox(height: 18),
            _buildFieldLabel("LinkedIn Profile URL"),
            const SizedBox(height: 8),
            _buildTextField(_linkedinCtrl, "https://linkedin.com/in/...", Icons.link_outlined),

            const SizedBox(height: 18),
            _buildFieldLabel("Twitter / X Profile URL"),
            const SizedBox(height: 8),
            _buildTextField(_twitterCtrl, "https://twitter.com/...", Icons.link_outlined),

            const SizedBox(height: 18),
            _buildFieldLabel("Educator Bio & Teaching Philosophy"),
            const SizedBox(height: 8),
            _buildTextField(_bioCtrl, "Share a brief introduction or teaching philosophy...", Icons.article_outlined, maxLines: 3),

            const SizedBox(height: 18),
            _buildFieldLabel("Syllabus Board & Target Grades"),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: _buildTextField(_boardCtrl, "e.g. CBSE", Icons.dashboard_outlined)),
                const SizedBox(width: 12),
                Expanded(child: _buildTextField(_gradeCtrl, "e.g. Class 10", Icons.grade_outlined)),
              ],
            ),

            const SizedBox(height: 18),
            _buildFieldLabel("Permanent Address"),
            const SizedBox(height: 8),
            _buildTextField(_addressCtrl, "Enter address details", Icons.location_on_outlined, maxLines: 2),

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

  Widget _buildFieldLabel(String label) {
    return Text(
      label,
      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
    );
  }

  Widget _buildTextField(TextEditingController ctrl, String hint, IconData icon, {TextInputType keyboardType = TextInputType.text, int maxLines = 1}) {
    return TextField(
      controller: ctrl,
      keyboardType: keyboardType,
      maxLines: maxLines,
      decoration: InputDecoration(
        prefixIcon: Icon(icon, size: 18),
        hintText: hint,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
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
    final textColor = const Color(0xFF0F172A);

    return Scaffold(
      backgroundColor: AppColors.lightBg,
      appBar: AppBar(
        title: const Text("Change Password", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        elevation: 0,
        backgroundColor: AppColors.lightBg,
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
