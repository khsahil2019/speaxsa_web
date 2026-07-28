import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

class StatusChip extends StatelessWidget {
  final String status;

  const StatusChip({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;

    switch (status.toLowerCase()) {
      case 'active':
      case 'approved':
      case 'paid':
      case 'completed':
      case 'present':
      case 'submitted':
      case 'live':
        bg = Colors.green.withOpacity(0.15);
        fg = Colors.green.shade800;
        break;
      case 'requested':
      case 'under_review':
        bg = Colors.blue.withOpacity(0.15);
        fg = Colors.blue.shade800;
        break;
      case 'pending':
      case 'sop_pending':
      case 'late':
      case 'scheduled':
        bg = Colors.amber.withOpacity(0.15);
        fg = Colors.amber.shade900;
        break;
      case 'rejected':
      case 'absent':
      case 'disabled':
      case 'cancelled':
        bg = AppColors.error.withOpacity(0.15);
        fg = AppColors.error;
        break;
      default:
        bg = Colors.grey.withOpacity(0.15);
        fg = Colors.grey.shade700;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      constraints: const BoxConstraints(maxWidth: 120),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status.toUpperCase(),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }
}
