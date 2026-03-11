import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { direcaoViagemEnum, statusViagemEnum } from './enums';

export type ViagemDocument = Viagem & Document;

@Schema({ timestamps: { createdAt: 'criadoEm', updatedAt: false }, collection: 'viagens' })
export class Viagem {
  @Prop({ type: String, unique: true, required: true })
  idViagem: string;

  @Prop({ required: true })
  dataViagem: Date;

  @Prop({ required: true, maxlength: 10 })
  turno: string;

  @Prop({ type: String, enum: direcaoViagemEnum, required: true })
  direcao: string;

  @Prop({ type: String, required: true, ref: 'Linha' })
  idLinha: string;

  @Prop({ type: String, required: true, ref: 'Onibus' })
  idOnibus: string;

  @Prop({ type: String, ref: 'Usuario' })
  idMotorista?: string;

  @Prop({ type: [String], default: [] })
  lideresIds: string[];

  @Prop({ required: true })
  capacidadeReal: number;

  @Prop({ required: true })
  aberturaVotacao: Date;

  @Prop({ required: true })
  fechamentoVotacao: Date;

  @Prop({ type: String, enum: statusViagemEnum, default: 'AGENDADA' })
  status: string;

  criadoEm?: Date;
}

export const ViagemSchema = SchemaFactory.createForClass(Viagem);
