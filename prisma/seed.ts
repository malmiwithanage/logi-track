import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  ShipmentStatus,
  UserRole,
} from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed PostgreSQL');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const totalRecords = 100_000;
const batchSize = 10_000;
const shipmentStatuses: ShipmentStatus[] = [
  ShipmentStatus.DELIVERED,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.PENDING,
  ShipmentStatus.CANCELLED,
];

async function main() {
  console.log('Clearing existing local data...');
  await prisma.shipmentTrip.deleteMany();
  await prisma.exportJob.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.tenant.deleteMany();

  console.log('Creating tenants and branches...');
  const acmeTenant = await prisma.tenant.create({
    data: {
      id: 'tenant-acme-logistics',
      name: 'Acme Logistics',
      slug: 'acme-logistics',
    },
  });

  const branchNorth = await prisma.branch.create({
    data: {
      id: 'branch-acme-north',
      name: 'Acme North Branch',
      tenantId: acmeTenant.id,
    },
  });

  const branchSouth = await prisma.branch.create({
    data: {
      id: 'branch-acme-south',
      name: 'Acme South Branch',
      tenantId: acmeTenant.id,
    },
  });

  const globalTenant = await prisma.tenant.create({
    data: {
      id: 'tenant-global-freight',
      name: 'Global Freight Partners',
      slug: 'global-freight',
    },
  });

  const globalBranch = await prisma.branch.create({
    data: {
      id: 'branch-global-galle',
      name: 'Global Freight Galle Branch',
      tenantId: globalTenant.id,
    },
  });

  const passwordHash = await bcrypt.hash('password123', 10);
  await prisma.user.createMany({
    data: [
      {
        id: 'user-admin-acme',
        email: 'admin@acmelogistics.com',
        password: passwordHash,
        role: UserRole.ADMIN,
        tenantId: acmeTenant.id,
        branchId: branchNorth.id,
      },
      {
        id: 'user-manager-north',
        email: 'manager.north@acmelogistics.com',
        password: passwordHash,
        role: UserRole.MANAGER,
        tenantId: acmeTenant.id,
        branchId: branchNorth.id,
      },
      {
        id: 'user-manager-south',
        email: 'manager.south@acmelogistics.com',
        password: passwordHash,
        role: UserRole.MANAGER,
        tenantId: acmeTenant.id,
        branchId: branchSouth.id,
      },
      {
        id: 'user-manager-global',
        email: 'manager@globalfreight.com',
        password: passwordHash,
        role: UserRole.MANAGER,
        tenantId: globalTenant.id,
        branchId: globalBranch.id,
      },
    ],
  });

  console.log(`Generating ${totalRecords.toLocaleString()} Acme shipment records...`);
  const branches = [branchNorth.id, branchSouth.id];

  for (let offset = 0; offset < totalRecords; offset += batchSize) {
    const currentBatchSize = Math.min(batchSize, totalRecords - offset);
    const shipmentsBatch = Array.from(
      { length: currentBatchSize },
      (_, batchIndex) => {
        const recordNumber = offset + batchIndex + 1;
        const branchId = branches[(recordNumber - 1) % branches.length];
        const status = shipmentStatuses[(recordNumber - 1) % shipmentStatuses.length];
        const distanceKm = 20 + ((recordNumber * 37) % 481);

        return {
          tenantId: acmeTenant.id,
          branchId,
          trackingNumber: `TRK-ACME-${recordNumber.toString().padStart(6, '0')}`,
          origin: `Warehouse-${(recordNumber % 10) + 1}`,
          destination: `Hub-${(recordNumber % 20) + 1}`,
          status,
          distanceKm,
          fuelConsumedL: Number((10 + ((recordNumber * 17) % 71)).toFixed(2)),
          weightKg: Number((10 + ((recordNumber * 29) % 491)).toFixed(2)),
          createdAt: new Date(Date.now() - recordNumber * 60_000),
        };
      },
    );

    await prisma.shipmentTrip.createMany({ data: shipmentsBatch });
    console.log(`Seeded ${offset + currentBatchSize} / ${totalRecords} shipments`);
  }

  await prisma.shipmentTrip.createMany({
    data: Array.from({ length: 15 }, (_, index) => ({
      tenantId: globalTenant.id,
      branchId: globalBranch.id,
      trackingNumber: `TRK-GLOBAL-${(index + 1).toString().padStart(4, '0')}`,
      origin: `Global Warehouse-${(index % 5) + 1}`,
      destination: `Global Hub-${(index % 8) + 1}`,
      status: ShipmentStatus.DELIVERED,
      distanceKm: 50 + index * 10,
      fuelConsumedL: 15 + index,
      weightKg: 100 + index * 5,
      createdAt: new Date(Date.now() - index * 60_000),
    })),
  });

  console.log('Seeding completed successfully.');
  console.log(`Acme tenant: ${acmeTenant.id}`);
  console.log(`North manager: manager.north@acmelogistics.com / password123`);
  console.log(`South manager: manager.south@acmelogistics.com / password123`);
  console.log(`Global tenant: ${globalTenant.id}`);
}

main()
  .catch((error) => {
    console.error('Seeding error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
