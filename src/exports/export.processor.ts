import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ExportJobStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { Parser } from 'json2csv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../prisma/prisma.service';

interface ShipmentExportJob {
  exportJobId: string;
  tenantId: string;
  branchId: string;
}

@Injectable()
@Processor('export-queue', { concurrency: 2 })
export class ExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportProcessor.name);
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;

  constructor(private readonly prisma: PrismaService) {
    super();

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.bucket = process.env.SUPABASE_BUCKET || 'exports';

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for exports',
      );
    }

    this.supabase = createClient(supabaseUrl, serviceRoleKey);
  }

  async process(job: Job<ShipmentExportJob>) {
    const { exportJobId, tenantId, branchId } = job.data;

    await this.prisma.exportJob.update({
      where: { id: exportJobId, tenantId, branchId },
      data: { status: ExportJobStatus.PROCESSING },
    });

    try {
      const shipments = await this.prisma.shipmentTrip.findMany({
        where: { tenantId, branchId },
        orderBy: { createdAt: 'asc' },
        select: {
          trackingNumber: true,
          origin: true,
          destination: true,
          distanceKm: true,
          fuelConsumedL: true,
          weightKg: true,
          status: true,
          createdAt: true,
        },
      });

      const parser = new Parser({
        fields: [
          'trackingNumber',
          'origin',
          'destination',
          'distanceKm',
          'fuelConsumedL',
          'weightKg',
          'status',
          'createdAt',
        ],
      });
      const csv = parser.parse(shipments);
      const filePath = `${tenantId}/${branchId}/shipments-${exportJobId}.csv`;
      const { error: uploadError } = await this.supabase.storage
        .from(this.bucket)
        .upload(filePath, Buffer.from(csv, 'utf8'), {
          contentType: 'text/csv; charset=utf-8',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: signedUrlData, error: signedUrlError } =
        await this.supabase.storage
          .from(this.bucket)
          .createSignedUrl(filePath, 60 * 60);

      if (signedUrlError) {
        throw signedUrlError;
      }

      await this.prisma.exportJob.update({
        where: { id: exportJobId, tenantId, branchId },
        data: {
          status: ExportJobStatus.COMPLETED,
          rowCount: shipments.length,
          completedAt: new Date(),
          fileUrl: signedUrlData.signedUrl,
        },
      });

      this.logger.log(
        `Export ${exportJobId} uploaded to Supabase with ${shipments.length} rows`,
      );
      return { rowCount: shipments.length, fileUrl: signedUrlData.signedUrl };
    } catch (error) {
      await this.prisma.exportJob.update({
        where: { id: exportJobId, tenantId, branchId },
        data: {
          status: ExportJobStatus.FAILED,
          error: error instanceof Error ? error.message : 'Export failed',
        },
      });
      throw error;
    }
  }
}
