import 'package:flutter/material.dart';
import '../src/scheduler_api.dart';

class ScheduleOverviewScreen extends StatefulWidget {
  final int userId;
  const ScheduleOverviewScreen({super.key, required this.userId});

  @override
  State<ScheduleOverviewScreen> createState() => _ScheduleOverviewScreenState();
}

class _ScheduleOverviewScreenState extends State<ScheduleOverviewScreen> {
  final SchedulerApi _api = SchedulerApi();
  bool _loading = true;
  String? _error;
  List<dynamic> _schedules = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _api.fetchSchedules(userId: widget.userId);
      setState(() => _schedules = data);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Weekly Schedule'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _ErrorView(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemBuilder: (_, index) {
                      final item = _schedules[index] as Map<String, dynamic>;
                      return _ScheduleCard(schedule: item);
                    },
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemCount: _schedules.length,
                  ),
                ),
    );
  }
}

class _ScheduleCard extends StatelessWidget {
  final Map<String, dynamic> schedule;
  const _ScheduleCard({required this.schedule});

  @override
  Widget build(BuildContext context) {
    final title = schedule['title'] as String? ?? 'Shift';
    final description = schedule['description'] as String? ?? '';
    final start = DateTime.tryParse(schedule['startTime'] ?? '');
    final end = DateTime.tryParse(schedule['endTime'] ?? '');
    final status = schedule['status'] as String? ?? '';

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.schedule),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
                Chip(
                  label: Text(status),
                  backgroundColor: Theme.of(context).colorScheme.surfaceVariant,
                ),
              ],
            ),
            if (description.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(description, style: const TextStyle(fontSize: 13, color: Colors.black54)),
            ],
            if (start != null && end != null) ...[
              const SizedBox(height: 8),
              Text(
                '${start.toLocal()} - ${end.toLocal()}',
                style: const TextStyle(fontSize: 12, color: Colors.black54),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.redAccent),
          const SizedBox(height: 12),
          Text(message, textAlign: TextAlign.center),
          const SizedBox(height: 12),
          FilledButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}

