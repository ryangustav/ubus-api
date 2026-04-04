import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  unique,
  boolean,
} from 'drizzle-orm/pg-core';
import { userRoleEnum, registrationStatusEnum } from './enums';
import { municipalities } from './municipality.schema';
import { routes, points } from './fleet.schema';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    municipalityId: uuid('municipality_id')
      .notNull()
      .references(() => municipalities.id, { onDelete: 'cascade' }),
    cpf: varchar('cpf', { length: 14 }).notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    email: varchar('email', { length: 150 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    role: userRoleEnum('role').default('STUDENT'),
    priorityLevel: integer('priority_level'), // 1: Holder, 2: Caronista Univ., 3: Common Caronista
    defaultRouteId: uuid('default_route_id').references(() => routes.id),
    profilePictureUrl: text('profile_picture_url'),
    scheduleUrl: text('schedule_url'),
    residenceProofUrl: text('residence_proof_url'),
    needsWheelchair: boolean('needs_wheelchair').default(false),
    registrationStatus: registrationStatusEnum('registration_status').default(
      'PENDING',
    ),
    defaultPointId: uuid('default_point_id').references(() => points.id),
    seatBlockUntil: timestamp('seat_block_until', {
      withTimezone: true,
    }),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    emailVerificationCode: varchar('email_verification_code', { length: 6 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    unique('uq_user_cpf_municipality').on(table.municipalityId, table.cpf),
    unique('uq_user_email_municipality').on(table.municipalityId, table.email),
  ],
);
