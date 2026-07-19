import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/services/auth_service.dart';
import '../../controllers/teacher_dashboard_controller.dart';
import '../../../shared/widgets/empty_state_widget.dart';

class TeacherChatsTab extends GetView<TeacherDashboardController> {
  const TeacherChatsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.lightBg,
      body: Obx(() {
        final list = controller.conversations;
        if (list.isEmpty) {
          return const EmptyStateWidget(
            title: "No Chat Conversations",
            message: "Direct chat rooms with parents will appear here once they connect.",
          );
        }

        return RefreshIndicator(
          onRefresh: controller.loadChats,
          child: ListView.builder(
            padding: const EdgeInsets.all(8),
            itemCount: list.length,
            itemBuilder: (context, i) {
              final conv = list[i] as Map<String, dynamic>;
              final lastMsg = conv['last_message'] ?? 'No messages yet';
              final parentName = conv['parent_name'] ?? 'Parent User';
              final convId = conv['id']?.toString() ?? '';

              return Card(
                elevation: 1,
                margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppColors.primary.withOpacity(0.1),
                    child: Text(parentName.substring(0, 1).toUpperCase(), style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                  ),
                  title: Text(parentName, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text(lastMsg, maxLines: 1, overflow: TextOverflow.ellipsis),
                  trailing: const Icon(Icons.chevron_right, color: Colors.grey),
                  onTap: () {
                    controller.loadMessages(convId);
                    Get.to(() => ChatRoomScreen(conversationId: convId, partnerName: parentName));
                  },
                ),
              );
            },
          ),
        );
      }),
    );
  }
}

class ChatRoomScreen extends StatefulWidget {
  final String conversationId;
  final String partnerName;

  const ChatRoomScreen({super.key, required this.conversationId, required this.partnerName});

  @override
  State<ChatRoomScreen> createState() => _ChatRoomScreenState();
}

class _ChatRoomScreenState extends State<ChatRoomScreen> {
  final TeacherDashboardController controller = Get.find<TeacherDashboardController>();
  final TextEditingController _msgCtrl = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollToBottom();
    });
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.partnerName),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Get.back()),
      ),
      body: Column(
        children: [
          Expanded(
            child: Obx(() {
              final msgs = controller.activeMessages;
              if (msgs.isEmpty) {
                return const Center(child: Text("No messages. Start the conversation!", style: TextStyle(color: Colors.grey)));
              }

              // Auto scroll when messages updates
              WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());

              return ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(16),
                itemCount: msgs.length,
                itemBuilder: (context, i) {
                  final m = msgs[i] as Map<String, dynamic>;
                  final isMe = m['sender_id']?.toString() == AuthService.to.currentUser.value?.id;
                  final timeStr = m['created_at'] ?? '';
                  String timeFormatted = '';
                  try {
                    if (timeStr.isNotEmpty) {
                      final parsed = DateTime.parse(timeStr);
                      timeFormatted = DateFormat('hh:mm a').format(parsed);
                    }
                  } catch (_) {}

                  return Align(
                    alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                      decoration: BoxDecoration(
                        color: isMe ? AppColors.primary : Colors.grey.shade100,
                        borderRadius: BorderRadius.only(
                          topLeft: const Radius.circular(16),
                          topRight: const Radius.circular(16),
                          bottomLeft: isMe ? const Radius.circular(16) : const Radius.circular(0),
                          bottomRight: isMe ? const Radius.circular(0) : const Radius.circular(16),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            m['message'] ?? '',
                            style: TextStyle(color: isMe ? Colors.white : Colors.black87, fontSize: 14),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            timeFormatted,
                            style: TextStyle(color: isMe ? Colors.white70 : Colors.black45, fontSize: 9.5),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              );
            }),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: Colors.white,
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(24)),
                    child: TextField(
                      controller: _msgCtrl,
                      decoration: const InputDecoration(
                        hintText: "Type message...",
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: AppColors.primary,
                  child: IconButton(
                    icon: const Icon(Icons.send, color: Colors.white, size: 18),
                    onPressed: () {
                      final txt = _msgCtrl.text.trim();
                      if (txt.isNotEmpty) {
                        controller.sendMessage(widget.conversationId, txt);
                        _msgCtrl.clear();
                        _scrollToBottom();
                      }
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
