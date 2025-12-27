import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify which roles can access a route
 * @param roles - Array of allowed user roles
 * @example
 * @Roles(UserRole.ADMIN)
 * @Delete('hotels/:id')
 * deleteHotel() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
