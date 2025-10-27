import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'auth_service.dart';
import 'api_base.dart';
import 'screens/profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, dynamic>? userData;
  String? err;
  bool busy = true;

  @override
  void initState() {
    super.initState();
    _loadUser();
  }

  Future<void> _loadUser() async {
    setState(() { busy = true; err = null; });
    try {
      final token = await AuthService.instance.getAccessToken();
      if (token == null || token.isEmpty) {
        setState(() => err = 'Not authenticated');
      } else {
        final res = await http.get(
          Uri.parse('${ApiBase.base}/api/v1/me'),
          headers: {'Authorization': 'Bearer $token'},
        );
        
        if (res.statusCode == 200) {
          userData = json.decode(res.body);
        } else if (res.statusCode == 401 || res.statusCode == 403) {
          err = 'Please sign in again';
        } else if (res.statusCode >= 500) {
          err = 'Server error, try later';
        } else {
          err = 'Error: ${res.statusCode}';
        }
      }
    } catch (e) {
      err = e.toString();
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Employee Home'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign Out',
            onPressed: () async {
              await AuthService.instance.signOut();
            },
          ),
        ],
      ),
      body: busy
          ? const Center(child: CircularProgressIndicator())
          : err != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
                      const SizedBox(height: 16),
                      Text(
                        err!,
                        style: TextStyle(color: Colors.red[700]),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: _loadUser,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Profile',
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 16),
                              if (userData?['displayName'] != null)
                                _buildInfoRow('Name', userData!['displayName']),
                              if (userData?['email'] != null)
                                _buildInfoRow('Email', userData!['email']),
                              if (userData?['locale'] != null)
                                _buildInfoRow('Locale', userData!['locale']),
                              if (userData?['roles'] != null)
                                _buildInfoRow('Roles', (userData!['roles'] as List).join(', ')),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: _loadUser,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Refresh'),
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const ProfileScreen(),
                              ),
                            ).then((_) => _loadUser());
                          },
                          icon: const Icon(Icons.person),
                          label: const Text('Edit Profile'),
                        ),
                      ),
                      const SizedBox(height: 12),
                      _buildSecuritySection(),
                    ],
                  ),
                ),
    );
  }

  Widget _buildSecuritySection() {
    return Card(
      color: Colors.blue[50],
      child: const Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.security, size: 20, color: Colors.blue),
                SizedBox(width: 8),
                Text(
                  'Security Settings',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            SizedBox(height: 8),
            Text(
              'MFA is handled automatically by Cognito Hosted UI. When you sign in, you\'ll be prompted to set up MFA if it\'s required.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.grey,
              ),
            ),
          ),
          Expanded(
            child: SelectableText(value),
          ),
        ],
      ),
    );
  }
}

