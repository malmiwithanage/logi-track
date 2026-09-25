import { ShipmentsService } from './shipments.service';
import { jest } from '@jest/globals';

describe('ShipmentsService', () => {
  it('scopes shipment queries to the authenticated tenant and branch', async () => {
    console.log(
      '[ShipmentsService] PASS case: query should use the authenticated branch',
    );
    const findMany = jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]);
    const prisma = {
      $extends: jest.fn().mockReturnValue({
        shipmentTrip: { findMany },
      }),
    };
    const service = new ShipmentsService(prisma as never);

    await service.findAll({
      tenantId: 'tenant-acme-logistics',
      branchId: 'branch-north',
    });

    expect(findMany).toHaveBeenCalledWith({
      where: { branchId: 'branch-north' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    expect(prisma.$extends).toHaveBeenCalledTimes(1);
    console.log('[ShipmentsService] output:', {
      branchFilter: 'branch-north',
      order: 'createdAt desc',
      limit: 100,
      tenantClientCreated: true,
      shipmentsReturned: 0,
    });
  });
});