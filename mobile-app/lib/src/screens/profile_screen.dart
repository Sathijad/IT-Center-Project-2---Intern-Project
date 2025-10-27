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
  final locales = const ['en', 'si', 'ta'];

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
      locale = u.locale.isNotEmpty ? u.locale : 'en';
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
      appBar: AppBar(title: const Text('My Profile')),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 520),
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (err != null)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Text(
                                err!,
                                style: const TextStyle(color: Colors.red),
                              ),
                            ),
                          Text('Email',
                              style: Theme.of(context).textTheme.labelMedium),
                          const SizedBox(height: 4),
                          Text(me?.email ?? '-',
                              style: Theme.of(context).textTheme.bodyLarge),
                          const SizedBox(height: 16),
                          TextField(
                            controller: nameCtl,
                            decoration: const InputDecoration(
                              labelText: 'Display name',
                              hintText: 'e.g., John Doe',
                              border: OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 16),
                          InputDecorator(
                            decoration: const InputDecoration(
                              labelText: 'Locale',
                              border: OutlineInputBorder(),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: locale,
                                items: locales
                                    .map((l) => DropdownMenuItem(
                                        value: l, child: Text(l)))
                                    .toList(),
                                onChanged: (v) =>
                                    setState(() => locale = v ?? 'en'),
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: FilledButton(
                                  onPressed: saving ? null : _save,
                                  child: saving
                                      ? const SizedBox(
                                          height: 20,
                                          width: 20,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                          ),
                                        )
                                      : const Text('Save'),
                                ),
                              ),
                              const SizedBox(width: 8),
                              OutlinedButton(
                                  onPressed: loading ? null : _load,
                                  child: const Text('Refresh')),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text('Roles: ${me?.roles.join(", ") ?? "-"}',
                              style: Theme.of(context).textTheme.bodySmall),
                        ],
                      ),
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

