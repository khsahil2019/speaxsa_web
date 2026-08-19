import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/constants/app_colors.dart';

class FaqSpeaxaView extends StatefulWidget {
  final bool isEmbedded;
  const FaqSpeaxaView({super.key, this.isEmbedded = false});

  @override
  State<FaqSpeaxaView> createState() => _FaqSpeaxaViewState();
}

class _FaqSpeaxaViewState extends State<FaqSpeaxaView> {
  final RxInt _expandedIndex = (-1).obs;

  final List<Map<String, String>> _faqs = [
    {
      'q': 'How do I link my child\'s student account?',
      'a': 'Navigate to the "Link Child" section from the menu or home dashboard, enter your child\'s 6-digit Student Code (e.g. STD-847291) or registered Student Email, and tap Request Link. Once verified, their profile will be linked to your portal.'
    },
    {
      'q': 'How do I track my child\'s daily attendance and homework?',
      'a': 'Go to the "Attendance & Homework" tab to view live attendance records (Present, Late, Absent) with dates and times, as well as pending/submitted homework assignments.'
    },
    {
      'q': 'Can I message subject teachers directly?',
      'a': 'Yes! Use "Teacher Connect & Chat" from the menu or dashboard to start direct 1-on-1 message threads with any teacher assigned to your child\'s active batches.'
    },
    {
      'q': 'What parameters does the parent portal track?',
      'a': 'The parent portal tracks live attendance, graded homework scores, test performance graphs, cognitive & behavioral observations (Curiosity, Consistency, Discipline, etc.), and monthly progress reports.'
    },
    {
      'q': 'How do students join live interactive classrooms?',
      'a': 'Students log into their student app dashboard, navigate to "My Batches", and tap "Join Class" to enter the live video room equipped with audio, video, digital whiteboard, and chat.'
    },
    {
      'q': 'How do I update my contact or profile information?',
      'a': 'Go to "Parent Profile" -> "Edit Guardian Details" to update your contact phone, alternate phone, or alternate email address.'
    },
    {
      'q': 'Are live classes recorded for later revision?',
      'a': 'Yes, all live class sessions are automatically recorded and uploaded under batch study materials within 2 hours of class completion.'
    },
    {
      'q': 'How do payments & fees work?',
      'a': 'Fee invoices and payment options are processed securely via integrated UPI/Razorpay options inside the app with instant digital receipts.'
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    final isEmbedded = widget.isEmbedded == true;

    final content = SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isEmbedded) ...[
            Text("Help & FAQs", style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            const Text("Get instant answers regarding live classes, attendance, progress tracking, and parent portal features", style: TextStyle(color: Colors.grey, fontSize: 13)),
            const SizedBox(height: 20),
          ] else ...[
            const Text("Get instant answers to questions regarding live classrooms, batches, attendance tracking, and parent portals.", style: TextStyle(color: Colors.grey, fontSize: 13.5)),
            const SizedBox(height: 20),
          ],

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
                  elevation: 0,
                  color: isDark ? AppColors.darkCard : Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(color: isDark ? Colors.white10 : Colors.grey.shade200),
                  ),
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
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14.5,
                                    color: isDark ? AppColors.darkTextPrimary : const Color(0xFF0F172A),
                                  ),
                                ),
                              ),
                              Icon(
                                isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                color: AppColors.parentRole,
                              ),
                            ],
                          ),
                          if (isExpanded) ...[
                            const SizedBox(height: 10),
                            Divider(height: 1, color: isDark ? Colors.white10 : Colors.grey.shade200),
                            const SizedBox(height: 10),
                            Text(
                              faq['a']!,
                              style: TextStyle(
                                color: isDark ? AppColors.darkTextSecondary : Colors.grey.shade700,
                                fontSize: 13.5,
                                height: 1.5,
                              ),
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

    if (isEmbedded) {
      return content;
    }

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBg : AppColors.lightBg,
      appBar: AppBar(
        title: const Text("Help & FAQs", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        centerTitle: false,
      ),
      body: content,
    );
  }
}
