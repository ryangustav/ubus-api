import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import {
  Prefeitura,
  PrefeituraDocument,
} from '../../../shared/database/schema/prefeitura.schema';
import {
  Usuario,
  UsuarioDocument,
} from '../../../shared/database/schema/user.schema';

const SYSTEM_MUNICIPALITY_ID = '00000000-0000-0000-0000-000000000001';

function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

@Injectable()
export class ManagementService {
  constructor(
    @InjectModel(Prefeitura.name)
    private prefeituraModel: Model<PrefeituraDocument>,
    @InjectModel(Usuario.name) private usuarioModel: Model<UsuarioDocument>,
  ) {}

  async create(dto: { name: string }) {
    const prefeitura = new this.prefeituraModel({ nome: dto.name });
    return prefeitura.save();
  }

  async list(opts?: { excludeSystem?: boolean; municipalityId?: string }) {
    const excludeSystem = opts?.excludeSystem ?? true;
    const municipalityId = opts?.municipalityId;

    if (municipalityId) {
      const p = await this.prefeituraModel.findById(municipalityId).exec();
      return p ? [p] : [];
    }

    const query = excludeSystem ? { _id: { $ne: SYSTEM_MUNICIPALITY_ID } } : {};
    return this.prefeituraModel.find(query).exec();
  }

  async findById(id: string) {
    return this.prefeituraModel.findById(id).exec();
  }

  async update(id: string, dto: { name?: string; active?: boolean }) {
    const updates: Partial<Prefeitura> = {};
    if (dto.name !== undefined) updates.nome = dto.name;
    if (dto.active !== undefined) updates.ativo = dto.active;

    if (id === SYSTEM_MUNICIPALITY_ID) {
      throw new ConflictException('Cannot modify System municipality');
    }

    const updated = await this.prefeituraModel
      .findByIdAndUpdate(id, { $set: updates }, { new: true })
      .exec();

    if (!updated) throw new NotFoundException('Municipality not found');
    return updated;
  }

  async setManager(municipalityId: string, userId: string) {
    const existing = await this.prefeituraModel.findById(municipalityId).exec();

    if (!existing) {
      throw new ConflictException('Municipality not found');
    }

    if (existing.idGestor) {
      throw new ConflictException('Municipality already has a manager');
    }

    existing.idGestor = userId;
    return existing.save();
  }

  async createManager(dto: {
    municipalityId: string;
    cpf: string;
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) {
    if (dto.municipalityId === SYSTEM_MUNICIPALITY_ID) {
      throw new ConflictException(
        'Cannot create manager in System municipality',
      );
    }

    const municipality = await this.prefeituraModel
      .findById(dto.municipalityId)
      .exec();

    if (!municipality) throw new NotFoundException('Municipality not found');
    if (municipality.idGestor) {
      throw new ConflictException('Municipality already has a manager');
    }

    const cpfNorm = normalizeCpf(dto.cpf);

    const existingEmail = await this.usuarioModel
      .findOne({
        email: dto.email,
        idPrefeitura: dto.municipalityId,
      })
      .exec();

    const existingCpf = await this.usuarioModel
      .findOne({
        cpf: cpfNorm,
        idPrefeitura: dto.municipalityId,
      })
      .exec();

    if (existingEmail)
      throw new ConflictException(
        'Email already registered in this municipality',
      );
    if (existingCpf)
      throw new ConflictException(
        'CPF already registered in this municipality',
      );

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = new this.usuarioModel({
      idPrefeitura: dto.municipalityId,
      cpf: cpfNorm,
      nome: dto.name,
      email: dto.email,
      senhaHash: passwordHash,
      telefone: dto.phone ?? undefined,
      role: 'GESTOR',
    });

    await user.save();

    municipality.idGestor = user.id;
    await municipality.save();

    return user;
  }

  async removeManager(municipalityId: string) {
    if (municipalityId === SYSTEM_MUNICIPALITY_ID) {
      throw new ConflictException(
        'Cannot remove manager from System municipality',
      );
    }

    const updated = await this.prefeituraModel
      .findByIdAndUpdate(
        municipalityId,
        { $unset: { idGestor: '' } },
        { new: true },
      )
      .exec();

    if (!updated) throw new NotFoundException('Municipality not found');
    return updated;
  }
}
