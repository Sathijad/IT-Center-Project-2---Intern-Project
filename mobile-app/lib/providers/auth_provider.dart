import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthProvider extends ChangeNotifier {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  
  String? _accessToken;
  String? _idToken;
  Map<String, dynamic>? _user;

  String? get accessToken => _accessToken;
  Map<String, dynamic>? get user => _user;
  bool get isAuthenticated => _accessToken != null;

  AuthProvider() {
    _loadTokens();
  }

  Future<void> _loadTokens() async {
    _accessToken = await _storage.read(key: 'access_token');
    _idToken = await _storage.read(key: 'id_token');
    
    if (_accessToken != null) {
      final userStr = await _storage.read(key: 'user');
      if (userStr != null) {
        _user = _parseUser(userStr);
      }
    }
    
    notifyListeners();
  }

  Future<void> login(String accessToken, String idToken, Map<String, dynamic> userData) async {
    _accessToken = accessToken;
    _idToken = idToken;
    _user = userData;
    
    await _storage.write(key: 'access_token', value: accessToken);
    await _storage.write(key: 'id_token', value: idToken);
    await _storage.write(key: 'user', value: userData.toString());
    
    notifyListeners();
  }

  Future<void> logout() async {
    _accessToken = null;
    _idToken = null;
    _user = null;
    
    await _storage.deleteAll();
    notifyListeners();
  }

  Map<String, dynamic> _parseUser(String userStr) {
    // Simple parsing - in production use JSON parsing
    try {
      return {'email': userStr};
    } catch (e) {
      return {};
    }
  }
}

