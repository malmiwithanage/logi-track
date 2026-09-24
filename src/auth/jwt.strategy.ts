import 'dotenv/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  branchId: string;
  role: string;
  jti: string;
  exp: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  tenantId: string;
  branchId: string;
  role: string;
  jti: string;
  exp: number;
}

function getJwtSecret() {
  return process.env.JWT_SECRET || 'development-only-logi-track-secret';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (
      !payload.sub ||
      !payload.tenantId ||
      !payload.branchId ||
      !payload.jti ||
      !payload.exp
    ) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const revokedToken = await this.prisma.revokedToken.findUnique({
      where: { jti: payload.jti },
      select: { id: true },
    });

    if (revokedToken) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return {
      id: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      branchId: payload.branchId,
      role: payload.role,
      jti: payload.jti,
      exp: payload.exp,
    };
  }
}
