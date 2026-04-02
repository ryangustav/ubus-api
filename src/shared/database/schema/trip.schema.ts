import {
  pgTable,
  varchar,
  date,
  timestamp,
  integer,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tripDirectionEnum, tripStatusEnum } from './enums';
import { routes, buses } from './fleet.schema';
import { users } from './user.schema';

export const trips = pgTable('trips', {
  id: varchar('id', { length: 50 }).primaryKey(), // Smart Key: YYYYMMDD-ONIBUS-SHIFT
  tripDate: date('trip_date').notNull(),
  shift: varchar('shift', { length: 10 }).notNull(), // MORNING, AFTERNOON, NIGHT
  direction: tripDirectionEnum('direction').notNull(),
  routeId: uuid('route_id')
    .notNull()
    .references(() => routes.id),
  busId: uuid('bus_id')
    .notNull()
    .references(() => buses.id),
  driverId: uuid('driver_id').references(() => users.id),
  leaderIds: uuid('leader_ids')
    .array()
    .default(sql`'{}'`),
  actualCapacity: integer('actual_capacity').notNull(),
  votingOpenAt: timestamp('voting_open_at', {
    withTimezone: true,
  }).notNull(),
  votingCloseAt: timestamp('voting_close_at', {
    withTimezone: true,
  }).notNull(),
  status: tripStatusEnum('status').default('SCHEDULED'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
