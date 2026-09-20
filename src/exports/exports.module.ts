import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExportProcessor } from './export.processor';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'export-queue',
    }),
  ],
  controllers: [ExportsController],
  providers: [ExportsService, ExportProcessor],
  exports: [ExportsService],
})
export class ExportsModule {}
