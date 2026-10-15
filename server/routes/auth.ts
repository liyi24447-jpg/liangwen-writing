import { Router } from 'express';
import { getPool, ensureUserRow } from '../db/index.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// ========== Supabase Auth 配置 ==========
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/** 内部邮箱域名：账号（用户名）映射为 Supabase 邮箱地址，不对外发送邮件 */
const EMAIL_DOMAIN = 'liangwen.app';
const ACCOUNT_RE = /^[a-zA-Z0-9_-]{3,32}$/;

export function accountToEmail(account: string): string {
  return `${account.toLowerCase()}@${EMAIL_DOMAIN}`;
}

function requireSupabaseConfig(): string | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return '服务端未配置 Supabase，请设置 SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY';
  }
  return null;
}

interface SupabaseTokenResponse {
  access_token?: string;
  refresh_token?: string;
  user?: { id?: string; email?: string };
  error?: string;
  error_description?: string;
  error_code?: string;
  code?: string;
  msg?: string;
  message?: string;
}

/** 把 Supabase Auth 的错误翻译成中文提示 */
function mapAuthError(body: SupabaseTokenResponse, fallback: string): string {
  const code = body.error_code || body.code || body.error || '';
  const desc = body.error_description || body.msg || body.message || '';
  const text = `${code} ${desc}`.toLowerCase();
  if (text.includes('invalid login credentials') || text.includes('invalid_grant')) {
    return '账号或密码错误';
  }
  if (text.includes('already registered') || text.includes('already exists') || code === 'user_already_exists') {
    return '该账号已存在，请直接登录或更换账号';
  }
  if (text.includes('rate limit') || text.includes('too many')) {
    return '请求过于频繁，请稍后再试';
  }
  if (text.includes('banned')) {
    return '账号已被禁用，请联系管理员';
  }
  return desc ? `${fallback}：${desc}` : fallback;
}

/** 服务端调用 Supabase Auth 密码登录（anon key，密码哈希完全由 Supabase 管理） */
async function supabasePasswordGrant(email: string, password: string): Promise<SupabaseTokenResponse> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json()) as SupabaseTokenResponse;
  if (!res.ok) {
    body.error_code = String(res.status);
    return body;
  }
  return body;
}

