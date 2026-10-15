import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { getPool } from '../db/index.js';

export interface AuthUser {
  userId: number;
  supabaseUid: string;
  account: string;
  isAdmin: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * 验证 Supabase Auth 签发的访问令牌（HS256）。
 * 密码验证、哈希、找回等全部由 Supabase Auth 负责，这里只做签名校验。
 */
export function verifyAccessToken(token: string): { sub: string } | null {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return null;
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof decoded === 'object' && decoded && typeof decoded.sub === 'string') {
      return { sub: decoded.sub };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 认证中间件：校验访问令牌 + 账号状态，把当前用户挂到 req.user 上。
 */
export async function authRequired(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: '未登录或登录已过期' });
      return;
    }

    const payload = verifyAccessToken(authHeader.slice(7));
    if (!payload) {
      res.status(401).json({ success: false, message: '未登录或登录已过期' });
      return;
    }

    const result = await getPool().query<{
      id: number;
      account: string;
      is_admin: boolean;
      is_active: boolean;
    }>('SELECT id, account, is_admin, is_active FROM users WHERE supabase_uid = $1', [
      payload.sub,
    ]);
    const row = result.rows[0];

    if (!row) {
      res.status(401).json({ success: false, message: '账号数据不存在，请联系管理员' });
      return;
    }
    if (!row.is_active) {
      res.status(403).json({ success: false, message: '账号已被禁用，请联系管理员' });
      return;
    }

    req.user = {
      userId: row.id,
      supabaseUid: payload.sub,
      account: row.account,
      isAdmin: row.is_admin,
    };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * 管理员中间件：需要管理员权限
 */
export function adminRequired(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: '未登录' });
    return;
  }
  if (!req.user.isAdmin) {
    res.status(403).json({ success: false, message: '无管理员权限' });
    return;
  }
  next();
}

