import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  unique,
  doublePrecision,
  jsonb,
} from 'drizzle-orm/pg-core';
import { municipalities } from './municipality.schema';
import { users } from './user.schema';

export const routes = pgTable(
  'routes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    municipalityId: uuid('municipality_id')
      .notNull()
      .references(() => municipalities.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    /** Week days: 0=sun, 1=mon, 2=tue, 3=wed, 4=thu, 5=fri, 6=sat */
    weekDays: integer('week_days').array().notNull().default([]),
    /** Time when voting opens (HH:mm) */
    votingOpenTime: varchar('voting_open_time', { length: 5 })
      .notNull()
      .default('06:00'),
    /** Time when voting closes (HH:mm) */
    votingCloseTime: varchar('voting_close_time', {
      length: 5,
    })
      .notNull()
      .default('07:30'),
    departureTimeOutbound: varchar('departure_time_outbound', { length: 5 }),
    departureTimeInbound: varchar('departure_time_inbound', { length: 5 }),
    active: boolean('is_active').default(true),
    requiresElevator: boolean('requires_elevator').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('uq_route_name_municipality').on(table.municipalityId, table.name),
  ],
);

export const buses = pgTable(
  'buses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    municipalityId: uuid('municipality_id')
      .notNull()
      .references(() => municipalities.id, { onDelete: 'cascade' }),
    /** Driver who registered the bus */
    driverId: uuid('driver_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    identificationNumber: varchar('identification_number', {
      length: 20,
    }).notNull(),
    plate: varchar('plate', { length: 10 }).notNull(),
    standardCapacity: integer('standard_capacity').notNull(),
    hasBathroom: boolean('has_bathroom').default(false),
    hasAirConditioning: boolean('has_air_conditioning').default(false),
    /** Active for capacity calculation */
    active: boolean('is_active').default(true),
    hasElevator: boolean('has_elevator').default(false).notNull(),
    preferentialSeats: integer('preferential_seats').array(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('uq_bus_number_municipality').on(
      table.municipalityId,
      table.identificationNumber,
    ),
    unique('uq_bus_plate_municipality').on(table.municipalityId, table.plate),
  ],
);

export const points = pgTable(
  'points',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    routeId: uuid('route_id')
      .notNull()
      .references(() => routes.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(),
    order: integer('order').notNull().default(0),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    address: text('address'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [unique('uq_point_name_route').on(table.routeId, table.name)],
);

export const busLayouts = pgTable(
  'bus_layouts',
  {
    busId: uuid('bus_id')
      .primaryKey()
      .references(() => buses.id, { onDelete: 'cascade' }),
    numberingMode: varchar('numbering_mode', { length: 20 }).notNull(),
    numerationSide: varchar('numeration_side', { length: 20 }).notNull(),
    dpmSeatVirtualNumber: integer('dpm_seat_virtual_number'),
    preferentialSeats: integer('preferential_seats').array().notNull().default([]),
    rows: jsonb('rows').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
);

export const dropoffPoints = pgTable(
  'dropoff_points',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    routeId: uuid('route_id')
      .notNull()
      .references(() => routes.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(),
    address: text('address'),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('uq_dropoff_point_name_route').on(table.routeId, table.name),
  ],
);

