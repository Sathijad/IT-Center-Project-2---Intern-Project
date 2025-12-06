import 'package:flutter/material.dart';
import '../../models/feedback.dart' as models;

class FeedbackCard extends StatelessWidget {
  final models.Feedback feedback;
  final VoidCallback onTap;

  const FeedbackCard({
    Key? key,
    required this.feedback,
    required this.onTap,
  }) : super(key: key);

  Color _getStatusColor() {
    switch (feedback.status) {
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

  Color _getPriorityColor() {
    switch (feedback.priority) {
      case 'LOW':
        return Colors.grey;
      case 'MEDIUM':
        return Colors.blue;
      case 'HIGH':
        return Colors.orange;
      case 'URGENT':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      feedback.title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getStatusColor().withOpacity(0.2),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      feedback.status.replaceAll('_', ' '),
                      style: TextStyle(
                        color: _getStatusColor(),
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                feedback.description,
                style: const TextStyle(fontSize: 14, color: Colors.grey),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Chip(
                    label: Text(
                      feedback.category,
                      style: const TextStyle(fontSize: 10),
                    ),
                    padding: EdgeInsets.zero,
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: _getPriorityColor().withOpacity(0.2),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      feedback.priority,
                      style: TextStyle(
                        color: _getPriorityColor(),
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    _formatDate(feedback.createdAt),
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      return 'Today';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} days ago';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }
}

