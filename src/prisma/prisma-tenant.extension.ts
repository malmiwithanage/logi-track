import { PrismaClient } from '@prisma/client';

const tenantModels = new Set(['Tenant', 'Branch', 'User', 'ShipmentTrip', 'ExportJob']);
const scopedOperations = new Set([
  'findMany',
  'findFirst',
  'findUnique',
  'count',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
]);

export function createTenantPrismaClient(
  prisma: PrismaClient,
  tenantId: string,
) {
  if (!tenantId) {
    throw new Error('tenantId is required for a scoped Prisma client');
  }

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (model && tenantModels.has(model) && scopedOperations.has(operation)) {
            const scopedArgs = args as typeof args & {
              where?: Record<string, unknown>;
            };

            scopedArgs.where = {
              ...scopedArgs.where,
              tenantId,
            } as typeof scopedArgs.where;
          }

          return query(args);
        },
      },
    },
  });
}
