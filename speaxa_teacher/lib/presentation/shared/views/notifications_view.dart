import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/auth_service.dart';
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
  List<Map<String, dynamic>> notifications = [];

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    try {
      setState(() => isLoading = true);
      final response = await _apiClient.get('/teacher/notifications');
      
      List<Map<String, dynamic>> fetched = [];
      if (response is Map && response['notifications'] != null) {
        fetched = List<Map<String, dynamic>>.from(response['notifications']);
      } else if (response is List) {
        fetched = response.map((e) => Map<String, dynamic>.from(e)).toList();
      }

      setState(() {
        notifications = fetched;
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        notifications = [];
        isLoading = false;
      });
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      await _apiClient.post('/teacher/notifications/read-all');
      _fetchNotifications();
      Get.snackbar('Success', 'All notifications marked as read', backgroundColor: AppColors.success, colorText: Colors.white);
    } catch (e) {
      Get.snackbar('Error', 'Could not mark notifications as read: $e');
    }
  }

  Future<void> _markAsRead(String notifId) async {
    try {
      await _apiClient.post('/teacher/notifications/$notifId/read');
      _fetchNotifications();
    } catch (e) {
      print("Error marking notification read: $e");
    }
  }

  Future<void> _deleteNotification(String notifId) async {
    try {
      await _apiClient.delete('/teacher/notifications/$notifId');
      _fetchNotifications();
      Get.snackbar('Notification Removed', 'Notification deleted successfully');
    } catch (e) {
      print("Error deleting notification: $e");
    }
  }

  IconData _getIconForType(String? type) {
    switch (type) {
      case 'sop':
        return Icons.verified_rounded;
      case 'assignment':
        return Icons.assignment_rounded;
      case 'live':
        return Icons.videocam_rounded;
      case 'wallet':
      case 'payout':
        return Icons.account_balance_wallet_rounded;
      default:
        return Icons.notifications_rounded;
    }
  }

  Color _getColorForType(String? type) {
    switch (type) {
      case 'sop':
        return Colors.green;
      case 'assignment':
        return AppColors.primary;
      case 'live':
        return Colors.purple;
      case 'wallet':
      case 'payout':
        return Colors.amber.shade800;
      default:
        return AppColors.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      appBar: AppBar(
        title: const Text("Real-Time System Notifications"),
        centerTitle: false,
        actions: [
          if (notifications.isNotEmpty)
            TextButton.icon(
              icon: const Icon(Icons.done_all_rounded, size: 16, color: AppColors.primary),
              label: const Text("Read All", style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
              onPressed: _markAllAsRead,
            ),
        ],
      ),
      body: isLoading
          ? const SkeletonLoader(itemCount: 5)
          : notifications.isEmpty
              ? EmptyStateWidget(
                  title: "No System Notifications",
                  message: "You have no new alerts. Real-time notifications for live classes, assignments, and SOP approvals will appear here.",
                  buttonText: "Refresh Alerts",
                  onButtonPressed: _fetchNotifications,
                )
              : RefreshIndicator(
                  onRefresh: _fetchNotifications,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: notifications.length,
                    itemBuilder: (context, i) {
                      final n = notifications[i];
                      final notifId = n['id']?.toString() ?? '';
                      final isRead = n['is_read'] == true || n['read'] == true;
                      final type = n['type']?.toString();
                      final dateStr = n['created_at'] != null
                          ? n['created_at'].toString().split('.')[0]
                          : (n['time'] ?? 'Just now');

                      return Dismissible(
                        key: Key(notifId),
                        direction: DismissDirection.endToStart,
                        onDismissed: (_) => _deleteNotification(notifId),
                        background: Container(
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 20),
                          decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(16)),
                          child: const Icon(Icons.delete_forever_rounded, color: Colors.white),
                        ),
                        child: Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          color: isRead ? Colors.white : const Color(0xFFF0F9FF),
                          elevation: isRead ? 1 : 2,
                          child: ListTile(
                            onTap: () {
                              if (!isRead && notifId.isNotEmpty) {
                                _markAsRead(notifId);
                              }
                            },
                            contentPadding: const EdgeInsets.all(14),
                            leading: CircleAvatar(
                              backgroundColor: _getColorForType(type).withOpacity(0.12),
                              child: Icon(_getIconForType(type), color: _getColorForType(type), size: 22),
                            ),
                            title: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    n['title'] ?? 'Notification Alert',
                                    style: TextStyle(
                                      fontWeight: isRead ? FontWeight.w600 : FontWeight.bold,
                                      fontSize: 14,
                                      color: isRead ? Colors.black87 : AppColors.primary,
                                    ),
                                  ),
                                ),
                                if (!isRead)
                                  Container(
                                    width: 8,
                                    height: 8,
                                    decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                                  ),
                              ],
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const SizedBox(height: 4),
                                Text(
                                  n['message'] ?? n['body'] ?? '',
                                  style: TextStyle(fontSize: 12, color: Colors.grey.shade800, height: 1.3),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  dateStr,
                                  style: const TextStyle(fontSize: 10, color: Colors.grey),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
