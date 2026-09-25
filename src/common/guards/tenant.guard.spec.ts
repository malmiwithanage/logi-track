import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantGuard } from './tenant.guard';

describe('TenantGuard', () => {
  const findFirst = jest.fn<
    () => Promise<{ id: string } | null>
  >();
  const prisma = {
    branch: {
      findFirst,
    },
  };

  let guard: TenantGuard;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        TenantGuard,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    guard = module.get(TenantGuard);
  });

  function executionContext(user: unknown) {
    const request = { user } as { user: unknown };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as never;
  }

  it('accepts a branch that belongs to the authenticated tenant', async () => {
    console.log(
      '[TenantGuard] PASS case: valid branch and tenant should be accepted',
    );
    findFirst.mockResolvedValue({ id: 'branch-north' });
    const context = executionContext({
      id: 'user-manager-north',
      tenantId: 'tenant-acme-logistics',
      branchId: 'branch-north',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.branch.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'branch-north',
        tenantId: 'tenant-acme-logistics',
      },
      select: { id: true },
    });
    console.log('[TenantGuard] output:', {
      allowed: true,
      branchLookup: {
        branchId: 'branch-north',
        tenantId: 'tenant-acme-logistics',
      },
    });
  });

  it('rejects a branch that belongs to another tenant', async () => {
    console.log(
      '[TenantGuard] PASS case: foreign branch should be rejected',
    );
    findFirst.mockResolvedValue(null);
    const context = executionContext({
      id: 'user-manager-north',
      tenantId: 'tenant-acme-logistics',
      branchId: 'branch-global-galle',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Branch does not belong to tenant',
    );
    console.log('[TenantGuard] output:', {
      allowed: false,
      error: 'Branch does not belong to tenant',
    });
  });

  it('rejects a request without tenant context', async () => {
    console.log(
      '[TenantGuard] PASS case: missing tenant context should be rejected',
    );
    const context = executionContext({
      id: 'user-manager-north',
      branchId: 'branch-north',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Authenticated tenant context is required',
    );
    expect(prisma.branch.findFirst).not.toHaveBeenCalled();
    console.log('[TenantGuard] output:', {
      allowed: false,
      error: 'Authenticated tenant context is required',
      branchLookupCalled: false,
    });
  });
});