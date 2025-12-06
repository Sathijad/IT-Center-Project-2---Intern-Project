import 'package:flutter/material.dart';
import '../../models/feedback.dart' as models;
import '../../services/feedback_api_service.dart';
import '../../widgets/feedback/message_bubble.dart';
import '../../widgets/feedback/attachment_tile.dart';

class FeedbackDetailScreen extends StatefulWidget {
  final String feedbackId;

  const FeedbackDetailScreen({
    Key? key,
    required this.feedbackId,
  }) : super(key: key);

  @override
  State<FeedbackDetailScreen> createState() => _FeedbackDetailScreenState();
}

class _FeedbackDetailScreenState extends State<FeedbackDetailScreen> {
  final FeedbackApiService _apiService = FeedbackApiService();
  models.Feedback? _feedback;
  bool _isLoading = true;
  String? _error;
  final TextEditingController _messageController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadFeedback();
  }

  Future<void> _loadFeedback() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final feedback = await _apiService.getFeedbackById(widget.feedbackId);
      setState(() {
        _feedback = feedback;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _addMessage() async {
    final content = _messageController.text.trim();
    if (content.isEmpty) return;

    try {
      await _apiService.addMessage(
        feedbackId: widget.feedbackId,
        content: content,
      );
      _messageController.clear();
      _loadFeedback();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error adding message: $e')),
      );
    }
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Feedback Details'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Error: $_error'),
                      ElevatedButton(
                        onPressed: _loadFeedback,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : _feedback == null
                  ? const Center(child: Text('Feedback not found'))
                  : SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Title and status
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  _feedback!.title,
                                  style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: _getStatusColor().withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  _feedback!.status.replaceAll('_', ' '),
                                  style: TextStyle(
                                    color: _getStatusColor(),
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          // Description
                          Text(
                            'Description',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _feedback!.description,
                            style: const TextStyle(fontSize: 14),
                          ),
                          const SizedBox(height: 16),
                          // Details
                          Row(
                            children: [
                              Expanded(
                                child: _buildDetailItem('Category', _feedback!.category),
                              ),
                              Expanded(
                                child: _buildDetailItem('Priority', _feedback!.priority),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          // Attachments
                          if (_feedback!.attachments != null && _feedback!.attachments!.isNotEmpty) ...[
                            Text(
                              'Attachments',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(height: 8),
                            ..._feedback!.attachments!.map(
                              (attachment) => AttachmentTile(attachment: attachment),
                            ),
                            const SizedBox(height: 16),
                          ],
                          // Messages
                          Text(
                            'Messages',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 8),
                          if (_feedback!.messages != null && _feedback!.messages!.isNotEmpty)
                            ..._feedback!.messages!.map(
                              (message) => MessageBubble(message: message),
                            )
                          else
                            const Text('No messages yet'),
                          const SizedBox(height: 16),
                          // Add message
                          TextField(
                            controller: _messageController,
                            decoration: const InputDecoration(
                              hintText: 'Add a comment...',
                              border: OutlineInputBorder(),
                            ),
                            maxLines: 3,
                          ),
                          const SizedBox(height: 8),
                          ElevatedButton(
                            onPressed: _addMessage,
                            child: const Text('Send Message'),
                          ),
                        ],
                      ),
                    ),
    );
  }

  Widget _buildDetailItem(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: Colors.grey),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  Color _getStatusColor() {
    switch (_feedback?.status) {
      case 'OPEN':
        return Colors.yellow;
      case 'IN_PROGRESS':
        return Colors.blue;
      case 'RESOLVED':
        return Colors.green;
      case 'CLOSED':
        return Colors.grey;
      case 'REJECTED':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}

