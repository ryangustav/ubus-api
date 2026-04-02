import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { reservationStatusEnum } from './enums';
import { trips } from './trip.schema';
import { users } from './user.schema';

export const reservations = pgTable(
  'reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: varchar('trip_id', { length: 50 })
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    seatNumber: integer('seat_number'), // NULL = excess bus
    isRideShare: boolean('is_ride_share').default(false), // Flag for guillotine
    status: reservationStatusEnum('status').default('CONFIRMED'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('unique_seat_per_trip').on(table.tripId, table.seatNumber),
  ],
);
