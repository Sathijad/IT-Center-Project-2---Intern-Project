import 'package:flutter/material.dart';
import 'event_repository.dart';
import 'models.dart';

class EventFeedScreen extends StatefulWidget {
  const EventFeedScreen({super.key});

  @override
  State<EventFeedScreen> createState() => _EventFeedScreenState();
}

class _EventFeedScreenState extends State<EventFeedScreen> {
  final repo = EventRepository();
  late Future<List<EventItem>> _future;

  @override
  void initState() {
    super.initState();
    _future = repo.fetchFeed();
  }

  Future<void> _refresh() async {
    setState(() {
      _future = repo.fetchFeed();
    });
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Announcements'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refresh,
          ),
        ],
      ),
      body: FutureBuilder<List<EventItem>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 8),
                  Text(snapshot.error.toString()),
                  const SizedBox(height: 8),
                  FilledButton(onPressed: _refresh, child: const Text('Retry')),
                ],
              ),
            );
          }
          final events = snapshot.data ?? [];
          if (events.isEmpty) {
            return const Center(child: Text('No announcements yet.'));
          }
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemBuilder: (context, index) {
                final event = events[index];
                return Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: ExpansionTile(
                    key: ValueKey(event.id),
                    title: Text(event.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(event.summary),
                    childrenPadding: const EdgeInsets.all(16),
                    children: [
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          children: event.tags.map((tag) => Chip(label: Text(tag))).toList(),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(event.body),
                      const SizedBox(height: 8),
                      Text(
                        'Published ${event.createdAt}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                );
              },
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemCount: events.length,
            ),
          );
        },
      ),
    );
  }
}

