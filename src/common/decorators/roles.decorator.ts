import { SetMetadata } from '@nestjs/common';

export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  VIEWER = 'VIEWER',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);