import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
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
  List<dynamic> notifications = [];

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  String _getNotificationEndpoint() {
    final role = AuthService.to.currentUser.value?.role?.toLowerCase() ?? 'parent';
    if (role == 'teacher') {
      return '/teacher/notifications';
    } else if (role == 'parent') {
      return '/parent/notifications';
    }
    return ApiEndpoints.studentNotifications;
  }

  Future<void> _fetchNotifications() async {
    try {
      setState(() => isLoading = true);
      final endpoint = _getNotificationEndpoint();
      final response = await _apiClient.get(endpoint);
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
      debugPrint('[NotificationsView] Error fetching notifications: $e');
      setState(() => isLoading = false);
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      await _apiClient.post('/notifications/read-all', data: {});
      await _fetchNotifications();
      Get.snackbar('Success', 'All notifications marked as read', backgroundColor: Colors.green, colorText: Colors.white);
    } catch (_) {
      setState(() {
        notifications.clear();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Notifications"),
        actions: [
          if (notifications.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.done_all_rounded, size: 20),
              tooltip: "Mark all as read",
              onPressed: _markAllAsRead,
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchNotifications,
        child: isLoading
            ? const SkeletonLoader(itemCount: 5)
            : notifications.isEmpty
                ? const EmptyStateWidget(
                    title: "No Notifications",
                    message: "Important alerts for attendance, homework, live classes, fees, and circulars will appear here.",
                    icon: Icons.notifications_off_outlined,
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: notifications.length,
                    itemBuilder: (context, i) {
                      final n = notifications[i] as Map<String, dynamic>;
                      final title = n['title']?.toString() ?? 'Notification';
                      final message = n['message']?.toString() ?? '';
                      final isRead = n['is_read'] == true || n['is_read'] == 1;
                      
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        color: isRead ? null : Theme.of(context).primaryColor.withOpacity(0.04),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          leading: CircleAvatar(
                            backgroundColor: Theme.of(context).primaryColor.withOpacity(0.12),
                            child: Icon(Icons.notifications_active_outlined, color: Theme.of(context).primaryColor),
                          ),
                          title: Text(
                            title,
                            style: TextStyle(fontWeight: isRead ? FontWeight.w600 : FontWeight.bold, fontSize: 14),
                          ),
                          subtitle: Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(message, style: const TextStyle(fontSize: 13, height: 1.3)),
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}

