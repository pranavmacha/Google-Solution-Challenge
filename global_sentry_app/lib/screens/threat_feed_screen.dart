import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/threat.dart';
import '../theme/app_theme.dart';
import '../widgets/threat_card.dart';

class ThreatFeedScreen extends StatelessWidget {
  const ThreatFeedScreen({
    super.key,
    required this.threats,
    required this.mappedThreats,
    required this.isLoading,
    required this.error,
    required this.onRefresh,
    required this.onThreatSelected,
  });

  final List<Threat> threats;
  final List<Threat> mappedThreats;
  final bool isLoading;
  final String? error;
  final Future<void> Function() onRefresh;
  final ValueChanged<Threat> onThreatSelected;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: AppTheme.epiColor,
      onRefresh: onRefresh,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
            sliver: SliverToBoxAdapter(
              child: _FeedSummary(
                threatCount: threats.length,
                mappedCount: mappedThreats.length,
                isLoading: isLoading,
                hasError: error != null,
              ),
            ),
          ),
          if (error != null)
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverToBoxAdapter(child: _ErrorBanner(message: error!)),
            ),
          if (isLoading && threats.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: _LoadingState(),
            )
          else if (threats.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: _EmptyState(),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 20),
              sliver: SliverList.separated(
                itemCount: threats.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final threat = threats[index];
                  return ThreatCard(
                    threat: threat,
                    onTap: () => onThreatSelected(threat),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _FeedSummary extends StatelessWidget {
  const _FeedSummary({
    required this.threatCount,
    required this.mappedCount,
    required this.isLoading,
    required this.hasError,
  });

  final int threatCount;
  final int mappedCount;
  final bool isLoading;
  final bool hasError;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Row(
        children: [
          _MetricTile(
            value: threatCount.toString(),
            label: 'Verified',
            icon: Icons.verified_rounded,
            color: AppTheme.successGreen,
          ),
          _Divider(),
          _MetricTile(
            value: mappedCount.toString(),
            label: 'Mapped',
            icon: Icons.location_on_rounded,
            color: AppTheme.epiColor,
          ),
          _Divider(),
          _MetricTile(
            value: hasError
                ? 'No'
                : isLoading
                    ? 'Sync'
                    : 'Yes',
            label: 'API',
            icon: hasError ? Icons.cloud_off_rounded : Icons.cloud_done_rounded,
            color: hasError ? AppTheme.dangerRed : AppTheme.supplyColor,
          ),
        ],
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({
    required this.value,
    required this.label,
    required this.icon,
    required this.color,
  });

  final String value;
  final String label;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(height: 6),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.orbitron(
              color: color,
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
          Text(
            label,
            style: GoogleFonts.spaceGrotesk(
              color: AppTheme.textMuted,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 46,
      margin: const EdgeInsets.symmetric(horizontal: 8),
      color: AppTheme.borderColor,
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.dangerRed.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.dangerRed.withValues(alpha: 0.24)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline_rounded, color: AppTheme.dangerRed, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: GoogleFonts.spaceGrotesk(
                color: AppTheme.textSecondary,
                fontSize: 12,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LoadingState extends StatelessWidget {
  const _LoadingState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(color: AppTheme.epiColor, strokeWidth: 2),
          const SizedBox(height: 14),
          Text(
            'Syncing verified threats',
            style: GoogleFonts.spaceGrotesk(
              color: AppTheme.textSecondary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 58,
              height: 58,
              decoration: BoxDecoration(
                color: AppTheme.bgCard,
                shape: BoxShape.circle,
                border: Border.all(color: AppTheme.borderColor),
              ),
              child: const Icon(Icons.shield_outlined, color: AppTheme.textMuted),
            ),
            const SizedBox(height: 14),
            Text(
              'No verified threats yet',
              style: GoogleFonts.spaceGrotesk(
                color: AppTheme.textPrimary,
                fontSize: 17,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Run analysis on the website. Verified threats will appear here automatically.',
              textAlign: TextAlign.center,
              style: GoogleFonts.spaceGrotesk(
                color: AppTheme.textMuted,
                fontSize: 13,
                height: 1.45,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
