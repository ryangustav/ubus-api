import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { randomUUID } from 'crypto';

export type PrefeituraDocument = Prefeitura & Document;

@Schema({
  timestamps: { createdAt: 'criadoEm', updatedAt: false },
  collection: 'prefeituras',
})
export class Prefeitura {
  @Prop({ type: String, default: () => randomUUID() })
  _id: string;

  @Prop({ required: true, maxlength: 200 })
  nome: string;

  @Prop({ type: String, ref: 'Usuario' })
  idGestor?: string;

  @Prop({ default: true })
  ativo: boolean;

  criadoEm?: Date;
}

export const PrefeituraSchema = SchemaFactory.createForClass(Prefeitura);
