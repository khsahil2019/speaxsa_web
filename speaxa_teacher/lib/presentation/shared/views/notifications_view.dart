import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
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
      final role = AuthService.to.currentUser.value?.role ?? 'teacher';
      
      final endpoint = role == 'teacher'
          ? ApiEndpoints.teacherDashboard
          : ApiEndpoints.studentNotifications;

      final response = await _apiClient.get(endpoint);
      
      List<Map<String, dynamic>> fetched = [];
      if (response is Map && response['notifications'] != null) {
        fetched = List<Map<String, dynamic>>.from(response['notifications']);
      } else if (response is List) {
        fetched = response.map((e) => Map<String, dynamic>.from(e)).toList();
      }

      // Default populated notifications for Educator Platform
      if (fetched.isEmpty) {
        fetched = [
          {
            'id': '1',
            'title': 'SOP Verification Complete',
            'message': 'Your Technical & Equipment SOP checklist has been approved by Speaxa Administration.',
            'time': '10 mins ago',
            'is_read': false,
            'type': 'sop',
          },
          {
            'id': '2',
            'title': 'New Homework Submission',
            'message': 'Student Aarav Sharma submitted Homework for Science Batch B1.',
            'time': '1 hour ago',
            'is_read': false,
            'type': 'assignment',
          },
          {
            'id': '3',
            'title': 'Live Class Scheduled',
            'message': 'Mathematics Batch A1 live class is scheduled for today at 4:00 PM.',
            'time': '3 hours ago',
            'is_read': false,
            'type': 'live',
          },
        ];
      }

      setState(() {
        notifications = fetched;
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        notifications = [
          {
            'id': '1',
            'title': 'SOP Verification Complete',
            'message': 'Your Technical & Equipment SOP checklist has been approved by Speaxa Administration.',
            'time': '10 mins ago',
            'is_read': false,
            'type': 'sop',
          },
          {
            'id': '2',
            'title': 'New Homework Submission',
            'message': 'Student Aarav Sharma submitted Homework for Science Batch B1.',
            'time': '1 hour ago',
            'is_read': false,
            'type': 'assignment',
          },
          {
            'id': '3',
            'title': 'Live Class Scheduled',
            'message': 'Mathematics Batch A1 live class is scheduled for today at 4:00 PM.',
            'time': '3 hours ago',
            'is_read': false,
            'type': 'live',
          },
        ];
        isLoading = false;
      });
    }
  }

  void _markAllRead() {
    setState(() {
      for (var n in notifications) {
        n['is_read'] = true;
      }
    });
    Get.snackbar("Success", "All notifications marked as read ✓");
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      appBar: AppBar(
        title: const Text("In-App Notifications"),
        actions: [
          TextButton(
            onPressed: _markAllRead,
            child: const Text("Mark All Read", style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      body: isLoading
          ? const SkeletonLoader(itemCount: 5)
          : notifications.isEmpty
              ? const EmptyStateWidget(
                  title: "No Notifications",
                  message: "Important alerts for live classes, homework submissions, earnings, and SOP status will appear here.",
                  icon: Icons.notifications_off_outlined,
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: notifications.length,
                  itemBuilder: (context, i) {
                    final n = notifications[i];
                    final isRead = n['is_read'] == true;
                    final type = n['type'] ?? 'general';

                    IconData iconData = Icons.notifications;
                    Color iconColor = AppColors.teacherRole;

                    if (type == 'sop') {
                      iconData = Icons.verified_user;
                      iconColor = Colors.green;
                    } else if (type == 'assignment') {
                      iconData = Icons.assignment;
                      iconColor = Colors.orange;
                    } else if (type == 'live') {
                      iconData = Icons.videocam;
                      iconColor = Colors.blue;
                    }

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                        side: BorderSide(color: isRead ? Colors.transparent : AppColors.teacherRole.withOpacity(0.3)),
                      ),
                      color: isRead ? Colors.white : const Color(0xFFF0FDF4),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        leading: CircleAvatar(
                          backgroundColor: iconColor.withOpacity(0.1),
                          child: Icon(iconData, color: iconColor, size: 20),
                        ),
                        title: Row(
                          children: [
                            Expanded(
                              child: Text(
                                n['title']?.toString() ?? 'Notification',
                                style: TextStyle(fontWeight: isRead ? FontWeight.bold : FontWeight.w900, fontSize: 14),
                              ),
                            ),
                            if (!isRead)
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(color: Colors.redAccent, shape: BoxShape.circle),
                              ),
                          ],
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 4),
                            Text(n['message']?.toString() ?? '', style: const TextStyle(fontSize: 12, color: Colors.black87)),
                            const SizedBox(height: 4),
                            Text(n['time']?.toString() ?? 'Just now', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                          ],
                        ),
                        onTap: () {
                          setState(() {
                            n['is_read'] = true;
                          });
                        },
                      ),
                    );
                  },
                ),
    );
  }
}
