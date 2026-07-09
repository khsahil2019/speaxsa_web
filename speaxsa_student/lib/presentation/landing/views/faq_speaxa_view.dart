import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';

class FaqSpeaxaView extends StatefulWidget {
  const FaqSpeaxaView({super.key});

  @override
  State<FaqSpeaxaView> createState() => _FaqSpeaxaViewState();
}

class _FaqSpeaxaViewState extends State<FaqSpeaxaView> {
  final RxInt _expandedIndex = (-1).obs;

  final List<Map<String, String>> _faqs = [
    {
      'q': 'How do students join a live class room?',
      'a': 'Students log into their dashboard, navigate to "My Batches", and tap "Join Class". The interactive live video room opens directly inside the app with full video, audio, whiteboard, and chat support.'
    },
    {
      'q': 'What parameters does the parent dashboard track?',
      'a': 'The parent portal visualizes real-time attendance (Present, Late, Absent), graded assignment scores, monthly progress reports, and 7 teacher-graded observation scores (Curiosity, Understanding, Discipline, Communication).'
    },
    {
      'q': 'How are teachers verified through SOP?',
      'a': 'Before teaching, mentors undergo a 5-step Quality Audit (Camera framing, Audio noise cancellation, Internet speed proof, Backdrop lighting, and a 10-minute demo lecture) followed by digital agreement signature.'
    },
    {
      'q': 'Can parents connect directly with teachers?',
      'a': 'Yes! The Parent Portal includes Parent-Teacher Connect, allowing parents to send direct messages to their child\'s subject teachers for complete academic alignment.'
    },
    {
      'q': 'Are classes recorded if a student misses a session?',
      'a': 'Yes, all live classes are recorded and made available in the student portal under batch study materials within 2 hours of session completion.'
    },
    {
      'q': 'How do payments & subscriptions work?',
      'a': 'Students pay monthly or course-wise fees securely through integrated Razorpay / UPI options directly inside the app with instant invoice receipts.'
    },
  ];

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Help & FAQs", style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 24)),
          const SizedBox(height: 6),
          const Text("Get instant answers to questions regarding live classrooms, batches, and parent portals", style: TextStyle(color: Colors.grey, fontSize: 13)),
          const SizedBox(height: 20),

          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _faqs.length,
            itemBuilder: (context, index) {
              final faq = _faqs[index];
              return Obx(() {
                final isExpanded = _expandedIndex.value == index;
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () => _expandedIndex.value = isExpanded ? -1 : index,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  faq['q']!,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14.5),
                                ),
                              ),
                              Icon(
                                isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                color: AppColors.primary,
                              ),
                            ],
                          ),
                          if (isExpanded) ...[
                            const SizedBox(height: 10),
                            const Divider(height: 1),
                            const SizedBox(height: 10),
                            Text(
                              faq['a']!,
                              style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 13, height: 1.5),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                );
              });
            },
          ),
        ],
      ),
    );
  }
}
