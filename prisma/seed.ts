import 'dotenv/config';
import * as bcrypt from 'bcrypt';
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
  const demoPasswordHash = await bcrypt.hash('manager-password', 10);

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

  const branchTwo = await prisma.branch.upsert({
    where: { id: 'f2d54d8e-6f8c-4df8-8b5b-47ef7f4f6f0d' },
    update: {
      name: 'Kandy Regional Hub',
      tenantId: tenant.id,
    },
    create: {
      id: 'f2d54d8e-6f8c-4df8-8b5b-47ef7f4f6f0d',
      name: 'Kandy Regional Hub',
      tenantId: tenant.id,
    },
  });

  const secondTenant = await prisma.tenant.upsert({
    where: { id: 'tenant-global-freight' },
    update: { name: 'Global Freight Partners' },
    create: {
      id: 'tenant-global-freight',
      name: 'Global Freight Partners',
    },
  });

  const secondTenantBranch = await prisma.branch.upsert({
    where: { id: '8e4d6f21-90b4-4d3c-a2f6-1e7f8c9b0a12' },
    update: {
      name: 'Galle Port Hub',
      tenantId: secondTenant.id,
    },
    create: {
      id: '8e4d6f21-90b4-4d3c-a2f6-1e7f8c9b0a12',
      name: 'Galle Port Hub',
      tenantId: secondTenant.id,
    },
  });

  const user = await prisma.user.upsert({
    where: { id: 'user-manager-01' },
    update: {
      email: 'manager@acmelogistics.com',
      password: demoPasswordHash,
      role: UserRole.MANAGER,
      tenantId: tenant.id,
      branchId: branch.id,
    },
    create: {
      id: 'user-manager-01',
      email: 'manager@acmelogistics.com',
      password: demoPasswordHash,
      role: UserRole.MANAGER,
      tenantId: tenant.id,
      branchId: branch.id,
    },
  });

  const branchTwoUser = await prisma.user.upsert({
    where: { id: 'user-manager-02' },
    update: {
      email: 'kandy.manager@acmelogistics.com',
      password: demoPasswordHash,
      role: UserRole.MANAGER,
      tenantId: tenant.id,
      branchId: branchTwo.id,
    },
    create: {
      id: 'user-manager-02',
      email: 'kandy.manager@acmelogistics.com',
      password: demoPasswordHash,
      role: UserRole.MANAGER,
      tenantId: tenant.id,
      branchId: branchTwo.id,
    },
  });

  const secondTenantUser = await prisma.user.upsert({
    where: { id: 'user-manager-03' },
    update: {
      email: 'manager@globalfreight.com',
      password: demoPasswordHash,
      role: UserRole.MANAGER,
      tenantId: secondTenant.id,
      branchId: secondTenantBranch.id,
    },
    create: {
      id: 'user-manager-03',
      email: 'manager@globalfreight.com',
      password: demoPasswordHash,
      role: UserRole.MANAGER,
      tenantId: secondTenant.id,
      branchId: secondTenantBranch.id,
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

  const branchTwoTripsData = Array.from({ length: 10 }, (_, index) => ({
    trackingNumber: `TRK-2026-KANDY-${1000 + index}`,
    distanceKm: Number((35 + ((index * 29) % 220) + index / 100).toFixed(2)),
    fuelConsumedL: Number((12 + ((index * 11) % 42) + index / 100).toFixed(2)),
    status: ShipmentStatus.DELIVERED,
    tenantId: tenant.id,
    branchId: branchTwo.id,
    createdAt: new Date(`2026-08-${String((index % 10) + 1).padStart(2, '0')}T11:00:00.000Z`),
  }));

  const secondTenantTripsData = Array.from({ length: 15 }, (_, index) => ({
    trackingNumber: `TRK-2026-GALLE-${1000 + index}`,
    distanceKm: Number((45 + ((index * 23) % 300) + index / 100).toFixed(2)),
    fuelConsumedL: Number((15 + ((index * 13) % 55) + index / 100).toFixed(2)),
    status: ShipmentStatus.DELIVERED,
    tenantId: secondTenant.id,
    branchId: secondTenantBranch.id,
    createdAt: new Date(`2026-08-${String((index % 15) + 1).padStart(2, '0')}T12:00:00.000Z`),
  }));

  await prisma.shipmentTrip.createMany({
    data: [...tripsData, ...branchTwoTripsData, ...secondTenantTripsData],
    skipDuplicates: true,
  });

  console.log('Seeding completed successfully!');
  console.log(`Tenant ID: ${tenant.id}`);
  console.log(`Branch ID: ${branch.id}`);
  console.log(`Second branch ID: ${branchTwo.id}`);
  console.log(`Second tenant ID: ${secondTenant.id}`);
  console.log(`Second tenant branch ID: ${secondTenantBranch.id}`);
  console.log(`User ID: ${user.id}`);
  console.log(`Second branch user ID: ${branchTwoUser.id}`);
  console.log(`Second tenant user ID: ${secondTenantUser.id}`);
  console.log(`Shipment trips processed: ${tripsData.length + branchTwoTripsData.length + secondTenantTripsData.length}`);
}

main()
  .catch((error) => {
    console.error('Seeding error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
