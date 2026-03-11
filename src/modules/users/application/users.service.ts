import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Usuario,
  UsuarioDocument,
} from '../../../shared/database/schema/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(Usuario.name) private userModel: Model<UsuarioDocument>,
  ) {}

  async listPendentes(municipalityId: string) {
    return this.userModel
      .find({
        idPrefeitura: municipalityId,
        statusCadastro: 'PENDENTE',
        role: 'ALUNO',
      })
      .exec();
  }

  async updateStatus(
    id: string,
    status: 'APROVADO' | 'REJEITADO',
    municipalityId: string,
  ) {
    const user = await this.userModel.findById(id).exec();

    if (!user) throw new NotFoundException('User not found');
    if (user.idPrefeitura !== municipalityId) {
      throw new ForbiddenException('User belongs to another municipality');
    }
    if (user.statusCadastro !== 'PENDENTE') {
      throw new ForbiddenException('User is not pending approval');
    }

    user.statusCadastro = status;
    await user.save();

    return user;
  }
}
