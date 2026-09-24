import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ExportJobStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createTenantPrismaClient } from '../prisma/prisma-tenant.extension';
import { PrismaService } from '../prisma/prisma.service';
import type { TenantContext } from '../common/decorators/tenant.decorator';

@Injectable()
export class ExportsService {
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;

  constructor(
    @InjectQueue('export-queue') private readonly exportQueue: Queue,
    private readonly prisma: PrismaService,
  ) {
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

  async triggerShipmentExport(tenantContext: TenantContext) {
    if (!tenantContext.branchId || !tenantContext.userId) {
      throw new UnauthorizedException('Branch and user context are required');
    }

    const prisma = createTenantPrismaClient(
      this.prisma,
      tenantContext.tenantId,
    );

    const dbJob = await prisma.exportJob.create({
      data: {
        status: ExportJobStatus.PENDING,
        tenantId: tenantContext.tenantId,
        branchId: tenantContext.branchId,
        requestedById: tenantContext.userId,
      },
    });

    try {
      await this.exportQueue.add(
        'generate-shipments-csv',
        {
          exportJobId: dbJob.id,
          tenantId: tenantContext.tenantId,
          branchId: tenantContext.branchId,
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
      );
    } catch (error) {
      await prisma.exportJob.update({
        where: { id: dbJob.id },
        data: {
          status: ExportJobStatus.FAILED,
          error: error instanceof Error ? error.message : 'Queue submission failed',
        },
      });
      throw error;
    }

    return {
      message: 'Export job queued successfully',
      exportJobId: dbJob.id,
      status: dbJob.status,
    };
  }

  async getJobStatus(jobId: string, tenantContext: TenantContext) {
    const prisma = createTenantPrismaClient(
      this.prisma,
      tenantContext.tenantId,
    );

    const job = await prisma.exportJob.findFirst({
      where: {
        id: jobId,
        ...(tenantContext.branchId ? { branchId: tenantContext.branchId } : {}),
      },
    });

    if (!job) {
      throw new NotFoundException('Export job not found');
    }

    const { filePath: _filePath, ...safeJob } = job;
    return safeJob;
  }

  async getDownloadUrl(jobId: string, tenantContext: TenantContext) {
    const prisma = createTenantPrismaClient(
      this.prisma,
      tenantContext.tenantId,
    );

    const job = await prisma.exportJob.findFirst({
      where: {
        id: jobId,
        ...(tenantContext.branchId ? { branchId: tenantContext.branchId } : {}),
      },
      select: { filePath: true, status: true },
    });

    if (!job || job.status !== ExportJobStatus.COMPLETED || !job.filePath) {
      throw new NotFoundException('Completed export file not found');
    }

    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(job.filePath, 10 * 60);

    if (error) {
      throw new NotFoundException('Export file not found');
    }

    return { downloadUrl: data.signedUrl, expiresInSeconds: 10 * 60 };
  }
}
