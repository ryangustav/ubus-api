import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { randomUUID } from 'crypto';

export type LinhaDocument = Linha & Document;

@Schema({
  timestamps: { createdAt: 'criadoEm', updatedAt: false },
  collection: 'linhas',
})
export class Linha {
  @Prop({ type: String, default: () => randomUUID() })
  _id: string;

  @Prop({ type: String, required: true, ref: 'Prefeitura' })
  idPrefeitura: string;

  @Prop({ required: true, maxlength: 100 })
  nome: string;

  @Prop()
  descricao?: string;

  @Prop({ type: [Number], required: true, default: [] })
  diasDaSemana: number[];

  @Prop({ required: true, default: '06:00', maxlength: 5 })
  horarioAberturaVotacao: string;

  @Prop({ required: true, default: '07:30', maxlength: 5 })
  horarioFechamentoVotacao: string;

  @Prop({ default: true })
  active: boolean;

  criadoEm?: Date;
}

export const LinhaSchema = SchemaFactory.createForClass(Linha);
LinhaSchema.index({ idPrefeitura: 1, nome: 1 }, { unique: true });

export type OnibusDocument = Onibus & Document;

@Schema({
  timestamps: { createdAt: 'criadoEm', updatedAt: false },
  collection: 'onibus',
})
export class Onibus {
  @Prop({ type: String, default: () => randomUUID() })
  _id: string;

  @Prop({ type: String, required: true, ref: 'Prefeitura' })
  idPrefeitura: string;

  @Prop({ type: String, ref: 'Usuario' })
  idMotorista?: string;

  @Prop({ required: true, maxlength: 20 })
  numeroIdentificacao: string;

  @Prop({ required: true, maxlength: 10 })
  placa: string;

  @Prop({ required: true })
  capacidadePadrao: number;

  @Prop({ default: false })
  temBanheiro: boolean;

  @Prop({ default: false })
  temArCondicionado: boolean;

  @Prop({ default: true })
  active: boolean;

  criadoEm?: Date;
}

export const OnibusSchema = SchemaFactory.createForClass(Onibus);
OnibusSchema.index(
  { idPrefeitura: 1, numeroIdentificacao: 1 },
  { unique: true },
);
OnibusSchema.index({ idPrefeitura: 1, placa: 1 }, { unique: true });
