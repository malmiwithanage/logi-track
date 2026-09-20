import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface TenantContext {
  tenantId: string;
  branchId?: string;
  userId?: string;
}

export const GetTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    const context = request.tenantContext as TenantContext | undefined;

    return {
      tenantId: context?.tenantId ?? request.user?.tenantId,
      branchId: context?.branchId ?? request.user?.branchId,
      userId: context?.userId ?? request.user?.id,
    };
  },
);