// ========== 注册 ==========
router.post('/register', async (req, res, next) => {
  try {
    const { account, password } = req.body as { account?: string; password?: string };
    const trimmedAccount = (account || '').trim();

    if (!ACCOUNT_RE.test(trimmedAccount)) {
      res.status(400).json({
        success: false,
        message: '账号只能包含字母、数字、下划线或短横线，长度 3-32 位',
      });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ success: false, message: '密码长度至少 6 位' });
      return;
    }

    const configError = requireSupabaseConfig();
    if (configError) {
      res.status(503).json({ success: false, message: configError });
      return;
    }

    const normalizedAccount = trimmedAccount.toLowerCase();
    const email = accountToEmail(normalizedAccount);

    // 1. 用服务端密钥在 Supabase Auth 创建用户（无需邮箱验证，不发邮件）
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { account: normalizedAccount },
      }),
    });
    const created = (await createRes.json()) as SupabaseTokenResponse & { id?: string };
    if (!createRes.ok) {
      res.status(400).json({ success: false, message: mapAuthError(created, '注册失败') });
      return;
    }
    const supabaseUid = created.id;
    if (!supabaseUid) {
      res.status(500).json({ success: false, message: '注册失败：未获取到用户 ID' });
      return;
    }

    // 2. 兜底创建 public.users 行（触发器通常已创建，幂等）
    let userRow: { id: number; account: string; isAdmin: boolean };
    try {
      userRow = await ensureUserRow({ supabaseUid, account: normalizedAccount, email });
    } catch {
      userRow = { id: 0, account: normalizedAccount, isAdmin: false };
    }

    // 3. 直接密码登录换取会话令牌
    const tokenRes = await supabasePasswordGrant(email, password);
    if (!tokenRes.access_token) {
      res.status(400).json({ success: false, message: mapAuthError(tokenRes, '注册失败，请尝试登录') });
      return;
    }

    res.json({
      success: true,
      message: '注册成功',
      data: {
        accessToken: tokenRes.access_token,
        refreshToken: tokenRes.refresh_token,
        user: { id: userRow.id, account: userRow.account, isAdmin: userRow.isAdmin },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ========== 登录 ==========
router.post('/login', async (req, res, next) => {
  try {
    const { account, password } = req.body as { account?: string; password?: string };
    const trimmedAccount = (account || '').trim();

    if (!trimmedAccount) {
      res.status(400).json({ success: false, message: '请输入账号' });
      return;
    }
    if (!password) {
      res.status(400).json({ success: false, message: '请输入密码' });
      return;
    }

    const configError = requireSupabaseConfig();
    if (configError) {
      res.status(503).json({ success: false, message: configError });
      return;
    }

    const email = accountToEmail(trimmedAccount);
    const tokenRes = await supabasePasswordGrant(email, password);
    if (!tokenRes.access_token) {
      res.status(400).json({ success: false, message: mapAuthError(tokenRes, '登录失败') });
      return;
    }

    const supabaseUid = tokenRes.user?.id;
    if (!supabaseUid) {
      res.status(500).json({ success: false, message: '登录失败：未获取到用户 ID' });
      return;
    }

    const userRow = await ensureUserRow({
      supabaseUid,
      account: trimmedAccount.toLowerCase(),
      email,
    });

    const state = await getPool().query<{ is_active: boolean }>(
      'SELECT is_active FROM users WHERE id = $1',
      [userRow.id]
    );
    if (state.rows[0] && !state.rows[0].is_active) {
      res.status(403).json({ success: false, message: '账号已被禁用，请联系管理员' });
      return;
    }

    res.json({
      success: true,
      message: '登录成功',
      data: {
        accessToken: tokenRes.access_token,
        refreshToken: tokenRes.refresh_token,
        user: { id: userRow.id, account: userRow.account, isAdmin: userRow.isAdmin },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ========== 刷新会话（登录状态保持） ==========
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      res.status(400).json({ success: false, message: '缺少刷新令牌' });
      return;
    }
    const configError = requireSupabaseConfig();
    if (configError) {
      res.status(503).json({ success: false, message: configError });
      return;
    }

    const refreshRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const body = (await refreshRes.json()) as SupabaseTokenResponse;
    if (!refreshRes.ok || !body.access_token) {
      res.status(401).json({ success: false, message: '登录状态已过期，请重新登录' });
      return;
    }
    res.json({
      success: true,
      data: { accessToken: body.access_token, refreshToken: body.refresh_token },
    });
  } catch (err) {
    next(err);
  }
});

// ========== 退出登录（吊销服务端会话，尽力而为） ==========
router.post('/logout', async (req, res, next) => {
  try {
    const { accessToken } = req.body as { accessToken?: string };
    if (accessToken && SUPABASE_URL) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      }).catch(() => undefined);
    }
    res.json({ success: true, message: '已退出登录' });
  } catch (err) {
    next(err);
  }
});

// ========== 获取当前用户信息 + 权限 + 会员 ==========
router.get('/me', authRequired, async (req, res, next) => {
  try {
    if (!req.user) return;
    const db = getPool();

    const userRes = await db.query<{
      membership_level: string;
      membership_expire_at: number;
    }>('SELECT membership_level, membership_expire_at FROM users WHERE id = $1', [req.user.userId]);
    const userRow = userRes.rows[0];

    const permRes = await db.query<{
      can_write_short: boolean;
      can_disassemble: boolean;
      can_hot_rank: boolean;
      can_optimize: boolean;
      can_workbench: boolean;
      can_upload_continue: boolean;
      configured_by_admin: boolean;
    }>('SELECT * FROM user_permissions WHERE user_id = $1', [req.user.userId]);
    const permRow = permRes.rows[0];

    const now = Date.now();
    const rawLevel = userRow?.membership_level || 'none';
    const rawExpire = userRow?.membership_expire_at || 0;
    const membershipLevel = rawExpire > 0 && rawExpire < now ? 'none' : rawLevel;
    const membershipExpireAt = membershipLevel === 'none' ? 0 : rawExpire;

    // 等级默认权限 + 账号单独配置覆盖（与产品逻辑一致）
    const levelPerms = await getLevelPermissions(db, rawLevel);
    let permissions = levelPerms;
    if (req.user.isAdmin) {
      permissions = ALL_PERMISSIONS_ON;
    } else if (permRow?.configured_by_admin) {
      permissions = {
        canWriteShort: permRow.can_write_short,
        canDisassemble: permRow.can_disassemble,
        canHotRank: permRow.can_hot_rank,
        canOptimize: permRow.can_optimize,
        canWorkbench: permRow.can_workbench,
        canUploadContinue: permRow.can_upload_continue,
      };
    }

    res.json({
      success: true,
      data: {
        user: {
          id: req.user.userId,
          account: req.user.account,
          isAdmin: req.user.isAdmin,
          membershipLevel,
          membershipExpireAt,
        },
        permissions,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ========== 修改密码（验证旧密码 + 调用 Supabase Auth 更新） ==========
router.post('/change-password', authRequired, async (req, res, next) => {
  try {
    if (!req.user) return;
    const { oldPassword, newPassword } = req.body as { oldPassword?: string; newPassword?: string };

    if (!oldPassword || !newPassword) {
      res.status(400).json({ success: false, message: '旧密码和新密码都不能为空' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: '新密码长度至少 6 位' });
      return;
    }

    const configError = requireSupabaseConfig();
    if (configError) {
      res.status(503).json({ success: false, message: configError });
      return;
    }

    // 先验证旧密码
    const check = await supabasePasswordGrant(accountToEmail(req.user.account), oldPassword);
    if (!check.access_token) {
      res.status(400).json({ success: false, message: '旧密码错误' });
      return;
    }

    // 用服务端密钥更新密码
    const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${req.user.supabaseUid}`, {
      method: 'PUT',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: newPassword }),
    });
    if (!updateRes.ok) {
      res.status(500).json({ success: false, message: '密码修改失败，请稍后重试' });
      return;
    }

    res.json({ success: true, message: '密码修改成功' });
  } catch (err) {
    next(err);
  }
});

// ========== 权限工具 ==========

export interface Permissions {
  canWriteShort: boolean;
  canDisassemble: boolean;
  canHotRank: boolean;
  canOptimize: boolean;
  canWorkbench: boolean;
  canUploadContinue: boolean;
}

const ALL_PERMISSIONS_ON: Permissions = {
  canWriteShort: true,
  canDisassemble: true,
  canHotRank: true,
  canOptimize: true,
  canWorkbench: true,
  canUploadContinue: true,
};

export const DEFAULT_LEVEL_PERMS: Record<string, Permissions> = {
  none: ALL_PERMISSIONS_ON,
  plus: ALL_PERMISSIONS_ON,
  ultra: ALL_PERMISSIONS_ON,
};

export async function getLevelPermissions(
  db: ReturnType<typeof getPool>,
  level: string
): Promise<Permissions> {
  const result = await db.query<{
    level: string;
    can_write_short: boolean;
    can_disassemble: boolean;
    can_hot_rank: boolean;
    can_optimize: boolean;
    can_workbench: boolean;
    can_upload_continue: boolean;
    configured_by_admin: boolean;
  }>('SELECT * FROM level_permissions WHERE level = $1', [level]);
  const row = result.rows[0];
  if (row && row.configured_by_admin) {
    return {
      canWriteShort: row.can_write_short,
      canDisassemble: row.can_disassemble,
      canHotRank: row.can_hot_rank,
      canOptimize: row.can_optimize,
      canWorkbench: row.can_workbench,
      canUploadContinue: row.can_upload_continue,
    };
  }
  return DEFAULT_LEVEL_PERMS[level] || ALL_PERMISSIONS_ON;
}

export default router;

