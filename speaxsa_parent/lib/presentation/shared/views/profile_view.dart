import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/storage_service.dart';
import '../../../data/models/user_model.dart';
import '../../../data/repositories/auth_repository.dart';
import '../../parent/controllers/parent_dashboard_controller.dart';
import '../widgets/custom_button.dart';

class ProfileView extends StatefulWidget {
  const ProfileView({super.key});

  @override
  State<ProfileView> createState() => _ProfileViewState();
}

class _ProfileViewState extends State<ProfileView> {
  final ParentDashboardController dashboardController = Get.find<ParentDashboardController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      appBar: AppBar(
        title: const Text("My Profile", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
      ),
      body: Obx(() {
        final user = AuthService.to.currentUser.value;
        final isDark = StorageService.to.isDarkMode();
        final kidsCount = dashboardController.children.length;

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              // ── Profile Header Card ────────────────────────────
              Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    Container(
                      height: 6,
                      decoration: const BoxDecoration(
                        color: AppColors.parentRole,
                        borderRadius: BorderRadius.only(topLeft: Radius.circular(20), topRight: Radius.circular(20)),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
                      child: Column(
                        children: [
                          CircleAvatar(
                            radius: 46,
                            backgroundColor: AppColors.parentRole.withOpacity(0.12),
                            child: Text(
                              user?.name.isNotEmpty == true ? user!.name.substring(0, 1).toUpperCase() : 'P',
                              style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: AppColors.parentRole),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            user?.name ?? 'Parent Account',
                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.lightTextPrimary),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.parentRole.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.shield_outlined, size: 14, color: AppColors.parentRole),
                                const SizedBox(width: 4),
                                Text(
                                  "Guardian Account",
                                  style: TextStyle(color: AppColors.parentRole, fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                          const Divider(),
                          const SizedBox(height: 10),
                          _buildInfoRow(Icons.email_outlined, "Primary Email", user?.email ?? 'N/A'),
                          const SizedBox(height: 10),
                          _buildInfoRow(Icons.phone_outlined, "Contact Number", user?.phone ?? 'N/A'),
                          if (user?.mobileNumber != null && user!.mobileNumber!.isNotEmpty) ...[
                            const SizedBox(height: 10),
                            _buildInfoRow(Icons.phone_iphone_outlined, "Alt Contact", user.mobileNumber!),
                          ],
                          if (user?.altEmail != null && user!.altEmail!.isNotEmpty) ...[
                            const SizedBox(height: 10),
                            _buildInfoRow(Icons.alternate_email_outlined, "Alt Email", user.altEmail!),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // ── Profile Settings Actions ──────────────────────
              Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.only(topLeft: Radius.circular(20), topRight: Radius.circular(20))),
                      leading: const Icon(Icons.manage_accounts_outlined, color: Colors.blueAccent),
                      title: const Text("Edit Guardian Details", style: TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: const Text("Update contact phone and alt email", style: TextStyle(fontSize: 12, color: Colors.grey)),
                      trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Colors.grey),
                      onTap: () => Get.to(() => const EditParentProfileView()),
                    ),
                    const Divider(height: 1, indent: 20, endIndent: 20),
                    ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.only(bottomLeft: Radius.circular(20), bottomRight: Radius.circular(20))),
                      leading: const Icon(Icons.lock_outline, color: Colors.orangeAccent),
                      title: const Text("Change Security Password", style: TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: const Text("Change account password", style: TextStyle(fontSize: 12, color: Colors.grey)),
                      trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Colors.grey),
                      onTap: () => Get.to(() => const ChangeParentPasswordView()),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // ── Linked Kids List Section ──────────────────────
              Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            "Linked Children ($kidsCount)",
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          TextButton.icon(
                            icon: const Icon(Icons.add, size: 16, color: AppColors.parentRole),
                            label: const Text("Link New", style: TextStyle(fontSize: 12, color: AppColors.parentRole)),
                            onPressed: () {
                              Get.back();
                              dashboardController.selectedIndex.value = 2; // Link tab
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (dashboardController.children.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 20),
                          child: Center(
                            child: Text(
                              "No kids linked yet.",
                              style: TextStyle(color: Colors.grey, fontSize: 12),
                            ),
                          ),
                        )
                      else
                        ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: dashboardController.children.length,
                          separatorBuilder: (context, idx) => const SizedBox(height: 10),
                          itemBuilder: (context, i) {
                            final kid = dashboardController.children[i];
                            final initials = kid.name.isNotEmpty
                                ? kid.name.split(' ').map((n) => n.isNotEmpty ? n[0] : '').join('').toUpperCase().substring(0, kid.name.split(' ').length > 1 ? 2 : 1)
                                : 'S';

                            // Determine status color/text
                            // Wait, the UserModel status fields. Let's see if the UserModel has approvalStatus or status.
                            // In JSON from /api/parent/children, the student model fields are mapped. The backend response:
                            // u.id, u.name, u.photo_url, u.student_code, u.grade, u.board, u.learning_streak, psl.status, psl.id as link_id
                            // So yes, it is stored in `approvalStatus` or dynamic properties. Let's check how parent dashboard controller handles status.
                            // In website: badge-present for 'approved', badge-absent for 'rejected', badge-pending for others.
                            // In UserModel: approvalStatus contains this value.
                            final status = kid.approvalStatus?.toLowerCase() ?? 'pending';

                            return Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade50,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.grey.shade100),
                              ),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    backgroundColor: AppColors.primary.withOpacity(0.1),
                                    foregroundColor: AppColors.primary,
                                    child: Text(initials, style: const TextStyle(fontWeight: FontWeight.bold)),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(kid.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                        Text(
                                          "Code: ${kid.studentCode ?? 'N/A'} • Grade: ${kid.grade ?? 'N/A'}",
                                          style: const TextStyle(fontSize: 11, color: Colors.grey),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: status == 'approved'
                                              ? AppColors.success.withOpacity(0.1)
                                              : status == 'rejected'
                                                  ? AppColors.error.withOpacity(0.1)
                                                  : AppColors.warning.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          status.toUpperCase(),
                                          style: TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.bold,
                                            color: status == 'approved'
                                                ? AppColors.success
                                                : status == 'rejected'
                                                    ? AppColors.error
                                                    : AppColors.warning,
                                          ),
                                        ),
                                      ),
                                      if (status == 'approved') ...[
                                        const SizedBox(height: 6),
                                        GestureDetector(
                                          onTap: () {
                                            dashboardController.selectedChild.value = kid;
                                            dashboardController.loadChildOverview(kid.id);
                                            dashboardController.selectedIndex.value = 0; // go back to Overview
                                            Get.back();
                                          },
                                          child: const Text(
                                            "Track Progress",
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                              color: AppColors.parentRole,
                                              decoration: TextDecoration.underline,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
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

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppColors.parentRole),
        const SizedBox(width: 10),
        Text("$label: ", style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
        Expanded(
          child: Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13), overflow: TextOverflow.ellipsis),
        ),
      ],
    );
  }
}

// ── Edit Parent Profile View ──────────────────────────────────
class EditParentProfileView extends StatefulWidget {
  const EditParentProfileView({super.key});

  @override
  State<EditParentProfileView> createState() => _EditParentProfileViewState();
}

class _EditParentProfileViewState extends State<EditParentProfileView> {
  late TextEditingController _nameCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _altMobileCtrl;
  late TextEditingController _altEmailCtrl;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final user = AuthService.to.currentUser.value;
    _nameCtrl = TextEditingController(text: user?.name ?? '');
    _phoneCtrl = TextEditingController(text: user?.phone ?? '');
    _altMobileCtrl = TextEditingController(text: user?.mobileNumber ?? '');
    _altEmailCtrl = TextEditingController(text: user?.altEmail ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _altMobileCtrl.dispose();
    _altEmailCtrl.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (_nameCtrl.text.trim().isEmpty || _phoneCtrl.text.trim().isEmpty) {
      Get.snackbar('Error', 'Name and phone fields are required', backgroundColor: Colors.orange, colorText: Colors.white);
      return;
    }
    setState(() => _isSaving = true);
    try {
      final authRepo = AuthRepository();
      final updatedUser = await authRepo.updateProfile({
        'name': _nameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'mobile_number': _altMobileCtrl.text.trim().isNotEmpty ? _altMobileCtrl.text.trim() : null,
        'alt_email': _altEmailCtrl.text.trim().isNotEmpty ? _altEmailCtrl.text.trim() : null,
      });

      AuthService.to.updateUserProfile(updatedUser);
      Get.snackbar('Saved', 'Profile updated successfully!', backgroundColor: AppColors.parentRole, colorText: Colors.white);
      Get.back();
    } catch (e) {
      Get.snackbar('Error', e.toString(), backgroundColor: Colors.red, colorText: Colors.white);
    } finally {
      setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      appBar: AppBar(
        title: const Text("Edit Details", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Guardian Profile Details", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Text("Update contact details for portal communications.", style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
            const SizedBox(height: 24),
            
            // Name
            const Text("Full Name", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            const SizedBox(height: 6),
            TextField(
              controller: _nameCtrl,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.person_outline, size: 18),
                hintText: "Enter full name",
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 18),

            // Phone
            const Text("Contact Phone", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            const SizedBox(height: 6),
            TextField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.phone_outlined, size: 18),
                hintText: "Enter primary contact number",
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 18),

            // Alt Phone
            const Text("Alternative Contact Number", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            const SizedBox(height: 6),
            TextField(
              controller: _altMobileCtrl,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.phone_iphone_outlined, size: 18),
                hintText: "Enter alt phone number (optional)",
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 18),

            // Alt Email
            const Text("Alternative Email Address", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            const SizedBox(height: 6),
            TextField(
              controller: _altEmailCtrl,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.alternate_email_outlined, size: 18),
                hintText: "Enter alt email address (optional)",
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
                  backgroundColor: AppColors.parentRole,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: _isSaving
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.save_outlined, size: 20),
                label: Text(_isSaving ? "Saving..." : "Save Details", style: const TextStyle(fontWeight: FontWeight.bold)),
                onPressed: _isSaving ? null : _saveProfile,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Change Parent Password View ──────────────────────────────────
class ChangeParentPasswordView extends StatefulWidget {
  const ChangeParentPasswordView({super.key});

  @override
  State<ChangeParentPasswordView> createState() => _ChangeParentPasswordViewState();
}

class _ChangeParentPasswordViewState extends State<ChangeParentPasswordView> {
  final _currentPassCtrl = TextEditingController();
  final _newPassCtrl = TextEditingController();
  bool _isChangingPass = false;

  @override
  void dispose() {
    _currentPassCtrl.dispose();
    _newPassCtrl.dispose();
    super.dispose();
  }

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
      final authRepo = AuthRepository();
      await authRepo.changePassword(
        currentPassword: _currentPassCtrl.text,
        newPassword: _newPassCtrl.text,
      );

      Get.snackbar('Success', 'Password changed successfully!', backgroundColor: AppColors.parentRole, colorText: Colors.white);
      Get.back();
    } catch (e) {
      Get.snackbar('Error', 'Failed to update password: $e', backgroundColor: Colors.red, colorText: Colors.white);
    } finally {
      setState(() => _isChangingPass = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      appBar: AppBar(
        title: const Text("Change Password", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Update Portal Password", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Text("Create a strong login password of at least 6 characters.", style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
            const SizedBox(height: 24),

            // Current Password
            const Text("Current Password", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            const SizedBox(height: 6),
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

            // New Password
            const Text("New Password", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            const SizedBox(height: 6),
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
                  backgroundColor: AppColors.parentRole,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: _isChangingPass
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.save_outlined, size: 20),
                label: Text(_isChangingPass ? "Updating..." : "Update Password", style: const TextStyle(fontWeight: FontWeight.bold)),
                onPressed: _isChangingPass ? null : _changePassword,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
