import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type AuthUser = {
  id: string;
  email: string;
  isAdmin: boolean;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    console.warn('WARNING: JWT_SECRET is not set. Using insecure development fallback.');
    return 'dev-only-insecure-secret-change-me';
  }
  return secret;
}

/**
 * Returns true if the requester owns the resource or is a global admin.
 */
export function assertResourceAccess(req: Request, resourceUserId: string): boolean {
  if (!req.user) return false;
  if (req.user.isAdmin) return true;
  return req.user.id === resourceUserId;
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as {
      userId: string;
      email: string;
      isAdmin?: boolean;
    };
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      isAdmin: Boolean(decoded.isAdmin),
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

/** Optional middleware: require global admin */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};
