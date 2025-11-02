import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'auth_service.dart';
import 'api_base.dart';
import 'screens/profile_screen.dart';
import 'screens/leave_home_screen.dart';
import 'screens/attendance_screen.dart';

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
                      // Welcome Card
                      Card(
                        key: const ValueKey('dashboard_welcome_card'),
                        elevation: 2,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                Theme.of(context).colorScheme.primaryContainer.withValues(alpha: 0.5),
                                Theme.of(context).colorScheme.surface,
                              ],
                            ),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(20),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: Theme.of(context).colorScheme.primary,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.person,
                                    color: Colors.white,
                                    size: 32,
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Welcome',
                                        style: TextStyle(
                                          fontSize: 14,
                                          color: Colors.grey[600],
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        userData?['displayName'] ?? 'User',
                                        style: const TextStyle(
                                          fontSize: 22,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      if (userData?['email'] != null)
                                        Text(
                                          userData!['email'],
                                          style: TextStyle(
                                            fontSize: 13,
                                            color: Colors.grey[600],
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: _buildActionCard(
                              context,
                              key: const ValueKey('profile_action_card'),
                              icon: Icons.person_outline,
                              title: 'Profile',
                              subtitle: 'View your profile',
                              color: Colors.blue,
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => const ProfileScreen(),
                                  ),
                                ).then((_) => _loadUser());
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildActionCard(
                              context,
                              icon: Icons.refresh_rounded,
                              title: 'Refresh',
                              subtitle: 'Reload data',
                              color: Colors.green,
                              onTap: _loadUser,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      // Phase 2: Leave & Attendance Actions
                      Row(
                        children: [
                          Expanded(
                            child: _buildActionCard(
                              context,
                              icon: Icons.calendar_today,
                              title: 'Leave',
                              subtitle: 'Apply & view leave',
                              color: Colors.purple,
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => const LeaveHomeScreen(),
                                  ),
                                );
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildActionCard(
                              context,
                              icon: Icons.access_time,
                              title: 'Attendance',
                              subtitle: 'Clock in & out',
                              color: Colors.orange,
                              onTap: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => const AttendanceScreen(),
                                  ),
                                );
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _buildInfoCard(context),
                      const SizedBox(height: 12),
                      _buildSecuritySection(),
                    ],
                  ),
                ),
    );
  }

  Widget _buildActionCard(BuildContext context, {
    Key? key,
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      key: key,
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Card(
        elevation: 1,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoCard(BuildContext context) {
    if (userData == null) return const SizedBox.shrink();
    
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: ExpansionTile(
        key: const ValueKey('roles_expansion_tile'),
        leading: const Icon(Icons.info_outline),
        title: const Text(
          'Account Information',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        children: [
          if (userData?['locale'] != null)
            ListTile(
              leading: Icon(Icons.language, color: Colors.blue[300]),
              title: const Text('Locale'),
              trailing: Chip(
                label: Text(
                  userData!['locale'],
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          if (userData?['roles'] != null && (userData!['roles'] as List).isNotEmpty)
            ListTile(
              leading: Icon(Icons.verified_user, color: Colors.green[300]),
              title: const Text('Roles'),
              trailing: Wrap(
                spacing: 4,
                children: (userData!['roles'] as List).map((role) => Chip(
                      label: Text(role.toString()),
                      labelStyle: const TextStyle(fontSize: 11),
                    )).toList(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSecuritySection() {
    return Card(
      elevation: 1,
      color: Colors.blue[50]?.withValues(alpha: 0.3),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
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

}

