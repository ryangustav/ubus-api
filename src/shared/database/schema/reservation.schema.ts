import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { randomUUID } from 'crypto';
import { statusReservaEnum } from './enums';

export type ReservaDocument = Reserva & Document;

@Schema({ timestamps: { createdAt: 'criadoEm', updatedAt: false }, collection: 'reservas' })
export class Reserva {
  @Prop({ type: String, default: () => randomUUID() })
  _id: string;

  @Prop({ type: String, required: true })
  idViagem: string;

  @Prop({ type: String, required: true, ref: 'Usuario' })
  idUsuario: string;

  @Prop()
  numeroAssento?: number;

  @Prop({ default: false })
  isCarona: boolean;

  @Prop({ type: String, enum: statusReservaEnum, default: 'CONFIRMADA' })
  status: string;

  criadoEm?: Date;
}

export const ReservaSchema = SchemaFactory.createForClass(Reserva);
// Allow duplicate null entries for numeroAssento per idViagem, but if not null must be unique.
// Mongoose partial index approach for sparse unique index.
ReservaSchema.index(
  { idViagem: 1, numeroAssento: 1 },
  { unique: true, partialFilterExpression: { numeroAssento: { $type: 'number' } } },
);
