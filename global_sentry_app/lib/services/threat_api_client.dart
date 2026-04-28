import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/threat.dart';

const defaultApiBase = String.fromEnvironment(
  'GLOBALSENTRY_API_BASE',
  defaultValue: 'https://google-solution-challenge-u4m1.onrender.com/api',
);

class ThreatApiClient {
  ThreatApiClient({
    http.Client? httpClient,
    String baseUrl = defaultApiBase,
  })  : _httpClient = httpClient ?? http.Client(),
        _baseUrl = baseUrl.endsWith('/')
            ? baseUrl.substring(0, baseUrl.length - 1)
            : baseUrl;

  final http.Client _httpClient;
  final String _baseUrl;

  Future<List<Threat>> fetchVerifiedThreats({int limit = 50}) async {
    final uri = Uri.parse('$_baseUrl/alerts?limit=$limit');
    final json = await _getJson(uri);
    final items = json['alerts'];
    if (items is! List) return [];
    return items
        .whereType<Map<String, dynamic>>()
        .map(Threat.fromJson)
        .toList();
  }

  Future<List<Threat>> fetchGlobeThreats() async {
    final uri = Uri.parse('$_baseUrl/globe-threats');
    final json = await _getJson(uri);
    final items = json['threats'];
    if (items is! List) return [];
    return items
        .whereType<Map<String, dynamic>>()
        .map(Threat.fromJson)
        .where((threat) => threat.hasLocation)
        .toList();
  }

  Future<Map<String, dynamic>> _getJson(Uri uri) async {
    final response = await _httpClient.get(uri).timeout(const Duration(seconds: 8));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ThreatApiException('Request failed with HTTP ${response.statusCode}.');
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw const ThreatApiException('Unexpected API response.');
    }
    return decoded;
  }
}

class ThreatApiException implements Exception {
  final String message;

  const ThreatApiException(this.message);

  @override
  String toString() => message;
}
