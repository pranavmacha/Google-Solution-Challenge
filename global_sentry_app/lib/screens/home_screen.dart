import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/threat.dart';
import '../services/threat_api_client.dart';
import '../theme/app_theme.dart';
import 'globe_screen.dart';
import 'threat_detail_screen.dart';
import 'threat_feed_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, this.apiClient});

  final ThreatApiClient? apiClient;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final ThreatApiClient _apiClient;
  int _selectedIndex = 0;
  bool _isLoading = true;
  String? _error;
  List<Threat> _threats = const [];
  List<Threat> _mappedThreats = const [];

  @override
  void initState() {
    super.initState();
    _apiClient = widget.apiClient ?? ThreatApiClient();
    _refreshThreats();
  }

  Future<void> _refreshThreats() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        _apiClient.fetchVerifiedThreats(),
        _apiClient.fetchGlobeThreats(),
      ]);

      if (!mounted) return;
      setState(() {
        _threats = results[0];
        _mappedThreats = results[1];
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _isLoading = false;
      });
    }
  }

  void _openThreat(Threat threat) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ThreatDetailScreen(threat: threat),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final existingIds = _threats.map((threat) => threat.id).toSet();
    final threats = [
      ..._threats,
      ..._mappedThreats.where((threat) => !existingIds.contains(threat.id)),
    ];

    return Scaffold(
      backgroundColor: AppTheme.bgDeep,
      appBar: _buildAppBar(),
      body: IndexedStack(
        index: _selectedIndex,
        children: [
          ThreatFeedScreen(
            threats: threats,
            mappedThreats: _mappedThreats,
            isLoading: _isLoading,
            error: _error,
            onRefresh: _refreshThreats,
            onThreatSelected: _openThreat,
          ),
          GlobeScreen(
            threats: _mappedThreats,
            isLoading: _isLoading,
            error: _error,
            onRefresh: _refreshThreats,
            onThreatSelected: _openThreat,
          ),
        ],
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: AppTheme.bgCard,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      titleSpacing: 16,
      title: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            padding: const EdgeInsets.all(5),
            decoration: BoxDecoration(
              color: AppTheme.bgCardLighter,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppTheme.borderColor),
            ),
            child: Image.asset('assets/images/logo.png'),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'GlobalSentry',
                style: GoogleFonts.orbitron(
                  color: AppTheme.textPrimary,
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1,
                ),
              ),
              Text(
                'Threat Display',
                style: GoogleFonts.spaceGrotesk(
                  color: AppTheme.textMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ],
      ),
      actions: [
        Padding(
          padding: const EdgeInsets.only(right: 4),
          child: _StatusPill(
            isLoading: _isLoading,
            hasError: _error != null,
          ),
        ),
        IconButton(
          tooltip: 'Refresh',
          icon: const Icon(Icons.refresh_rounded),
          onPressed: _isLoading ? null : _refreshThreats,
        ),
      ],
      bottom: const PreferredSize(
        preferredSize: Size.fromHeight(1),
        child: Divider(height: 1, color: AppTheme.borderColor),
      ),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.bgCard,
        border: Border(top: BorderSide(color: AppTheme.borderColor)),
      ),
      child: NavigationBar(
        backgroundColor: AppTheme.bgCard,
        indicatorColor: AppTheme.epiGlow,
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() => _selectedIndex = index);
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.list_alt_rounded),
            selectedIcon: Icon(Icons.list_alt_rounded),
            label: 'Threats',
          ),
          NavigationDestination(
            icon: Icon(Icons.public_rounded),
            selectedIcon: Icon(Icons.public_rounded),
            label: 'Globe',
          ),
        ],
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({
    required this.isLoading,
    required this.hasError,
  });

  final bool isLoading;
  final bool hasError;

  @override
  Widget build(BuildContext context) {
    final color = hasError
        ? AppTheme.dangerRed
        : isLoading
            ? AppTheme.warningYellow
            : AppTheme.successGreen;
    final label = hasError
        ? 'OFFLINE'
        : isLoading
            ? 'SYNC'
            : 'LIVE';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.28)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: GoogleFonts.orbitron(
              color: color,
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
            ),
          ),
        ],
      ),
    );
  }
}
