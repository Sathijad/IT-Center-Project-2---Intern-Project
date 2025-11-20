import { z } from 'zod';
import { createHandler } from '../../common/handler';
import { parseQuery } from '../../common/validation';
import { BookingRepository } from '../../repositories/bookingRepository';
import { RoomRepository } from '../../repositories/roomRepository';
import { successResponse } from '../../common/response';
import { ValidationError } from '../../common/errors';

const bookingRepository = new BookingRepository();
const roomRepository = new RoomRepository();

const querySchema = z.object({
  room_id: z.string().regex(/^\d+$/).transform(Number).optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
});

function generateICS(bookings: Array<{ id: number; title: string | null; startTs: Date; endTs: Date; roomName: string }>): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//IT Center//Booking System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const booking of bookings) {
    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:booking-${booking.id}@itcenter`);
    lines.push(`DTSTART:${formatDate(booking.startTs)}`);
    lines.push(`DTEND:${formatDate(booking.endTs)}`);
    lines.push(`SUMMARY:${booking.title || 'Room Booking'} - ${booking.roomName}`);
    lines.push(`DESCRIPTION:Room booking in ${booking.roomName}`);
    lines.push(`DTSTAMP:${formatDate(new Date())}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

export const handler = createHandler(async ({ event, user }) => {
  const origin = event.headers?.origin || event.headers?.Origin;
  const query = parseQuery(querySchema, event.queryStringParameters);

  if (!query.start || !query.end) {
    throw new ValidationError('start and end query parameters are required (ISO 8601 format)');
  }

  const startTs = new Date(query.start);
  const endTs = new Date(query.end);

  if (endTs <= startTs) {
    throw new ValidationError('end must be after start');
  }

  // Get bookings
  const bookings = await bookingRepository.search({
    roomId: query.room_id,
    startDate: query.start,
    endDate: query.end,
    status: 'CONFIRMED',
  });

  // Get room names
  const roomIds = Array.from(new Set(bookings.map((b) => b.roomId)));
  const rooms = await Promise.all(roomIds.map((id) => roomRepository.findById(id)));

  const bookingsWithRooms = bookings.map((booking) => {
    const room = rooms.find((r) => r?.id === booking.roomId);
    return {
      id: booking.id,
      title: booking.title,
      startTs: booking.startTs,
      endTs: booking.endTs,
      roomName: room?.name || `Room ${booking.roomId}`,
    };
  });

  const icsContent = generateICS(bookingsWithRooms);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="bookings.ics"',
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Credentials': 'true',
    },
    body: icsContent,
  };
});

