import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/feedback.dart';
import '../../services/feedback_api_service.dart';
import '../../widgets/feedback/feedback_card.dart';
import 'feedback_detail_screen.dart';

class FeedbackListScreen extends StatefulWidget {
  const FeedbackListScreen({Key? key}) : super(key: key);

  @override
  State<FeedbackListScreen> createState() => _FeedbackListScreenState();
}

class _FeedbackListScreenState extends State<FeedbackListScreen> {
  final FeedbackApiService _apiService = FeedbackApiService();
  List<Feedback> _feedbacks = [];
  bool _isLoading = true;
  String? _error;
  String? _selectedStatus;
  int _page = 1;
  final int _pageSize = 20;
  bool _hasMore = true;

  @override
  void initState() {
    super.initState();
    _loadFeedbacks();
  }

  Future<void> _loadFeedbacks({bool refresh = false}) async {
    if (refresh) {
      _page = 1;
      _hasMore = true;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final response = await _apiService.getMyFeedback(
        status: _selectedStatus,
        page: _page,
        size: _pageSize,
      );

      final items = (response['items'] as List)
          .map((item) => Feedback.fromJson(item))
          .toList();

      setState(() {
        if (refresh) {
          _feedbacks = items;
        } else {
          _feedbacks.addAll(items);
        }
        _hasMore = items.length == _pageSize;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _refresh() async {
    await _loadFeedbacks(refresh: true);
  }

  void _loadMore() {
    if (!_isLoading && _hasMore) {
      setState(() {
        _page++;
      });
      _loadFeedbacks();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Feedback'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              Navigator.pushNamed(context, '/feedback/submit');
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Status filter
          Container(
            padding: const EdgeInsets.all(8),
            child: DropdownButton<String>(
              value: _selectedStatus,
              hint: const Text('Filter by status'),
              items: const [
                DropdownMenuItem(value: null, child: Text('All')),
                DropdownMenuItem(value: 'OPEN', child: Text('Open')),
                DropdownMenuItem(value: 'IN_PROGRESS', child: Text('In Progress')),
                DropdownMenuItem(value: 'RESOLVED', child: Text('Resolved')),
                DropdownMenuItem(value: 'CLOSED', child: Text('Closed')),
              ],
              onChanged: (value) {
                setState(() {
                  _selectedStatus = value;
                });
                _loadFeedbacks(refresh: true);
              },
            ),
          ),
          // Feedback list
          Expanded(
            child: _error != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Error: $_error'),
                        ElevatedButton(
                          onPressed: _refresh,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  )
                : _isLoading && _feedbacks.isEmpty
                    ? const Center(child: CircularProgressIndicator())
                    : _feedbacks.isEmpty
                        ? const Center(child: Text('No feedback found'))
                        : RefreshIndicator(
                            onRefresh: _refresh,
                            child: ListView.builder(
                              itemCount: _feedbacks.length + (_hasMore ? 1 : 0),
                              itemBuilder: (context, index) {
                                if (index == _feedbacks.length) {
                                  _loadMore();
                                  return const Center(
                                    child: Padding(
                                      padding: EdgeInsets.all(8.0),
                                      child: CircularProgressIndicator(),
                                    ),
                                  );
                                }
                                return FeedbackCard(
                                  feedback: _feedbacks[index],
                                  onTap: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (context) => FeedbackDetailScreen(
                                          feedbackId: _feedbacks[index].feedbackId,
                                        ),
                                      ),
                                    );
                                  },
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}

