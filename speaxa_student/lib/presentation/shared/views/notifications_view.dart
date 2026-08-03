import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../core/constants/app_colors.dart';
import '../widgets/empty_state_widget.dart';
import '../widgets/skeleton_loader.dart';

class NotificationsView extends StatefulWidget {
  const NotificationsView({super.key});

  @override
  State<NotificationsView> createState() => _NotificationsViewState();
}

class _NotificationsViewState extends State<NotificationsView> {
  final ApiClient _apiClient = Get.find<ApiClient>();
  bool isLoading = true;
  List<dynamic> notifications = [];

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    try {
      setState(() => isLoading = true);
      final response = await _apiClient.get(ApiEndpoints.studentNotifications);
      List<dynamic> list = [];
      if (response is List) {
        list = response;
      } else if (response is Map && response['notifications'] is List) {
        list = List<dynamic>.from(response['notifications']);
      }
      setState(() {
        notifications = list;
        isLoading = false;
      });
    } catch (e) {
      setState(() => isLoading = false);
      debugPrint('[Notifications] Fetch error: $e');
    }
  }

  Future<void> _deleteNotification(String notifId, int index) async {
    // Optimistically remove from list
    final deletedItem = notifications[index];
    setState(() {
      notifications.removeAt(index);
    });

    try {
      await _apiClient.delete('${ApiEndpoints.studentNotifications}/$notifId');
      Get.rawSnackbar(
        messageText: const Text(
          "Notification deleted",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.grey.shade900,
        snackPosition: SnackPosition.BOTTOM,
        margin: const EdgeInsets.all(12),
        borderRadius: 8,
        duration: const Duration(seconds: 2),
      );
    } catch (e) {
      // Revert if API call fails
      setState(() {
        notifications.insert(index, deletedItem);
      });
      Get.snackbar(
        'Error',
        'Failed to delete notification: $e',
        backgroundColor: Colors.red.shade800,
        colorText: Colors.white,
      );
    }
  }

  Future<void> _markAsRead(String notifId, int index) async {
    try {
      await _apiClient.post('/student/notifications/$notifId/read');
      if (mounted) {
        setState(() {
          if (index < notifications.length && notifications[index] is Map) {
            notifications[index]['is_read'] = true;
          }
        });
      }
    } catch (_) {}
  }

  Future<void> _markAllRead() async {
    try {
      await _apiClient.post('/student/notifications/read-all');
      if (mounted) {
        setState(() {
          for (var item in notifications) {
            if (item is Map) item['is_read'] = true;
          }
        });
        Get.rawSnackbar(
          messageText: const Text("All notifications marked as read", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          backgroundColor: AppColors.primary,
          duration: const Duration(seconds: 2),
        );
      }
    } catch (e) {
      Get.snackbar('Error', 'Failed to mark notifications read: $e');
    }
  }

  String _formatNotifDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '';
    try {
      final parsed = DateTime.parse(dateStr);
      // Show relative time if within today, otherwise absolute date
      final now = DateTime.now();
      final difference = now.difference(parsed);

      if (difference.inMinutes < 60) {
        return "${difference.inMinutes}m ago";
      } else if (difference.inHours < 24) {
        return "${difference.inHours}h ago";
      } else {
        return DateFormat('d MMM, h:mm a').format(parsed.toLocal());
      }
    } catch (e) {
      return '';
    }
  }

  IconData _getIconForType(String? type) {
    switch (type?.toLowerCase()) {
      case 'live':
      case 'class':
        return Icons.video_camera_back_rounded;
      case 'homework':
      case 'assignment':
        return Icons.assignment_rounded;
      case 'attendance':
        return Icons.how_to_reg_rounded;
      case 'report':
        return Icons.analytics_rounded;
      case 'circular':
      case 'info':
        return Icons.info_outline_rounded;
      default:
        return Icons.notifications_active_rounded;
    }
  }

  Color _getColorForType(String? type) {
    switch (type?.toLowerCase()) {
      case 'live':
      case 'class':
        return const Color(0xFFEF4444); // Red
      case 'homework':
      case 'assignment':
        return const Color(0xFF3B82F6); // Blue
      case 'attendance':
        return const Color(0xFF10B981); // Green
      case 'report':
        return const Color(0xFF8B5CF6); // Purple
      default:
        return AppColors.primary; // Teal
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.darkTextPrimary : const Color(0xFF1E293B);
    final secTextColor = isDark ? AppColors.darkTextSecondary : Colors.grey.shade600;
    final borderColor = isDark ? Colors.white10 : Colors.grey.shade100;

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
        title: const Text(
          "Notifications",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        elevation: 0,
        backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
        foregroundColor: textColor,
        actions: [
          if (notifications.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 8.0),
              child: TextButton.icon(
                onPressed: _markAllRead,
                icon: const Icon(Icons.done_all_rounded, size: 18, color: AppColors.primary),
                label: const Text("Mark All Read", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary)),
              ),
            ),
        ],
      ),
      body: isLoading
          ? const SkeletonLoader(itemCount: 5)
          : notifications.isEmpty
              ? const EmptyStateWidget(
                  title: "All Caught Up!",
                  message: "Important alerts for live classes, assignments, and test scores will appear here.",
                  icon: Icons.notifications_off_outlined,
                )
              : RefreshIndicator(
                  onRefresh: _fetchNotifications,
                  color: AppColors.primary,
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    itemCount: notifications.length,
                    itemBuilder: (context, i) {
                      final n = notifications[i] as Map<String, dynamic>;
                      final notifId = n['id']?.toString() ?? '';
                      final type = n['type']?.toString();
                      final iconData = _getIconForType(type);
                      final iconColor = _getColorForType(type);

                      return Dismissible(
                        key: Key(notifId.isNotEmpty ? notifId : i.toString()),
                        direction: DismissDirection.horizontal,
                        onDismissed: (direction) => _deleteNotification(notifId, i),
                        background: _buildSwipeBackground(Alignment.centerLeft),
                        secondaryBackground: _buildSwipeBackground(Alignment.centerRight),
                        child: Card(
                          elevation: 0,
                          margin: const EdgeInsets.only(bottom: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                            side: BorderSide(color: borderColor),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                            child: ListTile(
                              leading: Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: iconColor.withOpacity(isDark ? 0.15 : 0.08),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(iconData, color: iconColor, size: 22),
                              ),
                              title: Text(
                                n['title']?.toString() ?? 'Alert',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14.5,
                                  color: textColor,
                                ),
                              ),
                              subtitle: Padding(
                                padding: const EdgeInsets.only(top: 4.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      n['message']?.toString() ?? '',
                                      style: TextStyle(
                                        color: secTextColor,
                                        fontSize: 12.5,
                                        height: 1.35,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      _formatNotifDate(n['created_at']?.toString()),
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: Colors.grey.shade400,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }

  Widget _buildSwipeBackground(Alignment alignment) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 24),
      decoration: BoxDecoration(
        color: const Color(0xFFEF4444), // Red delete color
        borderRadius: BorderRadius.circular(16),
      ),
      alignment: alignment,
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.delete_sweep_rounded, color: Colors.white, size: 24),
          SizedBox(width: 8),
          Text(
            "Delete",
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 13.5,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}
