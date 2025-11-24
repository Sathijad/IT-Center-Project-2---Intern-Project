import 'package:flutter/material.dart';
import '../src/scheduler_api.dart';

class MyTasksScreen extends StatefulWidget {
  final int assigneeId;
  const MyTasksScreen({super.key, required this.assigneeId});

  @override
  State<MyTasksScreen> createState() => _MyTasksScreenState();
}

class _MyTasksScreenState extends State<MyTasksScreen> {
  final SchedulerApi _api = SchedulerApi();
  List<dynamic> _tasks = [];
  bool _loading = true;
  String? _error;
  final Map<String, TextEditingController> _commentControllers = {};

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _api.fetchTasks(assigneeId: widget.assigneeId);
      setState(() => _tasks = data);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submitComment(String taskId) async {
    final controller = _commentControllers[taskId];
    if (controller == null || controller.text.isEmpty) return;
    try {
      await _api.addTaskComment(taskId: taskId, body: controller.text);
      controller.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Comment posted')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to comment: $e')),
      );
    }
  }

  @override
  void dispose() {
    for (final controller in _commentControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Tasks'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetch,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _tasks.length,
                  itemBuilder: (context, index) {
                    final task = _tasks[index] as Map<String, dynamic>;
                    final id = task['taskId'] as String? ?? '';
                    _commentControllers[id] ??= TextEditingController();
                    return Card(
                      margin: const EdgeInsets.only(bottom: 16),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    task['title'] ?? 'Task',
                                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                Chip(label: Text(task['status'] ?? 'Pending')),
                              ],
                            ),
                            if (task['description'] != null) ...[
                              const SizedBox(height: 8),
                              Text(task['description'], style: const TextStyle(fontSize: 13, color: Colors.black54)),
                            ],
                            if (task['dueDate'] != null) ...[
                              const SizedBox(height: 8),
                              Text('Due ${DateTime.tryParse(task['dueDate'])?.toLocal().toString().split('.').first ?? ''}',
                                  style: const TextStyle(fontSize: 12, color: Colors.black54)),
                            ],
                            const SizedBox(height: 12),
                            TextField(
                              controller: _commentControllers[id],
                              decoration: InputDecoration(
                                labelText: 'Add comment',
                                suffixIcon: IconButton(
                                  icon: const Icon(Icons.send),
                                  onPressed: () => _submitComment(id),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}

