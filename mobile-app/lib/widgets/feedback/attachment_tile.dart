import 'package:flutter/material.dart';
import '../../models/feedback.dart';

class AttachmentTile extends StatelessWidget {
  final FeedbackAttachment attachment;

  const AttachmentTile({
    Key? key,
    required this.attachment,
  }) : super(key: key);

  IconData _getFileIcon() {
    final mimeType = attachment.mimeType?.toLowerCase() ?? '';
    if (mimeType.contains('image')) {
      return Icons.image;
    } else if (mimeType.contains('pdf')) {
      return Icons.picture_as_pdf;
    } else if (mimeType.contains('word') || mimeType.contains('document')) {
      return Icons.description;
    } else {
      return Icons.attach_file;
    }
  }

  String _formatFileSize(int? bytes) {
    if (bytes == null) return 'Unknown size';
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(_getFileIcon()),
      title: Text(attachment.fileName),
      subtitle: Text(_formatFileSize(attachment.fileSize)),
      trailing: attachment.downloadUrl != null
          ? IconButton(
              icon: const Icon(Icons.download),
              onPressed: () {
                // Open download URL
                // In a real implementation, you'd use url_launcher or similar
              },
            )
          : null,
    );
  }
}

