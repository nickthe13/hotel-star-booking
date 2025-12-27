import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles required, allow access
    if (!requiredRoles) {
      return true;
    }

    // Get user from request (set by JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();

    // Check if user has any of the required roles
    return requiredRoles.some((role) => user.role === role);
  }
}
