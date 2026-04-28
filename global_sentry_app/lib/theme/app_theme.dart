import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color bgDeep = Color(0xFFF6F8FB);
  static const Color bgCard = Color(0xFFFFFFFF);
  static const Color bgCardLighter = Color(0xFFF1F5F9);
  static const Color borderColor = Color(0xFFE2E8F0);

  static const Color epiColor = Color(0xFF2563EB);
  static const Color epiGlow = Color(0x1A2563EB);
  static const Color supplyColor = Color(0xFFD97706);
  static const Color accentPurple = Color(0xFF7C3AED);

  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF334155);
  static const Color textMuted = Color(0xFF64748B);

  static const Color dangerRed = Color(0xFFDC2626);
  static const Color warningYellow = Color(0xFFCA8A04);
  static const Color successGreen = Color(0xFF059669);

  static Color severityColor(int severity) {
    if (severity >= 5) return dangerRed;
    if (severity == 4) return warningYellow;
    if (severity == 3) return supplyColor;
    if (severity == 2) return epiColor;
    if (severity == 1) return successGreen;
    return textMuted;
  }

  static ThemeData get lightTheme {
    final baseTextTheme = GoogleFonts.spaceGroteskTextTheme(
      const TextTheme(
        displayLarge: TextStyle(color: textPrimary, fontWeight: FontWeight.w800),
        displayMedium: TextStyle(color: textPrimary, fontWeight: FontWeight.w800),
        displaySmall: TextStyle(color: textPrimary, fontWeight: FontWeight.w700),
        headlineLarge: TextStyle(color: textPrimary, fontWeight: FontWeight.w700),
        headlineMedium: TextStyle(color: textPrimary, fontWeight: FontWeight.w600),
        headlineSmall: TextStyle(color: textPrimary, fontWeight: FontWeight.w600),
        titleLarge: TextStyle(color: textPrimary, fontWeight: FontWeight.w700),
        titleMedium: TextStyle(color: textPrimary, fontWeight: FontWeight.w600),
        titleSmall: TextStyle(color: textSecondary, fontWeight: FontWeight.w600),
        bodyLarge: TextStyle(color: textPrimary),
        bodyMedium: TextStyle(color: textSecondary),
        bodySmall: TextStyle(color: textMuted),
      ),
    );

    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: bgDeep,
      colorScheme: const ColorScheme.light(
        primary: epiColor,
        secondary: supplyColor,
        surface: bgCard,
        error: dangerRed,
        outline: borderColor,
      ),
      textTheme: baseTextTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: bgCard,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.spaceGrotesk(
          color: textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w800,
        ),
        iconTheme: const IconThemeData(color: textPrimary),
      ),
      cardTheme: CardThemeData(
        color: bgCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: borderColor),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        height: 68,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => GoogleFonts.spaceGrotesk(
            color: states.contains(WidgetState.selected) ? epiColor : textMuted,
            fontSize: 12,
            fontWeight: states.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w600,
          ),
        ),
      ),
      useMaterial3: true,
    );
  }
}
