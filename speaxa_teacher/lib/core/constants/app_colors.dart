import 'package:flutter/material.dart';

class AppColors {
  // Brand Primary Teal (Exact matching screenshot: Deep Emerald Teal #0D7A6D)
  static const Color primary = Color(0xFF0D7A6D); 
  static const Color primaryDark = Color(0xFF08544B);
  static const Color secondary = Color(0xFF0F766E); 
  static const Color accent = Color(0xFF0D7A6D); 

  // Background & Surfaces (Soft Off-White / Cream as shown in screenshots)
  static const Color lightBg = Color(0xFFFAFAFA);
  static const Color lightCard = Color(0xFFFFFFFF);
  static const Color lightCardAlt = Color(0xFFF4F6F6);
  static const Color lightTextPrimary = Color(0xFF1E242B);
  static const Color lightTextSecondary = Color(0xFF5F6D7E);

  static const Color darkBg = Color(0xFF0F172A);
  static const Color darkCard = Color(0xFF1E293B);
  static const Color darkCardAlt = Color(0xFF334155);
  static const Color darkTextPrimary = Color(0xFFF8FAFC);
  static const Color darkTextSecondary = Color(0xFF94A3B8);

  // Status & Role Colors
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF0284C7);

  // Role Pill Backgrounds (Light Cyan / Soft Teal as in screenshot)
  static const Color rolePillBg = Color(0xFFE2F4F1);
  static const Color rolePillText = Color(0xFF0D7A6D);

  static const Color studentRole = Color(0xFF0D7A6D);
  static const Color teacherRole = Color(0xFF0D7A6D);
  static const Color parentRole = Color(0xFF0284C7);

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF0D7A6D), Color(0xFF08544B)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient heroGradient = LinearGradient(
    colors: [Color(0xFF0D7A6D), Color(0xFF0A6358)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
