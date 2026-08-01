import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_endpoints.dart';
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
      setState(() {
        notifications = response as List;
        isLoading = false;
      });
    } catch (e) {
      setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Notifications")),
      body: isLoading
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
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
                          child: Icon(Icons.notifications, color: Theme.of(context).primaryColor),
                        ),
                        title: Text(n['title']?.toString() ?? 'Notification', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text(n['message']?.toString() ?? ''),
                      ),
                    );
                  },
                ),
    );
  }
}
