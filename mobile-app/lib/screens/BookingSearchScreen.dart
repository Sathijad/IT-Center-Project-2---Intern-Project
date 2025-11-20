import 'package:flutter/material.dart';
import '../src/booking_api.dart';
import '../src/auth_service.dart';
import 'BookingAvailabilityScreen.dart';
import 'BookingCreateScreen.dart';

class BookingSearchScreen extends StatefulWidget {
  const BookingSearchScreen({super.key});

  @override
  State<BookingSearchScreen> createState() => _BookingSearchScreenState();
}

class _BookingSearchScreenState extends State<BookingSearchScreen> {
  final _api = BookingApi();
  final _searchController = TextEditingController();
  final _capacityController = TextEditingController();
  
  List<Map<String, dynamic>> _rooms = [];
  List<Map<String, dynamic>> _filteredRooms = [];
  bool _loading = false;
  String? _error;
  int? _selectedCapacity;
  String? _selectedLocation;

  @override
  void initState() {
    super.initState();
    _loadRooms();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _capacityController.dispose();
    super.dispose();
  }

  Future<void> _loadRooms() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final token = await AuthService.instance.getAccessToken();
      if (token == null || token.isEmpty) {
        throw Exception('Not authenticated');
      }

      final rooms = await _api.getRooms();
      setState(() {
        _rooms = rooms;
        _filteredRooms = rooms;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _applyFilters() {
    setState(() {
      _filteredRooms = _rooms.where((room) {
        final name = (room['name'] ?? '').toString().toLowerCase();
        final location = (room['location'] ?? '').toString().toLowerCase();
        final capacity = room['capacity'] as int? ?? 0;
        final searchTerm = _searchController.text.toLowerCase();
        final locationFilter = _selectedLocation?.toLowerCase() ?? '';

        if (searchTerm.isNotEmpty && !name.contains(searchTerm)) {
          return false;
        }

        if (_selectedCapacity != null && capacity < _selectedCapacity!) {
          return false;
        }

        if (locationFilter.isNotEmpty && !location.contains(locationFilter)) {
          return false;
        }

        return true;
      }).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Book a Room'),
      ),
      body: Column(
        children: [
          // Search and filters
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: const InputDecoration(
                    labelText: 'Search rooms',
                    prefixIcon: Icon(Icons.search),
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (_) => _applyFilters(),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _capacityController,
                        decoration: const InputDecoration(
                          labelText: 'Min capacity',
                          border: OutlineInputBorder(),
                          isDense: true,
                        ),
                        keyboardType: TextInputType.number,
                        onChanged: (value) {
                          _selectedCapacity = value.isEmpty ? null : int.tryParse(value);
                          _applyFilters();
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        decoration: const InputDecoration(
                          labelText: 'Location',
                          border: OutlineInputBorder(),
                          isDense: true,
                        ),
                        onChanged: (value) {
                          _selectedLocation = value.isEmpty ? null : value;
                          _applyFilters();
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Results
          Expanded(
            child: _loading
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
                              onPressed: _loadRooms,
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : _filteredRooms.isEmpty
                        ? const Center(
                            child: Text('No rooms found'),
                          )
                        : ListView.builder(
                            itemCount: _filteredRooms.length,
                            itemBuilder: (context, index) {
                              final room = _filteredRooms[index];
                              final roomId = room['id'] as int;
                              final name = room['name'] ?? 'Unknown Room';
                              final capacity = room['capacity'] ?? 0;
                              final location = room['location'] ?? 'No location';
                              final amenities = (room['amenities'] as List? ?? [])
                                  .map((a) => a.toString())
                                  .toList();

                              return Card(
                                margin: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 8,
                                ),
                                child: ListTile(
                                  title: Text(name),
                                  subtitle: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const SizedBox(height: 4),
                                      Text('Capacity: $capacity'),
                                      if (location != 'No location') Text('Location: $location'),
                                      if (amenities.isNotEmpty)
                                        Text(
                                          'Amenities: ${amenities.join(", ")}',
                                          style: const TextStyle(fontSize: 12),
                                        ),
                                    ],
                                  ),
                                  trailing: const Icon(Icons.arrow_forward),
                                  onTap: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (context) => BookingAvailabilityScreen(roomId: roomId),
                                      ),
                                    );
                                  },
                                ),
                              );
                            },
                          ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const BookingCreateScreen(),
            ),
          );
        },
        child: const Icon(Icons.add),
        tooltip: 'Create Booking',
      ),
    );
  }
}

