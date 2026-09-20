import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { GetTenant } from '../common/decorators/tenant.decorator';
import type { TenantContext } from '../common/decorators/tenant.decorator';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ShipmentsService } from './shipments.service';

@ApiTags('shipments')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant context for local development until authentication is added',
  required: true,
})
@ApiHeader({
  name: 'x-branch-id',
  description: 'Optional branch filter within the tenant',
  required: false,
})
@Controller('shipments')
@UseGuards(TenantGuard)
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get()
  getShipments(@GetTenant() tenantContext: TenantContext) {
    return this.shipmentsService.findAll(tenantContext);
  }
}
