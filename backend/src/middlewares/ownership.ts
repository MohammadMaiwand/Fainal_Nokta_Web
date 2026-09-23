import type { Request, Response, NextFunction } from 'express';
import { createError } from '../helpers/response';
import { PermissionService } from '../services/permissionService';
import { ownershipService } from '../services/ownershipService';

const permissionService = new PermissionService();

export async function ownershipMiddleware(req: Request, res: Response, next: NextFunction) {
  const policy = permissionService.getRoutePolicy(req.originalUrl, req.method);
  if (!policy?.ownership) {
    return next();
  }

  if (!req.user) {
    return res.status(401).json(createError('Authentication required'));
  }

  try {
    const allowed = await ownershipService.verifyRouteOwnership(req, policy);
    if (!allowed) {
      return res.status(403).json(createError('Ownership check failed'));
    }

    return next();
  } catch {
    return res.status(403).json(createError('Ownership check failed'));
  }
}
