import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import '../auth_service.dart';
import '../api_base.dart';

class TrainingOverviewScreen extends StatefulWidget {
  final int userId;

  const TrainingOverviewScreen({super.key, required this.userId});

  @override
  State<TrainingOverviewScreen> createState() => _TrainingOverviewScreenState();
}

class _TrainingOverviewScreenState extends State<TrainingOverviewScreen> {
  List<dynamic>? assignments;
  String? error;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _loadAssignments();
  }

  Future<void> _loadAssignments() async {
    setState(() {
      loading = true;
      error = null;
    });

    try {
      final token = await AuthService.instance.getAccessToken();
      if (token == null || token.isEmpty) {
        setState(() {
          error = 'Not authenticated';
          loading = false;
        });
        return;
      }

      // Note: This endpoint may need to be implemented in the backend
      // For now, we'll use a placeholder approach
      final response = await http.get(
        Uri.parse('${ApiBase.performanceBase}/api/v1/training/assignments?user_id=${widget.userId}'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          assignments = data is List ? data : [];
          loading = false;
        });
      } else if (response.statusCode == 404) {
        // Endpoint might not exist yet, show empty state
        setState(() {
          assignments = [];
          loading = false;
        });
      } else {
        setState(() {
          error = 'Failed to load assignments: ${response.statusCode}';
          loading = false;
        });
      }
    } catch (e) {
      setState(() {
        error = 'Error: $e';
        loading = false;
      });
    }
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not launch $url')),
        );
      }
    }
  }

  Future<void> _updateProgress(String assignmentId, double progress, String? status) async {
    try {
      final token = await AuthService.instance.getAccessToken();
      if (token == null || token.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Not authenticated. Please sign in again.'),
              backgroundColor: Colors.red,
              duration: Duration(seconds: 3),
            ),
          );
        }
        return;
      }

      // Convert progress to integer (backend expects int, not double)
      final progressValue = progress.toInt();
      
      // Backend expects UpdateAssignmentRequest directly (not wrapped in "request")
      // Based on the contract: UpdateAssignmentRequest(Status?, Progress?, CompletedAt?)
      final body = <String, dynamic>{
        'progress': progressValue,
      };
      
      // Add status if provided (backend expects enum string like "InProgress", "Completed", etc.)
      if (status != null) {
        // Convert our status format to backend enum format
        String backendStatus;
        switch (status.toUpperCase()) {
          case 'ASSIGNED':
            backendStatus = 'Assigned';
            break;
          case 'IN_PROGRESS':
            backendStatus = 'InProgress';
            break;
          case 'COMPLETED':
            backendStatus = 'Completed';
            break;
          case 'NOT_STARTED':
            backendStatus = 'NotStarted';
            break;
          case 'OVERDUE':
            backendStatus = 'Overdue';
            break;
          default:
            backendStatus = status; // Use as-is
        }
        body['status'] = backendStatus;
      }

      final url = '${ApiBase.performanceBase}/api/v1/training/assignments/$assignmentId';
      
      print('Updating progress - URL: $url');
      print('Request body: ${json.encode(body)}');

      final response = await http.patch(
        Uri.parse(url),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode(body),
      );

      print('Response status: ${response.statusCode}');
      print('Response body: ${response.body}');

      if (response.statusCode == 200 || response.statusCode == 204) {
        // Parse the response to check if progress was actually updated
        try {
          final responseData = json.decode(response.body);
          final updatedProgress = responseData['progress'];
          
          // Check if progress was actually updated
          if (updatedProgress != null) {
            final updatedValue = updatedProgress is num ? updatedProgress.toDouble() : double.tryParse(updatedProgress.toString()) ?? 0.0;
            final expectedValue = progressValue is int ? progressValue.toDouble() : progressValue;
            
            // Allow small floating point differences
            if ((updatedValue - expectedValue).abs() < 0.01) {
              // Progress was successfully updated
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Progress updated successfully'),
                    backgroundColor: Colors.green,
                    duration: Duration(seconds: 2),
                  ),
                );
              }
              // Refresh the assignments list
              await _loadAssignments();
            } else {
              // Progress wasn't updated - the backend might not be processing it
              // This could be a backend issue or wrong request format
              if (mounted) {
                // Show a prominent alert dialog
                showDialog(
                  context: context,
                  barrierDismissible: true,
                  builder: (BuildContext dialogContext) {
                    return AlertDialog(
                      icon: const Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 48),
                      title: const Text(
                        'Backend Update Issue',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      content: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'The progress update was sent but may not have been saved by the backend.',
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.orange[50],
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.orange[200]!),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.send, size: 16, color: Colors.orange),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Sent: ${expectedValue.toStringAsFixed(1)}%',
                                      style: const TextStyle(fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    const Icon(Icons.download, size: 16, color: Colors.red),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Received: ${updatedValue.toStringAsFixed(1)}%',
                                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.red),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Please check your backend logs and API implementation. The request was sent successfully, but the progress value was not updated in the database.',
                            style: TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                        ],
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.of(dialogContext).pop(),
                          child: const Text('OK'),
                        ),
                      ],
                    );
                  },
                );
                
                // Also show a snackbar for quick reference
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('⚠️ Backend issue: Sent ${expectedValue.toStringAsFixed(1)}% but got ${updatedValue.toStringAsFixed(1)}%'),
                    backgroundColor: Colors.red,
                    duration: const Duration(seconds: 5),
                  ),
                );
              }
              // Still refresh to get latest data
              await _loadAssignments();
            }
          } else {
            // No progress in response - might be a different response format
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Update sent, refreshing data...'),
                  backgroundColor: Colors.blue,
                  duration: Duration(seconds: 2),
                ),
              );
            }
            await _loadAssignments();
          }
        } catch (e) {
          // If we can't parse response, assume success and refresh
          print('Error parsing response: $e');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Progress update sent'),
                backgroundColor: Colors.green,
                duration: Duration(seconds: 2),
              ),
            );
          }
          await _loadAssignments();
        }
      } else if (response.statusCode == 404) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Assignment not found. It may have been deleted.'),
              backgroundColor: Colors.red,
              duration: Duration(seconds: 3),
            ),
          );
        }
      } else if (response.statusCode == 403) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('You do not have permission to update this assignment.'),
              backgroundColor: Colors.red,
              duration: Duration(seconds: 3),
            ),
          );
        }
      } else if (response.statusCode == 400) {
        String errorMessage = 'Bad Request: Invalid data format';
        if (response.body.isNotEmpty) {
          try {
            final errorBody = json.decode(response.body);
            if (errorBody is Map) {
              if (errorBody.containsKey('message')) {
                errorMessage = errorBody['message'].toString();
              } else if (errorBody.containsKey('error')) {
                errorMessage = errorBody['error'].toString();
              } else if (errorBody.containsKey('errors')) {
                // Handle validation errors
                final errors = errorBody['errors'];
                if (errors is List && errors.isNotEmpty) {
                  errorMessage = errors.join(', ');
                } else if (errors is Map) {
                  errorMessage = errors.values.join(', ');
                }
              }
            } else if (errorBody is String) {
              errorMessage = errorBody;
            }
          } catch (e) {
            errorMessage = 'Bad Request: ${response.body}';
          }
        }
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(errorMessage),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 4),
            ),
          );
        }
      } else {
        String errorMessage = 'Failed to update progress: ${response.statusCode}';
        if (response.body.isNotEmpty) {
          try {
            final errorBody = json.decode(response.body);
            if (errorBody is Map && errorBody.containsKey('message')) {
              errorMessage = errorBody['message'].toString();
            } else if (errorBody is Map && errorBody.containsKey('error')) {
              errorMessage = errorBody['error'].toString();
            }
          } catch (e) {
            // If JSON decode fails, use default message
          }
        }
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(errorMessage),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error updating progress: ${e.toString()}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  void _showUpdateProgressDialog(BuildContext context, Map<String, dynamic> assignment, int index) {
    // Try different possible field names for assignment ID
    final assignmentId = assignment['id'] ?? 
                         assignment['assignmentId'] ?? 
                         assignment['trainingAssignmentId'] ??
                         assignment['assignment_id'] ??
                         assignment['training_assignment_id'];
    
    if (assignmentId == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Assignment ID not found'),
            backgroundColor: Colors.red,
            duration: Duration(seconds: 3),
          ),
        );
      }
      return;
    }

    // Assignment ID can be either a UUID string or an integer
    final id = assignmentId.toString();

    final currentProgress = assignment['progress'] != null
        ? (assignment['progress'] is num
            ? (assignment['progress'] as num).toDouble()
            : double.tryParse(assignment['progress'].toString()) ?? 0.0)
        : 0.0;
    
    // Normalize status to uppercase to match dropdown values
    final rawStatus = assignment['status']?.toString() ?? 'ASSIGNED';
    final currentStatus = rawStatus.toUpperCase().replaceAll(' ', '_');
    
    // Map common status variations to dropdown values
    String normalizedStatus = currentStatus;
    if (currentStatus == 'ASSIGNED' || currentStatus == 'PENDING') {
      normalizedStatus = 'ASSIGNED';
    } else if (currentStatus == 'IN_PROGRESS' || currentStatus == 'INPROGRESS' || currentStatus == 'IN PROGRESS') {
      normalizedStatus = 'IN_PROGRESS';
    } else if (currentStatus == 'COMPLETED' || currentStatus == 'DONE') {
      normalizedStatus = 'COMPLETED';
    } else if (currentStatus == 'NOT_STARTED' || currentStatus == 'NOTSTARTED' || currentStatus == 'NOT STARTED') {
      normalizedStatus = 'NOT_STARTED';
    } else if (currentStatus == 'OVERDUE') {
      normalizedStatus = 'OVERDUE';
    } else {
      // Default to ASSIGNED if status doesn't match
      normalizedStatus = 'ASSIGNED';
    }

    double progressValue = currentProgress.clamp(0.0, 100.0);
    String selectedStatus = normalizedStatus;

    showDialog(
      context: context,
      builder: (BuildContext dialogContext) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text('Update Course Progress'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      assignment['courseTitle'] ?? 'Unknown Course',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 20),
                    // Progress Slider
                    Text(
                      'Progress: ${progressValue.toStringAsFixed(progressValue % 1 == 0 ? 0 : 1)}%',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Slider(
                      value: progressValue,
                      min: 0,
                      max: 100,
                      divisions: 100,
                      label: '${progressValue.toStringAsFixed(progressValue % 1 == 0 ? 0 : 1)}%',
                      onChanged: (value) {
                        setState(() {
                          progressValue = value;
                          // Auto-update status based on progress
                          if (value >= 100) {
                            selectedStatus = 'COMPLETED';
                          } else if (value > 0) {
                            selectedStatus = 'IN_PROGRESS';
                          } else {
                            selectedStatus = 'NOT_STARTED';
                          }
                        });
                      },
                    ),
                    const SizedBox(height: 20),
                    // Status Dropdown
                    const Text(
                      'Status:',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: selectedStatus,
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'NOT_STARTED', child: Text('Not Started')),
                        DropdownMenuItem(value: 'ASSIGNED', child: Text('Assigned')),
                        DropdownMenuItem(value: 'IN_PROGRESS', child: Text('In Progress')),
                        DropdownMenuItem(value: 'COMPLETED', child: Text('Completed')),
                        DropdownMenuItem(value: 'OVERDUE', child: Text('Overdue')),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() {
                            selectedStatus = value;
                            // Auto-update progress if status is completed
                            if (value == 'COMPLETED' && progressValue < 100) {
                              progressValue = 100.0;
                            }
                          });
                        }
                      },
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: () async {
                    Navigator.of(dialogContext).pop();
                    await _updateProgress(id, progressValue, selectedStatus);
                  },
                  child: const Text('Update'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  String _getStatusColor(String? status) {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'green';
      case 'IN_PROGRESS':
        return 'blue';
      case 'OVERDUE':
        return 'red';
      case 'ASSIGNED':
        return 'orange';
      default:
        return 'grey';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Training'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadAssignments,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
                      const SizedBox(height: 16),
                      Text(
                        error!,
                        style: TextStyle(color: Colors.red[700]),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      FilledButton(
                        onPressed: _loadAssignments,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : assignments == null || assignments!.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.school_outlined, size: 64, color: Colors.grey[400]),
                          const SizedBox(height: 16),
                          const Text(
                            'No training assignments',
                            style: TextStyle(fontSize: 16, color: Colors.grey),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Your assigned training courses will appear here',
                            style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadAssignments,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: assignments!.length,
                        itemBuilder: (context, index) {
                          final assignment = assignments![index];
                          final status = assignment['status']?.toString().toUpperCase() ?? 'UNKNOWN';
                          final progress = assignment['progress'] != null 
                              ? (assignment['progress'] is num 
                                  ? assignment['progress'] as num 
                                  : int.tryParse(assignment['progress'].toString()) ?? 0)
                              : null;
                          final statusColor = _getStatusColor(status);
                          final statusText = _formatStatusText(status);
                          
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            elevation: 2,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Course Title
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          assignment['courseTitle'] ?? 'Unknown Course',
                                          style: const TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 12,
                                          vertical: 6,
                                        ),
                                        decoration: BoxDecoration(
                                          color: statusColor == 'green'
                                              ? Colors.green[100]
                                              : statusColor == 'red'
                                                  ? Colors.red[100]
                                                  : statusColor == 'blue'
                                                      ? Colors.blue[100]
                                                      : Colors.orange[100],
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: Text(
                                          statusText,
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                            color: statusColor == 'green'
                                                ? Colors.green[800]
                                                : statusColor == 'red'
                                                    ? Colors.red[800]
                                                    : statusColor == 'blue'
                                                        ? Colors.blue[800]
                                                        : Colors.orange[800],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 16),
                                  // Progress Section - More Prominent
                                  if (progress != null)
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Flexible(
                                              child: Row(
                                                children: [
                                                  Icon(
                                                    Icons.trending_up,
                                                    size: 18,
                                                    color: Colors.blue[700],
                                                  ),
                                                  const SizedBox(width: 6),
                                                  const Flexible(
                                                    child: Text(
                                                      'Progress',
                                                      style: TextStyle(
                                                        fontSize: 14,
                                                        fontWeight: FontWeight.w600,
                                                        color: Colors.black87,
                                                      ),
                                                      overflow: TextOverflow.ellipsis,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Container(
                                              padding: const EdgeInsets.symmetric(
                                                horizontal: 10,
                                                vertical: 4,
                                              ),
                                              decoration: BoxDecoration(
                                                color: Colors.blue[50],
                                                borderRadius: BorderRadius.circular(12),
                                              ),
                                              child: Text(
                                                '${progress.toStringAsFixed(progress % 1 == 0 ? 0 : 1)}%',
                                                style: TextStyle(
                                                  fontSize: 14,
                                                  fontWeight: FontWeight.bold,
                                                  color: Colors.blue[800],
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        ClipRRect(
                                          borderRadius: BorderRadius.circular(8),
                                          child: LinearProgressIndicator(
                                            value: progress / 100,
                                            minHeight: 8,
                                            backgroundColor: Colors.grey[200],
                                            valueColor: AlwaysStoppedAnimation<Color>(
                                              statusColor == 'green'
                                                  ? Colors.green
                                                  : statusColor == 'red'
                                                      ? Colors.red
                                                      : statusColor == 'blue'
                                                          ? Colors.blue
                                                          : Colors.orange,
                                            ),
                                          ),
                                        ),
                                      ],
                                    )
                                  else
                                    Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 8),
                                      child: Row(
                                        children: [
                                          Icon(
                                            Icons.info_outline,
                                            size: 16,
                                            color: Colors.grey[600],
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            'Progress not available',
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: Colors.grey[600],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  const SizedBox(height: 12),
                                  // Additional Course Details
                                  if (assignment['courseCode'] != null)
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 8),
                                      child: Row(
                                        children: [
                                          Icon(Icons.code, size: 16, color: Colors.grey[600]),
                                          const SizedBox(width: 8),
                                          Flexible(
                                            child: Text(
                                              'Code: ${assignment['courseCode']}',
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: Colors.grey[700],
                                              ),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  if (assignment['dueDate'] != null)
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 8),
                                      child: Row(
                                        children: [
                                          Icon(Icons.calendar_today,
                                              size: 16, color: Colors.grey[600]),
                                          const SizedBox(width: 8),
                                          Flexible(
                                            child: Text(
                                              'Due: ${_formatDate(assignment['dueDate'])}',
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: Colors.grey[700],
                                              ),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  if (assignment['assignedDate'] != null)
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 8),
                                      child: Row(
                                        children: [
                                          Icon(Icons.event, size: 16, color: Colors.grey[600]),
                                          const SizedBox(width: 8),
                                          Flexible(
                                            child: Text(
                                              'Assigned: ${_formatDate(assignment['assignedDate'])}',
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: Colors.grey[700],
                                              ),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  if (assignment['description'] != null)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 8),
                                      child: Text(
                                        assignment['description'],
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey[600],
                                          fontStyle: FontStyle.italic,
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  const SizedBox(height: 12),
                                  // Update Progress Button
                                  SizedBox(
                                    width: double.infinity,
                                    child: OutlinedButton.icon(
                                      onPressed: () => _showUpdateProgressDialog(context, assignment, index),
                                      icon: const Icon(Icons.edit, size: 18),
                                      label: const Text('Update Progress'),
                                      style: OutlinedButton.styleFrom(
                                        padding: const EdgeInsets.symmetric(vertical: 12),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }

  String _formatStatusText(String? status) {
    if (status == null) return 'Unknown';
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return 'Completed';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'OVERDUE':
        return 'Overdue';
      case 'ASSIGNED':
        return 'Assigned';
      case 'NOT_STARTED':
        return 'Not Started';
      default:
        return status.replaceAll('_', ' ').split(' ').map((word) {
          if (word.isEmpty) return '';
          return word[0].toUpperCase() + word.substring(1).toLowerCase();
        }).join(' ');
    }
  }

  String _formatDate(String? dateString) {
    if (dateString == null) return 'No due date';
    try {
      final date = DateTime.parse(dateString);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return dateString;
    }
  }
}

