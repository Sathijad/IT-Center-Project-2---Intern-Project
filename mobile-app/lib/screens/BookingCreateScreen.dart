import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../src/booking_api.dart';
import '../src/auth_service.dart';
import 'MyBookingsScreen.dart';

class BookingCreateScreen extends StatefulWidget {
  final int? roomId;

  const BookingCreateScreen({super.key, this.roomId});

  @override
  State<BookingCreateScreen> createState() => _BookingCreateScreenState();
}

class _BookingCreateScreenState extends State<BookingCreateScreen> {
  final _api = BookingApi();
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _attendeesController = TextEditingController();

  DateTime? _startDate;
  TimeOfDay? _startTime;
  DateTime? _endDate;
  TimeOfDay? _endTime;
  int? _selectedRoomId;
  List<Map<String, dynamic>> _rooms = [];
  bool _loadingRooms = false;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _selectedRoomId = widget.roomId;
    if (_selectedRoomId == null) {
      _loadRooms();
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _attendeesController.dispose();
    super.dispose();
  }

  Future<void> _loadRooms() async {
    setState(() => _loadingRooms = true);
    try {
      final rooms = await _api.getRooms();
      setState(() {
        _rooms = rooms;
        _loadingRooms = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loadingRooms = false;
      });
    }
  }

  Future<void> _selectDate(DateTime initialDate, bool isStart) async {
    final date = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date != null) {
      setState(() {
        if (isStart) {
          _startDate = date;
        } else {
          _endDate = date;
        }
      });
    }
  }

  Future<void> _selectTime(TimeOfDay initialTime, bool isStart) async {
    final time = await showTimePicker(
      context: context,
      initialTime: initialTime ?? TimeOfDay.now(),
    );
    if (time != null) {
      setState(() {
        if (isStart) {
          _startTime = time;
        } else {
          _endTime = time;
        }
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_selectedRoomId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a room')),
      );
      return;
    }

    if (_startDate == null || _startTime == null || _endDate == null || _endTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select start and end date/time')),
      );
      return;
    }

    final startTs = DateTime(
      _startDate!.year,
      _startDate!.month,
      _startDate!.day,
      _startTime!.hour,
      _startTime!.minute,
    );

    final endTs = DateTime(
      _endDate!.year,
      _endDate!.month,
      _endDate!.day,
      _endTime!.hour,
      _endTime!.minute,
    );

    if (endTs.isBefore(startTs) || endTs.isAtSameMomentAs(startTs)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('End time must be after start time')),
      );
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final attendees = _attendeesController.text
          .split(',')
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList();

      final idempotencyKey = 'mobile-${_selectedRoomId}-${startTs.toIso8601String()}-${DateTime.now().millisecondsSinceEpoch}';

      await _api.createBooking(
        roomId: _selectedRoomId!,
        startTs: startTs,
        endTs: endTs,
        title: _titleController.text.trim().isEmpty ? null : _titleController.text.trim(),
        attendees: attendees.isEmpty ? null : attendees,
        idempotencyKey: idempotencyKey,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Booking created successfully')),
        );
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => const MyBookingsScreen(),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _submitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Booking'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Room selection
              if (widget.roomId == null) ...[
                DropdownButtonFormField<int>(
                  value: _selectedRoomId,
                  decoration: const InputDecoration(
                    labelText: 'Room *',
                    border: OutlineInputBorder(),
                  ),
                  items: _rooms.map((room) {
                    final roomId = room['id'] is int 
                        ? room['id'] as int 
                        : int.tryParse(room['id'].toString()) ?? 0;
                    return DropdownMenuItem<int>(
                      value: roomId,
                      child: Text(room['name'] ?? 'Unknown'),
                    );
                  }).toList(),
                  onChanged: (value) {
                    setState(() => _selectedRoomId = value);
                  },
                  validator: (value) {
                    if (value == null) return 'Please select a room';
                    return null;
                  },
                ),
                const SizedBox(height: 16),
              ] else
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text('Room ID: ${widget.roomId}'),
                  ),
                ),

              // Title
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: 'Title',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),

              // Start date/time
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => _selectDate(_startDate ?? DateTime.now(), true),
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: 'Start Date *',
                          border: OutlineInputBorder(),
                        ),
                        child: Text(
                          _startDate != null
                              ? DateFormat('yyyy-MM-dd').format(_startDate!)
                              : 'Select date',
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: InkWell(
                      onTap: () => _selectTime(_startTime ?? TimeOfDay.now(), true),
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: 'Start Time *',
                          border: OutlineInputBorder(),
                        ),
                        child: Text(
                          _startTime != null
                              ? _startTime!.format(context)
                              : 'Select time',
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // End date/time
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => _selectDate(_endDate ?? DateTime.now(), false),
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: 'End Date *',
                          border: OutlineInputBorder(),
                        ),
                        child: Text(
                          _endDate != null
                              ? DateFormat('yyyy-MM-dd').format(_endDate!)
                              : 'Select date',
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: InkWell(
                      onTap: () => _selectTime(_endTime ?? TimeOfDay.now(), false),
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: 'End Time *',
                          border: OutlineInputBorder(),
                        ),
                        child: Text(
                          _endTime != null
                              ? _endTime!.format(context)
                              : 'Select time',
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Attendees
              TextFormField(
                controller: _attendeesController,
                decoration: const InputDecoration(
                  labelText: 'Attendees (comma-separated emails)',
                  border: OutlineInputBorder(),
                  helperText: 'e.g., email1@example.com, email2@example.com',
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 24),

              // Error message
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Text(
                    _error!,
                    style: TextStyle(color: Colors.red[700]),
                  ),
                ),

              // Submit button
              ElevatedButton(
                onPressed: _submitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _submitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Create Booking'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

