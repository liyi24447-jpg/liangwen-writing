import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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

const SUPABASE_URL = process.env.SUPABASE_URL || '';

interface Jwk {
  kty: string;
  kid: string;
  [key: string]: unknown;
}

// JWKS 公钥缓存（Supabase 新签名密钥，ES256），1 小时刷新；kid 未命中时强制刷新
let jwksCache: Jwk[] | null = null;
let jwksFetchedAt = 0;

async function getJwks(force = false): Promise<Jwk[] | null> {
  const now = Date.now();
  if (!force && jwksCache && now - jwksFetchedAt < 3600_000) {
    return jwksCache;
  }
  if (!SUPABASE_URL) return jwksCache;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`);
    if (!res.ok) return jwksCache;
    const data = (await res.json()) as { keys: Jwk[] };
    jwksCache = data.keys;
    jwksFetchedAt = now;
    return jwksCache;
  } catch {
    return jwksCache;
  }
}

function decodeHeader(token: string): { alg?: string; kid?: string } | null {
  try {
    return JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * 验证 Supabase Auth 签发的访问令牌。
 * 新版 Supabase 默认使用 ES256（非对称，JWKS 公钥校验）；
 * 旧版 / legacy 使用 HS256（对称密钥 SUPABASE_JWT_SECRET）。两者都兼容。
 */
export async function verifyAccessToken(token: string): Promise<{ sub: string } | null> {
  const header = decodeHeader(token);
  if (!header) return null;

  let verified: jwt.JwtPayload | string;
  try {
    if (header.alg === 'ES256') {
      if (!header.kid) return null;
      let keys = await getJwks();
      let jwk = keys?.find((k) => k.kid === header.kid);
      if (!jwk) {
        // 密钥可能已轮换：强制刷新一次再找
        keys = await getJwks(true);
        jwk = keys?.find((k) => k.kid === header.kid);
      }
      if (!jwk) return null;
      const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
      verified = jwt.verify(token, publicKey, { algorithms: ['ES256'] });
    } else if (header.alg === 'HS256') {
      const secret = process.env.SUPABASE_JWT_SECRET;
      if (!secret) return null;
      verified = jwt.verify(token, secret, { algorithms: ['HS256'] });
    } else {
      return null;
    }
  } catch {
    return null;
  }

  if (verified && typeof verified === 'object' && typeof verified.sub === 'string') {
    return { sub: verified.sub };
  }
  return null;
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

    const payload = await verifyAccessToken(authHeader.slice(7));
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

