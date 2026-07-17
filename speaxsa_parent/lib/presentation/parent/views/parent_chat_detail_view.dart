import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../controllers/parent_dashboard_controller.dart';

class ParentChatDetailView extends StatefulWidget {
  final String teacherId;
  final String teacherName;
  final String studentId;
  final String studentName;

  const ParentChatDetailView({
    super.key,
    required this.teacherId,
    required this.teacherName,
    required this.studentId,
    required this.studentName,
  });

  @override
  State<ParentChatDetailView> createState() => _ParentChatDetailViewState();
}

class _ParentChatDetailViewState extends State<ParentChatDetailView> {
  final ParentDashboardController controller = Get.find<ParentDashboardController>();
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    controller.startMessagePolling(widget.teacherId);
    
    // Auto scroll to bottom when messages list updates
    ever(controller.chatMessages, (_) {
      _scrollToBottom();
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    controller.stopMessagePolling();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final initials = widget.teacherName.isNotEmpty
        ? widget.teacherName.split(' ').map((n) => n.isNotEmpty ? n[0] : '').join('').toUpperCase().substring(0, widget.teacherName.split(' ').length > 1 ? 2 : 1)
        : 'T';

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            CircleAvatar(
              backgroundColor: AppColors.primary.withOpacity(0.1),
              foregroundColor: AppColors.primary,
              child: Text(initials, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(widget.teacherName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  Text(
                    "Regarding: ${widget.studentName}",
                    style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.normal),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: Obx(() {
              final msgs = controller.chatMessages;
              if (msgs.isEmpty) {
                return Center(
                  child: SingleChildScrollView(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.05),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.forum_outlined, size: 40, color: AppColors.primary),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            "No messages yet",
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            "Send a query to start the conversation with the mentor regarding your child.",
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.grey, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }

              // Post-render callback to ensure it scrolls down
              WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());

              return ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(16),
                itemCount: msgs.length,
                itemBuilder: (context, i) {
                  final m = msgs[i];
                  final isMe = m.senderRole == 'parent';
                  final alignment = isMe ? Alignment.centerRight : Alignment.centerLeft;
                  final bubbleColor = isMe ? AppColors.parentRole : Colors.grey.shade100;
                  final textColor = isMe ? Colors.white : Colors.black87;
                  
                  DateTime? parsedDate;
                  try {
                    parsedDate = DateTime.parse(m.createdAt);
                  } catch (_) {}
                  
                  final timeStr = parsedDate != null 
                      ? DateFormat('hh:mm a').format(parsedDate.toLocal())
                      : '';

                  return Align(
                    alignment: alignment,
                    child: Container(
                      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: bubbleColor,
                        borderRadius: BorderRadius.only(
                          topLeft: const Radius.circular(16),
                          topRight: const Radius.circular(16),
                          bottomLeft: isMe ? const Radius.circular(16) : Radius.zero,
                          bottomRight: isMe ? Radius.zero : const Radius.circular(16),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.02),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                        children: [
                          if (!isMe)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 4),
                              child: Text(
                                m.senderName ?? widget.teacherName,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: AppColors.primary),
                              ),
                            ),
                          Text(
                            m.message,
                            style: TextStyle(color: textColor, fontSize: 14),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            timeStr,
                            style: TextStyle(
                              color: isMe ? Colors.white.withOpacity(0.7) : Colors.grey,
                              fontSize: 10,
                            ),
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
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              border: Border(top: BorderSide(color: Colors.grey.shade200)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 6,
                  offset: const Offset(0, -3),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: controller.messageController,
                    decoration: InputDecoration(
                      hintText: 'Type message...',
                      hintStyle: const TextStyle(color: Colors.grey),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                      filled: true,
                      fillColor: Colors.grey.shade100,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: AppColors.parentRole,
                  child: IconButton(
                    icon: const Icon(Icons.send, color: Colors.white, size: 18),
                    onPressed: () {
                      if (controller.messageController.text.trim().isNotEmpty) {
                        controller.sendMessageToTeacher(widget.teacherId);
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
