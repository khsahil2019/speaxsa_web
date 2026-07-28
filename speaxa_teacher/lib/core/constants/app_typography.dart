import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTypography {
  // Heading & Display font (Outfit)
  static TextStyle heading({
    double fontSize = 18,
    FontWeight fontWeight = FontWeight.bold,
    Color? color,
    double? letterSpacing,
  }) {
    return GoogleFonts.outfit(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      letterSpacing: letterSpacing,
    );
  }

  // Body & Subtitle font (Plus Jakarta Sans)
  static TextStyle body({
    double fontSize = 13,
    FontWeight fontWeight = FontWeight.normal,
    Color? color,
    double? height,
  }) {
    return GoogleFonts.plusJakartaSans(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      height: height,
    );
  }

  // Numeric amounts & Wallet Currency font (Outfit / Space Grotesk)
  static TextStyle amount({
    double fontSize = 20,
    FontWeight fontWeight = FontWeight.bold,
    Color? color,
  }) {
    return GoogleFonts.outfit(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
    );
  }

  // Referral Codes & Digital Signatures font (Space Grotesk)
  static TextStyle code({
    double fontSize = 16,
    FontWeight fontWeight = FontWeight.w800,
    Color? color,
    double letterSpacing = 1.2,
  }) {
    return GoogleFonts.spaceGrotesk(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      letterSpacing: letterSpacing,
    );
  }
}
