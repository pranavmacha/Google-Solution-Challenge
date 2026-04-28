class Threat {
  final String id;
  final String headline;
  final String mode;
  final int severity;
  final double confidence;
  final bool isVerified;
  final String source;
  final DateTime timestamp;
  final String analysis;
  final String? convergenceWarning;
  final double? lat;
  final double? lng;
  final String? location;
  final String category;
  final String recommendedAction;
  final int supplySignalScore;

  const Threat({
    required this.id,
    required this.headline,
    required this.mode,
    required this.severity,
    required this.confidence,
    required this.isVerified,
    required this.source,
    required this.timestamp,
    required this.analysis,
    required this.category,
    required this.recommendedAction,
    required this.supplySignalScore,
    this.convergenceWarning,
    this.lat,
    this.lng,
    this.location,
  });

  factory Threat.fromJson(Map<String, dynamic> json) {
    return Threat(
      id: _string(json['id'], fallback: json['headline']?.hashCode.toString() ?? 'threat'),
      headline: _string(json['headline'], fallback: 'Untitled threat'),
      mode: _string(json['mode'], fallback: 'supply'),
      severity: _int(json['severity']).clamp(0, 5),
      confidence: _double(json['confidence']).clamp(0, 1),
      isVerified: json['is_verified'] == true,
      source: _string(json['source'], fallback: 'GlobalSentry'),
      timestamp: _date(json['timestamp']),
      analysis: _string(json['analysis'], fallback: 'No analysis summary available.'),
      convergenceWarning: _nullableString(json['convergence_warning']),
      lat: _nullableDouble(json['lat']),
      lng: _nullableDouble(json['lng']),
      location: _nullableString(json['location']),
      category: _string(json['category'], fallback: 'Supply Risk'),
      recommendedAction: _string(
        json['recommended_action'],
        fallback: 'Monitor the affected region and review exposure.',
      ),
      supplySignalScore: _int(json['supply_signal_score']).clamp(0, 5),
    );
  }

  bool get hasLocation {
    final latitude = lat;
    final longitude = lng;
    if (latitude == null || longitude == null) return false;
    return latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180 &&
        (latitude != 0 || longitude != 0);
  }

  String get severityLabel {
    switch (severity) {
      case 5:
        return 'Critical';
      case 4:
        return 'High';
      case 3:
        return 'Elevated';
      case 2:
        return 'Watch';
      case 1:
        return 'Low';
      default:
        return 'Pending';
    }
  }

  static String _string(Object? value, {required String fallback}) {
    if (value == null) return fallback;
    final text = value.toString().trim();
    return text.isEmpty ? fallback : text;
  }

  static String? _nullableString(Object? value) {
    if (value == null) return null;
    final text = value.toString().trim();
    return text.isEmpty ? null : text;
  }

  static int _int(Object? value) {
    if (value is int) return value;
    if (value is num) return value.round();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  static double _double(Object? value) {
    if (value is double) return value;
    if (value is num) return value.toDouble();
    return double.tryParse(value?.toString() ?? '') ?? 0;
  }

  static double? _nullableDouble(Object? value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString());
  }

  static DateTime _date(Object? value) {
    final raw = value?.toString();
    if (raw == null || raw.isEmpty) return DateTime.now();
    return DateTime.tryParse(raw)?.toLocal() ?? DateTime.now();
  }
}
