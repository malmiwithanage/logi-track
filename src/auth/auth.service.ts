import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      branchId: user.branchId,
      role: user.role,
      jti: randomUUID(),
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        branchId: user.branchId,
      },
    };
  }

  async logout(user: { jti: string; exp: number }) {
    await this.prisma.revokedToken.upsert({
      where: { jti: user.jti },
      create: {
        jti: user.jti,
        expiresAt: new Date(user.exp * 1000),
      },
      update: {},
    });

    return { message: 'Logged out successfully' };
  }
}
