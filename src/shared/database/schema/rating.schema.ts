import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { reservations } from './reservation.schema';
import { trips } from './trip.schema';
import { users } from './user.schema';

export const ratings = pgTable('ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  reservationId: uuid('reservation_id')
    .notNull()
    .references(() => reservations.id, { onDelete: 'cascade' }),
  tripId: varchar('trip_id', { length: 50 })
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  cleanlinessRating: integer('cleanliness_rating').notNull(),
  punctualityRating: integer('punctuality_rating').notNull(),
  driverRating: integer('driver_rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
