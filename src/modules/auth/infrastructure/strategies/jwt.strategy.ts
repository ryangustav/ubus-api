import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE } from '../../../../shared/database/database.module';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../../shared/database/schema';
import { eq, and, isNull } from 'drizzle-orm';

export interface JwtPayload {
  sub: string;
  email: string;
  role:
    | 'SUPER_ADMIN'
    | 'MANAGER'
    | 'DRIVER'
    | 'LEADER'
    | 'STUDENT'
    | 'RIDE_SHARE';
  municipalityId: string;
  tokenVersion?: number;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private config: ConfigService,
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || (() => {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('JWT_SECRET is missing in production!');
        }
        return 'ubus-secret-change-in-prod';
      })(),
    });
  }

  async validate(payload: JwtPayload) {
    const [user] = await this.db
      .select({
        id: schema.users.id,
        tokenVersion: schema.users.tokenVersion,
        deletedAt: schema.users.deletedAt,
      })
      .from(schema.users)
      .where(
        and(eq(schema.users.id, payload.sub), isNull(schema.users.deletedAt)),
      );

    if (!user) {
      throw new UnauthorizedException('User is inactive or deleted');
    }

    if (
      payload.tokenVersion !== undefined &&
      user.tokenVersion !== payload.tokenVersion
    ) {
      throw new UnauthorizedException('Token has been invalidated');
    }

    return payload;
  }
}
