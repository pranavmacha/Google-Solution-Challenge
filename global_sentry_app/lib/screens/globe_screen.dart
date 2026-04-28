import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:latlong2/latlong.dart';

import '../models/threat.dart';
import '../theme/app_theme.dart';

class GlobeScreen extends StatefulWidget {
  const GlobeScreen({
    super.key,
    required this.threats,
    required this.isLoading,
    required this.error,
    required this.onRefresh,
    required this.onThreatSelected,
  });

  final List<Threat> threats;
  final bool isLoading;
  final String? error;
  final Future<void> Function() onRefresh;
  final ValueChanged<Threat> onThreatSelected;

  @override
  State<GlobeScreen> createState() => _GlobeScreenState();
}

class _GlobeScreenState extends State<GlobeScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      color: AppTheme.epiColor,
      onRefresh: widget.onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
        children: [
          _GlobePanel(
            threats: widget.threats,
            pulse: _pulseController,
            onThreatSelected: widget.onThreatSelected,
          ),
          const SizedBox(height: 14),
          _MapLegend(threats: widget.threats, isLoading: widget.isLoading),
          const SizedBox(height: 14),
          if (widget.error != null)
            _MapMessage(message: widget.error!, isError: true),
          if (widget.error != null) const SizedBox(height: 14),
          if (widget.threats.isEmpty && !widget.isLoading)
            const _MapMessage(
              message: 'No geocoded verified threats yet.',
              isError: false,
            )
          else
            ...widget.threats.map(
              (threat) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _MappedThreatRow(
                  threat: threat,
                  onTap: () => widget.onThreatSelected(threat),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _GlobePanel extends StatelessWidget {
  const _GlobePanel({
    required this.threats,
    required this.pulse,
    required this.onThreatSelected,
  });

  final List<Threat> threats;
  final Animation<double> pulse;
  final ValueChanged<Threat> onThreatSelected;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final mapHeight = constraints.maxWidth < 380 ? 330.0 : 420.0;
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
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
                  const Icon(Icons.satellite_alt_rounded,
                      color: AppTheme.successGreen, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    'Satellite Threat Map',
                    style: GoogleFonts.spaceGrotesk(
                      color: AppTheme.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${threats.length} pins',
                    style: GoogleFonts.orbitron(
                      color: AppTheme.textMuted,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: SizedBox(
                  height: mapHeight,
                  child: Stack(
                    children: [
                      FlutterMap(
                        options: const MapOptions(
                          initialCenter: LatLng(22, 78),
                          initialZoom: 4,
                          minZoom: 3,
                          maxZoom: 18,
                          backgroundColor: Color(0xFF020617),
                        ),
                        children: [
                          TileLayer(
                            urlTemplate:
                                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                            maxNativeZoom: 18,
                            userAgentPackageName:
                                'com.globalsentry.global_sentry_app',
                          ),
                          TileLayer(
                            urlTemplate:
                                'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
                            subdomains: const ['a', 'b', 'c', 'd'],
                            maxNativeZoom: 18,
                            retinaMode: true,
                            userAgentPackageName:
                                'com.globalsentry.global_sentry_app',
                          ),
                          MarkerLayer(
                            markers: [
                              for (final threat in threats
                                  .where((threat) => threat.hasLocation))
                                Marker(
                                  point: LatLng(threat.lat!, threat.lng!),
                                  width: 42,
                                  height: 42,
                                  child: _ThreatMapMarker(
                                    pulse: pulse,
                                    onTap: () => onThreatSelected(threat),
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                      const Positioned.fill(
                        child: IgnorePointer(
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              border: Border.fromBorderSide(
                                BorderSide(color: Color(0x662563EB)),
                              ),
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  Color(0x33020B18),
                                  Color(0x00020B18),
                                  Color(0x66020B18),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        left: 12,
                        right: 12,
                        bottom: 12,
                        child: _MapStatusBar(threatCount: threats.length),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ThreatMapMarker extends StatelessWidget {
  const _ThreatMapMarker({
    required this.pulse,
    required this.onTap,
  });

  static const Color _markerColor = Color(0xFF10B981);

  final Animation<double> pulse;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: AnimatedBuilder(
        animation: pulse,
        builder: (context, _) {
          final ringSize = 22 + 16 * pulse.value;
          return Center(
            child: Stack(
              alignment: Alignment.center,
              children: [
                Container(
                  width: ringSize,
                  height: ringSize,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: _markerColor.withValues(alpha: 1 - pulse.value),
                      width: 1.5,
                    ),
                  ),
                ),
                Container(
                  width: 18,
                  height: 18,
                  decoration: BoxDecoration(
                    color: _markerColor.withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                ),
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: _markerColor,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: _markerColor.withValues(alpha: 0.72),
                        blurRadius: 12,
                        spreadRadius: 1,
                      ),
                    ],
                  ),
                ),
                Container(
                  width: 3,
                  height: 3,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _MapStatusBar extends StatelessWidget {
  const _MapStatusBar({required this.threatCount});

  final int threatCount;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xE60F172A),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: Color(0xFF818CF8),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(color: Color(0xAA818CF8), blurRadius: 8),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              'Monitoring: India',
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.spaceGrotesk(
                color: const Color(0xFFE2E8F0),
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Container(
              width: 1,
              height: 18,
              color: Colors.white.withValues(alpha: 0.16)),
          const SizedBox(width: 10),
          Text(
            '$threatCount geocoded alerts',
            style: GoogleFonts.spaceGrotesk(
              color: const Color(0xFFCBD5E1),
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _MapLegend extends StatelessWidget {
  const _MapLegend({
    required this.threats,
    required this.isLoading,
  });

  final List<Threat> threats;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final critical = threats.where((threat) => threat.severity >= 5).length;
    final high = threats.where((threat) => threat.severity == 4).length;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Row(
        children: [
          _LegendItem(
              label: 'Critical', count: critical, color: AppTheme.dangerRed),
          _LegendItem(
              label: 'High', count: high, color: AppTheme.warningYellow),
          _LegendItem(
              label: 'Total', count: threats.length, color: AppTheme.epiColor),
          if (isLoading)
            const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                  strokeWidth: 2, color: AppTheme.epiColor),
            ),
        ],
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  const _LegendItem({
    required this.label,
    required this.count,
    required this.color,
  });

  final String label;
  final int count;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Row(
        children: [
          Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 7),
          Flexible(
            child: Text(
              '$label $count',
              overflow: TextOverflow.ellipsis,
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

class _MappedThreatRow extends StatelessWidget {
  const _MappedThreatRow({
    required this.threat,
    required this.onTap,
  });

  final Threat threat;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.severityColor(threat.severity);

    return Material(
      color: AppTheme.bgCard,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(13),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.borderColor),
          ),
          child: Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.location_on_rounded, color: color, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      threat.location ?? 'Mapped threat',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.spaceGrotesk(
                        color: AppTheme.textPrimary,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      threat.headline,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.spaceGrotesk(
                        color: AppTheme.textMuted,
                        fontSize: 12,
                        height: 1.25,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded,
                  color: AppTheme.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}

class _MapMessage extends StatelessWidget {
  const _MapMessage({
    required this.message,
    required this.isError,
  });

  final String message;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    final color = isError ? AppTheme.dangerRed : AppTheme.textMuted;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color:
                isError ? color.withValues(alpha: 0.24) : AppTheme.borderColor),
      ),
      child: Text(
        message,
        style: GoogleFonts.spaceGrotesk(
          color: AppTheme.textSecondary,
          fontSize: 13,
          height: 1.35,
        ),
      ),
    );
  }
}
