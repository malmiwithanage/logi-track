import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetTenant } from '../common/decorators/tenant.decorator';
import type { TenantContext } from '../common/decorators/tenant.decorator';
import { Role, Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ExportsService } from './exports.service';

@ApiTags('exports')
@ApiBearerAuth()
@Controller('exports')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Post('shipments')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Queue a tenant and branch-scoped shipment CSV export' })
  createExport(@GetTenant() tenantContext: TenantContext) {
    return this.exportsService.triggerShipmentExport(tenantContext);
  }

  @Get(':id/status')
  @Roles(Role.ADMIN, Role.MANAGER, Role.VIEWER)
  @ApiOperation({ summary: 'Read a tenant and branch-scoped export status' })
  getStatus(
    @Param('id') id: string,
    @GetTenant() tenantContext: TenantContext,
  ) {
    return this.exportsService.getJobStatus(id, tenantContext);
  }

  @Get(':id/download')
  @Roles(Role.ADMIN, Role.MANAGER, Role.VIEWER)
  @ApiOperation({ summary: 'Get a short-lived tenant and branch-scoped download URL' })
  getDownloadUrl(
    @Param('id') id: string,
    @GetTenant() tenantContext: TenantContext,
  ) {
    return this.exportsService.getDownloadUrl(id, tenantContext);
  }
}
