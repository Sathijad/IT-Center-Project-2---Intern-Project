import 'package:flutter/material.dart';
import '../src/booking_api.dart';
import '../src/auth_service.dart';
import 'BookingCreateScreen.dart';

class BookingAvailabilityScreen extends StatefulWidget {
  final int roomId;

  const BookingAvailabilityScreen({super.key, required this.roomId});

  @override
  State<BookingAvailabilityScreen> createState() => _BookingAvailabilityScreenState();
}

class _BookingAvailabilityScreenState extends State<BookingAvailabilityScreen> {
  final _api = BookingApi();
  Map<String, dynamic>? _room;
  Map<String, dynamic>? _availability;
  bool _loading = false;
  String? _error;
  DateTime _selectedDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _loadRoom();
    _loadAvailability();
  }

  Future<void> _loadRoom() async {
    try {
      final room = await _api.getRoom(widget.roomId);
      if (mounted) {
        setState(() => _room = room);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString());
      }
    }
  }

  Future<void> _loadAvailability() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final token = await AuthService.instance.getAccessToken();
      if (token == null || token.isEmpty) {
        throw Exception('Not authenticated');
      }

      final start = DateTime(_selectedDate.year, _selectedDate.month, _selectedDate.day);
      final end = start.add(const Duration(days: 1));

      final availability = await _api.getRoomAvailability(widget.roomId, start, end);
      if (mounted) {
        setState(() {
          _availability = availability;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_room?['name'] ?? 'Room Availability'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
                      const SizedBox(height: 16),
                      Text(
                        _error!,
                        style: TextStyle(color: Colors.red[700]),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadAvailability,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Room info
                      if (_room != null)
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _room!['name'] ?? 'Unknown',
                                  style: Theme.of(context).textTheme.titleLarge,
                                ),
                                const SizedBox(height: 8),
                                Text('Capacity: ${_room!['capacity'] ?? 0}'),
                                if (_room!['location'] != null)
                                  Text('Location: ${_room!['location']}'),
                              ],
                            ),
                          ),
                        ),

                      const SizedBox(height: 16),

                      // Date selector
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Date: ${_selectedDate.toLocal().toString().split(' ')[0]}',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ),
                          TextButton(
                            onPressed: () async {
                              final date = await showDatePicker(
                                context: context,
                                initialDate: _selectedDate,
                                firstDate: DateTime.now(),
                                lastDate: DateTime.now().add(const Duration(days: 365)),
                              );
                              if (date != null) {
                                setState(() => _selectedDate = date);
                                _loadAvailability();
                              }
                            },
                            child: const Text('Change Date'),
                          ),
                        ],
                      ),

                      const SizedBox(height: 16),

                      // Availability
                      if (_availability != null) ...[
                        Text(
                          'Bookings',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        ...((_availability!['bookings'] as List? ?? [])
                            .map((b) => b as Map<String, dynamic>)
                            .map((booking) => Card(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  color: Colors.red[50],
                                  child: ListTile(
                                    title: Text(booking['title'] ?? 'Booking'),
                                    subtitle: Text(
                                      '${_formatTime(booking['start'])} - ${_formatTime(booking['end'])}',
                                    ),
                                  ),
                                ))),

                        const SizedBox(height: 16),
                        Text(
                          'Blackouts',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        ...((_availability!['blackouts'] as List? ?? [])
                            .map((b) => b as Map<String, dynamic>)
                            .map((blackout) => Card(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  color: Colors.orange[50],
                                  child: ListTile(
                                    title: const Text('Blackout Period'),
                                    subtitle: Text(
                                      '${_formatTime(blackout['start'])} - ${_formatTime(blackout['end'])}',
                                    ),
                                    trailing: blackout['reason'] != null
                                        ? Text(blackout['reason'])
                                        : null,
                                  ),
                                ))),
                      ],

                      const SizedBox(height: 24),

                      // Book button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => BookingCreateScreen(roomId: widget.roomId),
                              ),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                          child: const Text('Book This Room'),
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }

  String _formatTime(String? isoString) {
    if (isoString == null) return '';
    try {
      final date = DateTime.parse(isoString).toLocal();
      return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return isoString;
    }
  }
}

