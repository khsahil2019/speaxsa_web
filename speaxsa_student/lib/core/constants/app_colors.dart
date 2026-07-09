import 'package:flutter/material.dart';

class AppColors {

  // Brand Primary Teal (Lighter, modern teal Color(0xFF14B8A6))
  static const Color primary = Color(0xFF14B8A6); 
  static const Color primaryDark = Color(0xFF0D9488);
  static const Color secondary = Color(0xFF0F9F90); 
  static const Color accent = Color(0xFF14B8A6); 
  
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
  static const Color rolePillText = Color(0xFF0D9488);

  static const Color studentRole = Color(0xFF14B8A6);
  static const Color teacherRole = Color(0xFF14B8A6);
  static const Color parentRole = Color(0xFF0284C7);

  // Brand Gold
  static const Color gold = Color(0xFFD4AF37);
  static const Color goldAccent = Color(0xFFF59E0B);
  
  static const LinearGradient goldGradient = LinearGradient(
    colors: [Color(0xFFF59E0B), Color(0xFFD4AF37)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF14B8A6), Color(0xFF0D9488)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient heroGradient = LinearGradient(
    colors: [Color(0xFF14B8A6), Color(0xFF0D9488)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
