import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  role:
    | 'SUPER_ADMIN'
    | 'GESTOR'
    | 'MOTORISTA'
    | 'LIDER'
    | 'ALUNO'
    | 'CARONISTA';
  municipalityId: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>(
        'JWT_SECRET',
        'ubus-secret-change-in-prod',
      ),
    });
  }

  validate(payload: JwtPayload) {
    return payload;
  }
}
