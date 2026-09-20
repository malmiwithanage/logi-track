import { Module } from '@nestjs/common';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';

@Module({
  providers: [ShipmentsService, TenantGuard],
  controllers: [ShipmentsController],
  exports: [ShipmentsService],
})
export class ShipmentsModule {}
