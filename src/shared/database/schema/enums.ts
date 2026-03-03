import { pgEnum } from 'drizzle-orm/pg-core';

export const roleUsuarioEnum = pgEnum('role_usuario', [
  'SUPER_ADMIN',
  'GESTOR',
  'MOTORISTA',
  'LIDER',
  'ALUNO',
  'CARONISTA',
]);

export const statusCadastroEnum = pgEnum('status_cadastro', [
  'PENDENTE',
  'APROVADO',
  'REJEITADO',
]);

export const direcaoViagemEnum = pgEnum('direcao_viagem', ['IDA', 'VOLTA']);

export const statusViagemEnum = pgEnum('status_viagem', [
  'AGENDADA',
  'ABERTA_PARA_RESERVA',
  'EM_ANDAMENTO',
  'FINALIZADA',
  'CANCELADA',
]);

export const statusReservaEnum = pgEnum('status_reserva', [
  'CONFIRMADA',
  'PRESENTE',
  'FALTOU',
  'CANCELADA_SISTEMA',
  'EXCESSO',
]);
