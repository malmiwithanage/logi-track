import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, ShipmentStatus, UserRole } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed PostgreSQL');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  console.log('Seeding initial database records...');

  const tenant = await prisma.tenant.upsert({
    where: { id: 'tenant-acme-logistics' },
    update: { name: 'Acme Logistics Global' },
    create: {
      id: 'tenant-acme-logistics',
      name: 'Acme Logistics Global',
    },
  });

  const branch = await prisma.branch.upsert({
    where: { id: 'b1c83d5a-fa64-4b53-bb74-06c827011d61' },
    update: {
      name: 'Colombo Central Hub',
      tenantId: tenant.id,
    },
    create: {
      id: 'b1c83d5a-fa64-4b53-bb74-06c827011d61',
      name: 'Colombo Central Hub',
      tenantId: tenant.id,
    },
  });

  const user = await prisma.user.upsert({
    where: { id: 'user-manager-01' },
    update: {
      email: 'manager@acmelogistics.com',
      role: UserRole.MANAGER,
      tenantId: tenant.id,
      branchId: branch.id,
    },
    create: {
      id: 'user-manager-01',
      email: 'manager@acmelogistics.com',
      password: 'hashed_password_here',
      role: UserRole.MANAGER,
      tenantId: tenant.id,
      branchId: branch.id,
    },
  });

  const tripsData = Array.from({ length: 50 }, (_, index) => ({
    trackingNumber: `TRK-2026-${1000 + index}`,
    distanceKm: Number((20 + ((index * 37) % 481) + index / 100).toFixed(2)),
    fuelConsumedL: Number((10 + ((index * 17) % 71) + index / 100).toFixed(2)),
    status: ShipmentStatus.DELIVERED,
    tenantId: tenant.id,
    branchId: branch.id,
    createdAt: new Date(`2026-08-${String((index % 28) + 1).padStart(2, '0')}T10:00:00.000Z`),
  }));

  await prisma.shipmentTrip.createMany({
    data: tripsData,
    skipDuplicates: true,
  });

  console.log('Seeding completed successfully!');
  console.log(`Tenant ID: ${tenant.id}`);
  console.log(`Branch ID: ${branch.id}`);
  console.log(`User ID: ${user.id}`);
  console.log(`Shipment trips processed: ${tripsData.length}`);
}

main()
  .catch((error) => {
    console.error('Seeding error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
