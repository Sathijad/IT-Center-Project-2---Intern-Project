import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';

void main() {
  group('Profile Widget Tests', () {
    testWidgets('Save button disabled until field changes', (WidgetTester tester) async {
      bool hasChanged = false;
      
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                return Column(
                  children: [
                    TextField(
                      onChanged: (value) {
                        setState(() {
                          hasChanged = value.isNotEmpty && value != 'Original';
                        });
                      },
                      decoration: InputDecoration(labelText: 'Display Name'),
                    ),
                    ElevatedButton(
                      onPressed: hasChanged ? () {} : null,
                      child: Text('Save'),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      );

      // Initially save button should be disabled
      final saveButton = find.widgetWithText(ElevatedButton, 'Save');
      expect(tester.widget<ElevatedButton>(saveButton).onPressed, isNull);

      // Type in the field
      await tester.enterText(find.byType(TextField), 'Updated Name');
      await tester.pump();

      // Save button should now be enabled
      expect(tester.widget<ElevatedButton>(saveButton).onPressed, isNotNull);
    });

    testWidgets('Save button enabled after edit', (WidgetTester tester) async {
      bool saveCalled = false;
      bool hasChanged = false;
      
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                return Column(
                  children: [
                    TextField(
                      onChanged: (value) {
                        setState(() {
                          hasChanged = value.isNotEmpty;
                        });
                      },
                      decoration: InputDecoration(labelText: 'Display Name'),
                    ),
                    ElevatedButton(
                      onPressed: hasChanged 
                        ? () { saveCalled = true; }
                        : null,
                      child: Text('Save'),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      );

      // Type in the field
      await tester.enterText(find.byType(TextField), 'New Value');
      await tester.pump();

      // Tap the save button
      await tester.tap(find.text('Save'));
      await tester.pump();

      // Verify save was called
      expect(saveCalled, isTrue);
    });

    testWidgets('Save button calls handler on tap', (WidgetTester tester) async {
      int tapCount = 0;
      
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                TextField(
                  onChanged: (value) {},
                  decoration: InputDecoration(labelText: 'Locale'),
                ),
                ElevatedButton(
                  onPressed: () { tapCount++; },
                  child: Text('Save Profile'),
                ),
              ],
            ),
          ),
        ),
      );

      // Tap the save button
      await tester.tap(find.text('Save Profile'));
      await tester.pump();

      // Verify handler was called
      expect(tapCount, equals(1));
    });
  });
}

