import { Injectable } from '@nestjs/common';
import { createTenantPrismaClient } from '../prisma/prisma-tenant.extension';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/decorators/tenant.decorator';

@Injectable()
export class ShipmentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantContext: TenantContext) {
    const prisma = createTenantPrismaClient(
      this.prisma,
      tenantContext.tenantId,
    );

    return prisma.shipmentTrip.findMany({
      where: {
        ...(tenantContext.branchId ? { branchId: tenantContext.branchId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
