import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../decorators/tenant.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId ?? request.headers['x-tenant-id'];
    const branchId = request.user?.branchId ?? request.headers['x-branch-id'];
    const userId = request.user?.id ?? request.headers['x-user-id'];

    if (typeof tenantId !== 'string' || tenantId.length === 0) {
      throw new UnauthorizedException('Tenant context is required');
    }

    if (branchId !== undefined && typeof branchId !== 'string') {
      throw new UnauthorizedException('Branch context is invalid');
    }

    if (branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: branchId, tenantId },
        select: { id: true },
      });

      if (!branch) {
        throw new UnauthorizedException('Branch does not belong to tenant');
      }
    }

    const tenantContext: TenantContext = {
      tenantId,
      ...(branchId ? { branchId } : {}),
      ...(typeof userId === 'string' ? { userId } : {}),
    };

    request.tenantContext = tenantContext;
    return true;
  }
}
