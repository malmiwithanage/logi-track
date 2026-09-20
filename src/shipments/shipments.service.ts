import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/decorators/tenant.decorator';

@Injectable()
export class ShipmentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantContext: TenantContext) {
    return this.prisma.shipmentTrip.findMany({
      where: {
        tenantId: tenantContext.tenantId,
        ...(tenantContext.branchId ? { branchId: tenantContext.branchId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
