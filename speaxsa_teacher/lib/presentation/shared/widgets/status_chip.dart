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
      case 'present':
      case 'submitted':
      case 'live':
        bg = AppColors.success.withOpacity(0.15);
        fg = AppColors.success;
        break;
      case 'pending':
      case 'sop_pending':
      case 'late':
      case 'scheduled':
        bg = AppColors.warning.withOpacity(0.15);
        fg = AppColors.warning;
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
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }
}
