import { pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', [
  'SUPER_ADMIN',
  'MANAGER',
  'DRIVER',
  'LEADER',
  'STUDENT',
  'RIDE_SHARE',
]);

export const registrationStatusEnum = pgEnum('registration_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
]);

export const tripDirectionEnum = pgEnum('trip_direction', ['OUTBOUND', 'INBOUND']);

export const tripStatusEnum = pgEnum('trip_status', [
  'SCHEDULED',
  'OPEN_FOR_RESERVATION',
  'ONGOING',
  'FINISHED',
  'CANCELLED',
]);

export const reservationStatusEnum = pgEnum('reservation_status', [
  'CONFIRMED',
  'PRESENT',
  'ABSENT',
  'CANCELLED_BY_SYSTEM',
  'EXCESS',
]);
