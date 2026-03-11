import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { randomUUID } from 'crypto';
import { roleUsuarioEnum, statusCadastroEnum } from './enums';

export type UsuarioDocument = Usuario & Document;

@Schema({ timestamps: { createdAt: 'criadoEm', updatedAt: false }, collection: 'usuarios' })
export class Usuario {
  @Prop({ type: String, default: () => randomUUID() })
  _id: string;

  @Prop({ type: String, required: true, ref: 'Prefeitura' })
  idPrefeitura: string;

  @Prop({ required: true, maxlength: 14 })
  cpf: string;

  @Prop({ required: true, maxlength: 150 })
  nome: string;

  @Prop({ required: true, maxlength: 150 })
  email: string;

  @Prop({ required: true, maxlength: 255 })
  senhaHash: string;

  @Prop({ maxlength: 20 })
  telefone?: string;

  @Prop({ type: String, enum: roleUsuarioEnum, default: 'ALUNO' })
  role: string;

  @Prop()
  nivelPrioridade?: number; // 1: Titular, 2: Univ. Caronista, 3: Caronista Comum

  @Prop({ type: String, ref: 'Linha' })
  idLinhaPadrao?: string;

  @Prop()
  fotoPerfilUrl?: string;

  @Prop()
  gradeHorarioUrl?: string;

  @Prop({ type: String, enum: statusCadastroEnum, default: 'PENDENTE' })
  statusCadastro: string;

  @Prop()
  bloqueioAssentoAte?: Date;

  criadoEm?: Date;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
UsuarioSchema.index({ idPrefeitura: 1, cpf: 1 }, { unique: true });
UsuarioSchema.index({ idPrefeitura: 1, email: 1 }, { unique: true });
