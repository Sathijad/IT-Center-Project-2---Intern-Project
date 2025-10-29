import 'dart:collection';
import 'package:flutter/material.dart';
import '../api_client.dart';
import '../models/user_profile.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final api = ApiClient();
  UserProfile? me;
  bool loading = true;
  bool saving = false;
  String? err;

  final nameCtl = TextEditingController();
  String locale = 'en';
  final supportedLocales = const ['en', 'si', 'ta'];
  List<String> dropdownLocales = const ['en', 'si', 'ta'];

  // Normalize locale string (e.g., "de_DE" -> "de-DE", handle null/empty)
  String normalizeLocale(String? s) {
    if (s == null || s.trim().isEmpty) return 'en';
    return s.trim().replaceAll('_', '-');
  }

  // Ensure locale is valid - if not supported, either add to items or fallback to 'en'
  void _applyLoadedUser(UserProfile u) {
    final serverLocale = normalizeLocale(u.locale);
    
    // Option A: Include unsupported locale in dropdown (so user can see and change it)
    dropdownLocales = LinkedHashSet<String>.from([serverLocale, ...supportedLocales]).toList();
    
    // Option B: Fallback to 'en' if not supported (uncomment to use):
    // dropdownLocales = [...supportedLocales];
    
    // Set current locale: use server value if it's in dropdown, otherwise use 'en'
    locale = dropdownLocales.contains(serverLocale) ? serverLocale : 'en';
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      err = null;
    });
    try {
      final u = await api.me();
      me = u;
      nameCtl.text = u.displayName;
      _applyLoadedUser(u);
    } catch (e) {
      err = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _save() async {
    setState(() {
      saving = true;
      err = null;
    });
    try {
      // Simple validation
      final dn = nameCtl.text.trim();
      if (dn.isEmpty) {
        throw Exception('Display name is required');
      }
      // PATCH
      final updated = await api.updateMe(displayName: dn, locale: locale);
      me = updated;
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile updated')),
      );
    } catch (e) {
      err = e.toString();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Update failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
        elevation: 0,
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 520),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (err != null)
                          Container(
                            padding: const EdgeInsets.all(16),
                            margin: const EdgeInsets.only(bottom: 16),
                            decoration: BoxDecoration(
                              color: Colors.red[50],
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.red[200]!),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.error_outline,
                                    color: Colors.red[700]),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    err!,
                                    style: TextStyle(color: Colors.red[900]),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        Card(
                          elevation: 2,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: Theme.of(context)
                                            .colorScheme
                                            .primaryContainer,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Icon(
                                        Icons.email_outlined,
                                        color: Theme.of(context)
                                            .colorScheme
                                            .primary,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Email',
                                            style: Theme.of(context)
                                                .textTheme
                                                .labelSmall,
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            me?.email ?? '-',
                                            style: Theme.of(context)
                                                .textTheme
                                                .titleMedium,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        Card(
                          elevation: 2,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(
                                      Icons.person_outline,
                                      color: Theme.of(context)
                                          .colorScheme
                                          .primary,
                                    ),
                                    const SizedBox(width: 8),
                                    const Text(
                                      'Profile Details',
                                      style: TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 20),
                                TextField(
                                  controller: nameCtl,
                                  decoration: InputDecoration(
                                    labelText: 'Display Name',
                                    hintText: 'Enter your display name',
                                    prefixIcon: const Icon(Icons.person),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 20),
                                DropdownButtonFormField<String>(
                                  value: dropdownLocales.contains(locale) ? locale : null,
                                  decoration: InputDecoration(
                                    labelText: 'Locale',
                                    prefixIcon: const Icon(Icons.language),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                  ),
                                  hint: const Text('Select locale'),
                                  items: dropdownLocales
                                      .map((l) => DropdownMenuItem(
                                          value: l, child: Text(l)))
                                      .toList(),
                                  onChanged: (v) =>
                                      setState(() => locale = v ?? 'en'),
                                ),
                              ],
                            ),
                          ),
                        ),
                        if (me?.roles != null && me!.roles.isNotEmpty) ...[
                          const SizedBox(height: 16),
                          Card(
                            elevation: 2,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(20),
                              child: Row(
                                children: [
                                  Icon(Icons.verified_user,
                                      color: Colors.green[600]),
                                  const SizedBox(width: 12),
                                  const Text(
                                    'Your Roles:',
                                    style: TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Wrap(
                                      spacing: 8,
                                      children: me!.roles
                                          .map((role) => Chip(
                                                label: Text(role),
                                                backgroundColor: Colors.green[50],
                                                labelStyle: TextStyle(
                                                  color: Colors.green[900],
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ))
                                          .toList(),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 24),
                        Row(
                          children: [
                            Expanded(
                              child: FilledButton.icon(
                                onPressed: saving ? null : _save,
                                icon: saving
                                    ? const SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor: AlwaysStoppedAnimation<
                                                  Color>(Colors.white),
                                        ),
                                      )
                                    : const Icon(Icons.save),
                                label: Text(saving ? 'Saving...' : 'Save'),
                                style: FilledButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            OutlinedButton.icon(
                              onPressed: loading ? null : _load,
                              icon: const Icon(Icons.refresh),
                              label: const Text('Refresh'),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }

  @override
  void dispose() {
    nameCtl.dispose();
    super.dispose();
  }
}

