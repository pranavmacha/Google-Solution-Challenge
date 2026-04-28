import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../models/threat.dart';
import '../theme/app_theme.dart';

class ThreatDetailScreen extends StatelessWidget {
  const ThreatDetailScreen({super.key, required this.threat});

  final Threat threat;

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.severityColor(threat.severity);

    return Scaffold(
      backgroundColor: AppTheme.bgDeep,
      appBar: AppBar(
        backgroundColor: AppTheme.bgCard,
        surfaceTintColor: Colors.transparent,
        title: Text(
          'Threat Detail',
          style: GoogleFonts.spaceGrotesk(
            color: AppTheme.textPrimary,
            fontSize: 17,
            fontWeight: FontWeight.w800,
          ),
        ),
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(1),
          child: Divider(height: 1, color: AppTheme.borderColor),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _HeaderCard(threat: threat, color: color),
          const SizedBox(height: 12),
          _SectionCard(
            title: 'Analysis',
            icon: Icons.psychology_alt_rounded,
            child: Text(
              threat.analysis,
              style: GoogleFonts.spaceGrotesk(
                color: AppTheme.textSecondary,
                fontSize: 13,
                height: 1.55,
              ),
            ),
          ),
          const SizedBox(height: 12),
          _SectionCard(
            title: 'Recommended Action',
            icon: Icons.task_alt_rounded,
            child: Text(
              threat.recommendedAction,
              style: GoogleFonts.spaceGrotesk(
                color: AppTheme.textSecondary,
                fontSize: 13,
                height: 1.55,
              ),
            ),
          ),
          if (threat.convergenceWarning != null) ...[
            const SizedBox(height: 12),
            _SectionCard(
              title: 'Convergence',
              icon: Icons.hub_rounded,
              tint: AppTheme.accentPurple,
              child: Text(
                threat.convergenceWarning!,
                style: GoogleFonts.spaceGrotesk(
                  color: AppTheme.textSecondary,
                  fontSize: 13,
                  height: 1.55,
                ),
              ),
            ),
          ],
          const SizedBox(height: 12),
          _SectionCard(
            title: 'Metadata',
            icon: Icons.dataset_rounded,
            child: Column(
              children: [
                _MetaRow(label: 'Severity', value: '${threat.severityLabel} (${threat.severity}/5)'),
                _MetaRow(label: 'Confidence', value: '${(threat.confidence * 100).round()}%'),
                _MetaRow(label: 'Category', value: threat.category),
                _MetaRow(label: 'Location', value: threat.location ?? 'Not mapped'),
                _MetaRow(label: 'Source', value: threat.source),
                _MetaRow(
                  label: 'Timestamp',
                  value: DateFormat('MMM d, yyyy - HH:mm').format(threat.timestamp),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HeaderCard extends StatelessWidget {
  const _HeaderCard({
    required this.threat,
    required this.color,
  });

  final Threat threat;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.28)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _Badge(label: threat.mode.toUpperCase(), color: AppTheme.supplyColor),
              const SizedBox(width: 8),
              _Badge(label: threat.severityLabel.toUpperCase(), color: color),
              const Spacer(),
              Icon(
                threat.isVerified ? Icons.verified_rounded : Icons.pending_rounded,
                color: threat.isVerified ? AppTheme.successGreen : AppTheme.warningYellow,
                size: 18,
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            threat.headline,
            style: GoogleFonts.spaceGrotesk(
              color: AppTheme.textPrimary,
              fontSize: 20,
              fontWeight: FontWeight.w800,
              height: 1.2,
            ),
          ),
          if (threat.hasLocation) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.location_on_rounded, size: 16, color: AppTheme.textMuted),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    threat.location ?? '${threat.lat}, ${threat.lng}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.spaceGrotesk(
                      color: AppTheme.textMuted,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.icon,
    required this.child,
    this.tint = AppTheme.epiColor,
  });

  final String title;
  final IconData icon;
  final Widget child;
  final Color tint;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 17, color: tint),
              const SizedBox(width: 8),
              Text(
                title,
                style: GoogleFonts.spaceGrotesk(
                  color: AppTheme.textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 7),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 92,
            child: Text(
              label,
              style: GoogleFonts.spaceGrotesk(
                color: AppTheme.textMuted,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: GoogleFonts.spaceGrotesk(
                color: AppTheme.textSecondary,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({
    required this.label,
    required this.color,
  });

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.28)),
      ),
      child: Text(
        label,
        style: GoogleFonts.orbitron(
          color: color,
          fontSize: 9,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.7,
        ),
      ),
    );
  }
}
