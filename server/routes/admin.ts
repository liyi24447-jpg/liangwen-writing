import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getPool } from '../db/index.js';
import { authRequired, adminRequired } from '../middleware/auth.js';
import { DEFAULT_LEVEL_PERMS, getLevelPermissions, type Permissions } from './auth.js';

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/** 调用 Supabase Admin API 更新认证用户（禁封/改密/删除） */
async function supabaseAdmin(uid: string, path: string, body: Record<string, unknown>, method = 'PUT') {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res;
}

interface PermissionsRow {
  can_write_short: boolean;
  can_disassemble: boolean;
  can_hot_rank: boolean;
  can_optimize: boolean;
  can_workbench: boolean;
  can_upload_continue: boolean;
  configured_by_admin: boolean;
}

// ========== 管理员：获取所有用户列表 ==========
router.get('/users', authRequired, adminRequired, async (_req, res, next) => {
  try {
    const result = await getPool().query<Record<string, unknown>>(
      `SELECT u.id, u.account, u.is_admin, u.is_active, u.created_at, u.updated_at,
              u.membership_level, u.membership_expire_at,
              p.can_write_short, p.can_disassemble, p.can_hot_rank, p.can_optimize,
              p.can_workbench, p.can_upload_continue, p.configured_by_admin
       FROM users u
       LEFT JOIN user_permissions p ON u.id = p.user_id
       ORDER BY u.created_at DESC`
    );

    const now = Date.now();
    const list = result.rows.map((u) => {
      const rawLevel = (u.membership_level as string) || 'none';
      const rawExpire = (u.membership_expire_at as number) || 0;
      const level = rawExpire > 0 && rawExpire < now ? 'none' : rawLevel;
      return {
        id: u.id,
        account: u.account,
        isAdmin: u.is_admin === true,
        isActive: u.is_active === true,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
        membershipLevel: level,
        membershipExpireAt: level === 'none' ? 0 : rawExpire,
        permissions: {
          canWriteShort: u.can_write_short === true,
          canDisassemble: u.can_disassemble === true,
          canHotRank: u.can_hot_rank === true,
          canOptimize: u.can_optimize === true,
          canWorkbench: u.can_workbench === true,
          canUploadContinue: u.can_upload_continue === true,
        },
      };
    });

    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

// ========== 管理员：禁用/启用用户 ==========
router.post('/users/:id/toggle-status', authRequired, adminRequired, async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) {
      res.status(400).json({ success: false, message: '用户 ID 无效' });
      return;
    }

    const db = getPool();
    const user = await db.query<{ id: number; supabase_uid: string; is_active: boolean; is_admin: boolean }>(
      'SELECT id, supabase_uid, is_active, is_admin FROM users WHERE id = $1',
      [userId]
    );
    const row = user.rows[0];
    if (!row) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }
    if (row.is_admin) {
      res.status(400).json({ success: false, message: '不能禁用管理员账号' });
      return;
    }

    const newStatus = !row.is_active;
    await db.query('UPDATE users SET is_active = $1, updated_at = $2 WHERE id = $3', [
      newStatus,
      Date.now(),
      userId,
    ]);

    // 同步禁封 Supabase Auth 登录（尽力而为）
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && row.supabase_uid) {
      await supabaseAdmin(row.supabase_uid, '', { ban_duration: newStatus ? 'none' : '876000h' }).catch(
        () => undefined
      );
    }

    res.json({
      success: true,
      message: newStatus ? '账号已启用' : '账号已禁用',
      data: { isActive: newStatus },
    });
  } catch (err) {
    next(err);
  }
});

// ========== 管理员：重置用户密码 ==========
const resetPasswordHandler = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const userId = Number(req.params.id);
    const { newPassword } = req.body as { newPassword?: string };

    if (!userId) {
      res.status(400).json({ success: false, message: '用户 ID 无效' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, message: '新密码长度至少 6 位' });
      return;
    }

    const user = await getPool().query<{ id: number; supabase_uid: string }>(
      'SELECT id, supabase_uid FROM users WHERE id = $1',
      [userId]
    );
    const row = user.rows[0];
    if (!row) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      res.status(503).json({ success: false, message: '服务端未配置 Supabase，无法重置密码' });
      return;
    }
    const updateRes = await supabaseAdmin(row.supabase_uid, '', { password: newPassword });
    if (!updateRes.ok) {
      res.status(500).json({ success: false, message: '密码重置失败，请稍后重试' });
      return;
    }
    res.json({ success: true, message: '密码重置成功' });
  } catch (err) {
    next(err);
  }
};
router.post('/users/:id/reset-password', authRequired, adminRequired, resetPasswordHandler);
router.patch('/users/:id/reset-password', authRequired, adminRequired, resetPasswordHandler);

// ========== 管理员：获取用户单独权限 ==========
router.get('/users/:id/permissions', authRequired, adminRequired, async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const result = await getPool().query<PermissionsRow>(
      'SELECT * FROM user_permissions WHERE user_id = $1',
      [userId]
    );
    const row = result.rows[0];
    if (!row) {
      const userRes = await getPool().query<{ membership_level: string }>(
        'SELECT membership_level FROM users WHERE id = $1',
        [userId]
      );
      const level = userRes.rows[0]?.membership_level || 'none';
      res.json({ success: true, data: await getLevelPermissions(getPool(), level) });
      return;
    }
    res.json({
      success: true,
      data: {
        canWriteShort: row.can_write_short,
        canDisassemble: row.can_disassemble,
        canHotRank: row.can_hot_rank,
        canOptimize: row.can_optimize,
        canWorkbench: row.can_workbench,
        canUploadContinue: row.can_upload_continue,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ========== 管理员：更新用户单独权限 ==========
const updateUserPermissionsHandler = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const userId = Number(req.params.id);
    const body = (req.body || {}) as Record<string, unknown>;
    const perms = (body.permissions || body) as Record<string, boolean>;

    if (!userId) {
      res.status(400).json({ success: false, message: '用户 ID 无效' });
      return;
    }
    const user = await getPool().query('SELECT id FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }

    const toBool = (v: boolean | undefined, def = true) => (v === undefined ? def : v);
    const now = Date.now();
    await getPool().query(
      `INSERT INTO user_permissions
        (user_id, can_write_short, can_disassemble, can_hot_rank, can_optimize, can_workbench, can_upload_continue, configured_by_admin, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $8)
       ON CONFLICT (user_id) DO UPDATE SET
        can_write_short = EXCLUDED.can_write_short,
        can_disassemble = EXCLUDED.can_disassemble,
        can_hot_rank = EXCLUDED.can_hot_rank,
        can_optimize = EXCLUDED.can_optimize,
        can_workbench = EXCLUDED.can_workbench,
        can_upload_continue = EXCLUDED.can_upload_continue,
        configured_by_admin = true,
        updated_at = EXCLUDED.updated_at`,
      [
        userId,
        toBool(perms.canWriteShort),
        toBool(perms.canDisassemble),
        toBool(perms.canHotRank),
        toBool(perms.canOptimize),
        toBool(perms.canWorkbench),
        toBool(perms.canUploadContinue),
        now,
      ]
    );

    res.json({ success: true, message: '权限更新成功' });
  } catch (err) {
    next(err);
  }
};
router.post('/users/:id/permissions', authRequired, adminRequired, updateUserPermissionsHandler);
router.patch('/users/:id/permissions', authRequired, adminRequired, updateUserPermissionsHandler);

// ========== 管理员：等级默认权限（GET / PATCH） ==========
router.get('/permissions/levels', authRequired, adminRequired, async (_req, res, next) => {
  try {
    const result = await getPool().query<PermissionsRow & { level: string }>(
      'SELECT * FROM level_permissions'
    );
    const rows = new Map(result.rows.map((r) => [r.level, r]));
    const map: Record<string, Permissions> = {};
    for (const level of ['none', 'plus', 'ultra']) {
      const row = rows.get(level);
      map[level] = row
        ? {
            canWriteShort: row.can_write_short,
            canDisassemble: row.can_disassemble,
            canHotRank: row.can_hot_rank,
            canOptimize: row.can_optimize,
            canWorkbench: row.can_workbench,
            canUploadContinue: row.can_upload_continue,
          }
        : DEFAULT_LEVEL_PERMS[level];
    }
    res.json({ success: true, data: map });
  } catch (err) {
    next(err);
  }
});

router.patch('/permissions/levels/:level', authRequired, adminRequired, async (req, res, next) => {
  try {
    const level = String(req.params.level);
    if (!['none', 'plus', 'ultra'].includes(level)) {
      res.status(400).json({ success: false, message: '会员等级无效' });
      return;
    }
    const body = (req.body || {}) as Record<string, unknown>;
    const perms = (body.permissions || body) as Record<string, boolean>;
    const toBool = (v: boolean | undefined, def = true) => (v === undefined ? def : v);

    await getPool().query(
      `INSERT INTO level_permissions
        (level, can_write_short, can_disassemble, can_hot_rank, can_optimize, can_workbench, can_upload_continue, configured_by_admin, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
       ON CONFLICT (level) DO UPDATE SET
        can_write_short = EXCLUDED.can_write_short,
        can_disassemble = EXCLUDED.can_disassemble,
        can_hot_rank = EXCLUDED.can_hot_rank,
        can_optimize = EXCLUDED.can_optimize,
        can_workbench = EXCLUDED.can_workbench,
        can_upload_continue = EXCLUDED.can_upload_continue,
        configured_by_admin = true,
        updated_at = EXCLUDED.updated_at`,
      [
        level,
        toBool(perms.canWriteShort),
        toBool(perms.canDisassemble),
        toBool(perms.canHotRank),
        toBool(perms.canOptimize),
        toBool(perms.canWorkbench),
        toBool(perms.canUploadContinue),
        Date.now(),
      ]
    );
    res.json({ success: true, message: '等级权限已保存' });
  } catch (err) {
    next(err);
  }
});

// ========== 管理员：删除用户 ==========
router.delete('/users/:id', authRequired, adminRequired, async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) {
      res.status(400).json({ success: false, message: '用户 ID 无效' });
      return;
    }
    if (req.user && req.user.userId === userId) {
      res.status(400).json({ success: false, message: '不能删除自己的账号' });
      return;
    }

    const user = await getPool().query<{ id: number; supabase_uid: string; is_admin: boolean }>(
      'SELECT id, supabase_uid, is_admin FROM users WHERE id = $1',
      [userId]
    );
    const row = user.rows[0];
    if (!row) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }
    if (row.is_admin) {
      res.status(400).json({ success: false, message: '不能删除管理员账号' });
      return;
    }

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && row.supabase_uid) {
      await supabaseAdmin(row.supabase_uid, '', {}, 'DELETE').catch(() => undefined);
    }
    await getPool().query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ success: true, message: '用户已删除' });
  } catch (err) {
    next(err);
  }
});

// ========== 管理员：设置用户会员 ==========
router.post('/users/:id/membership', authRequired, adminRequired, async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { level, days } = req.body as { level?: string; days?: number };

    if (!userId) {
      res.status(400).json({ success: false, message: '用户 ID 无效' });
      return;
    }
    if (!level || !['none', 'plus', 'ultra'].includes(level)) {
      res.status(400).json({ success: false, message: '会员等级无效' });
      return;
    }
    const user = await getPool().query('SELECT id FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }

    const now = Date.now();
    let expireAt = 0;
    if (level !== 'none') {
      const dayCount = typeof days === 'number' && days > 0 ? days : 30;
      expireAt = now + dayCount * 24 * 60 * 60 * 1000;
    }

    await getPool().query(
      'UPDATE users SET membership_level = $1, membership_expire_at = $2, updated_at = $3 WHERE id = $4',
      [level, expireAt, now, userId]
    );

    res.json({
      success: true,
      message: level === 'none' ? '已取消会员' : `已设置为 ${level === 'ultra' ? 'Ultra' : 'Plus'} 会员`,
      data: { membershipLevel: level, membershipExpireAt: expireAt },
    });
  } catch (err) {
    next(err);
  }
});

// ========== 管理员：延长会员 ==========
router.post('/users/:id/membership/extend', authRequired, adminRequired, async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { days } = req.body as { days?: number };
    if (!userId) {
      res.status(400).json({ success: false, message: '用户 ID 无效' });
      return;
    }
    if (typeof days !== 'number') {
      res.status(400).json({ success: false, message: '天数无效' });
      return;
    }

    const user = await getPool().query<{
      membership_level: string;
      membership_expire_at: number;
    }>('SELECT membership_level, membership_expire_at FROM users WHERE id = $1', [userId]);
    const row = user.rows[0];
    if (!row) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }

    const now = Date.now();
    const baseTime = row.membership_expire_at > now ? row.membership_expire_at : now;
    const newExpireAt = baseTime + days * 24 * 60 * 60 * 1000;
    const newLevel = row.membership_level === 'none' ? 'plus' : row.membership_level;

    await getPool().query(
      'UPDATE users SET membership_level = $1, membership_expire_at = $2, updated_at = $3 WHERE id = $4',
      [newLevel, newExpireAt, now, userId]
    );

    res.json({
      success: true,
      message: `已延长 ${days} 天`,
      data: { membershipLevel: newLevel, membershipExpireAt: newExpireAt },
    });
  } catch (err) {
    next(err);
  }
});

// ========== 管理员：公告 ==========
router.get('/announcement', authRequired, adminRequired, async (_req, res, next) => {
  try {
    const result = await getPool().query<Record<string, unknown>>(
      'SELECT id, title, content, is_enabled, updated_at FROM announcements ORDER BY id DESC LIMIT 1'
    );
    const row = result.rows[0];
    res.json({
      success: true,
      data: row
        ? {
            id: row.id,
            title: row.title,
            content: row.content,
            isEnabled: row.is_enabled === true,
            updatedAt: row.updated_at,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/announcement', authRequired, adminRequired, async (req, res, next) => {
  try {
    const { title, content, isEnabled } = req.body as {
      title?: string;
      content?: string;
      isEnabled?: boolean;
    };
    const now = Date.now();
    const titleVal = title || '';
    const contentVal = content || '';
    const enabled = isEnabled === true;

    await getPool().query(
      `INSERT INTO announcements (title, content, is_enabled, updated_at)
       VALUES ($1, $2, $3, $4)`,
      [titleVal, contentVal, enabled, now]
    );
    res.json({ success: true, message: '公告已保存' });
  } catch (err) {
    next(err);
  }
});

// ========== 管理员：兑换码 ==========
router.get('/redemption-codes', authRequired, adminRequired, async (req, res, next) => {
  try {
    const { keyword, status } = req.query as { keyword?: string; status?: string };
    const conditions: string[] = [];
    const params: Array<string> = [];
    let i = 1;
    if (keyword && keyword.trim()) {
      conditions.push(`code ILIKE $${i++}`);
      params.push(`%${keyword.trim().toUpperCase()}%`);
    }
    if (status === 'active') {
      conditions.push('is_active = true AND is_used = false');
    } else if (status === 'used') {
      conditions.push('is_used = true');
    } else if (status === 'disabled') {
      conditions.push('is_active = false');
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await getPool().query<Record<string, unknown>>(
      `SELECT * FROM redemption_codes ${where} ORDER BY id DESC LIMIT 100`,
      params
    );
    const data = result.rows.map((r) => ({
      id: r.id,
      code: r.code,
      membershipLevel: r.membership_level,
      days: r.days,
      isActive: r.is_active === true,
      isUsed: r.is_used === true,
      usedBy: r.used_by,
      usedAt: r.used_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/redemption-codes', authRequired, adminRequired, async (req, res, next) => {
  try {
    const { level, days, count, prefix } = req.body as {
      level?: string;
      days?: number;
      count?: number;
      prefix?: string;
    };
    if (!level || !['plus', 'ultra'].includes(level)) {
      res.status(400).json({ success: false, message: '会员等级无效' });
      return;
    }
    if (typeof days !== 'number' || days <= 0) {
      res.status(400).json({ success: false, message: '天数无效' });
      return;
    }
    const codeCount = typeof count === 'number' && count > 0 && count <= 100 ? count : 1;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const p = (prefix || '').toUpperCase();
    const now = Date.now();
    const generated: string[] = [];
    const db = getPool();

    for (let i = 0; i < codeCount; i++) {
      let code = '';
      let attempts = 0;
      let unique = false;
      while (!unique && attempts < 10) {
        code = p;
        for (let j = 0; j < 12; j++) {
          code += chars[Math.floor(Math.random() * chars.length)];
        }
        const existing = await db.query('SELECT id FROM redemption_codes WHERE code = $1', [code]);
        if (existing.rows.length === 0) unique = true;
        attempts++;
      }
      await db.query(
        `INSERT INTO redemption_codes (code, membership_level, days, is_active, is_used, created_at, updated_at)
         VALUES ($1, $2, $3, true, false, $4, $4)`,
        [code, level, days, now]
      );
      generated.push(code);
    }

    res.json({
      success: true,
      message: `已生成 ${generated.length} 个兑换码`,
      data: generated,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/redemption-codes/:id/toggle', authRequired, adminRequired, async (req, res, next) => {
  try {
    const codeId = Number(req.params.id);
    if (!codeId) {
      res.status(400).json({ success: false, message: '兑换码 ID 无效' });
      return;
    }
    const code = await getPool().query<{ is_active: boolean; is_used: boolean }>(
      'SELECT is_active, is_used FROM redemption_codes WHERE id = $1',
      [codeId]
    );
    const row = code.rows[0];
    if (!row) {
      res.status(404).json({ success: false, message: '兑换码不存在' });
      return;
    }
    if (row.is_used) {
      res.status(400).json({ success: false, message: '已兑换的码无法停用' });
      return;
    }
    const newActive = !row.is_active;
    await getPool().query('UPDATE redemption_codes SET is_active = $1, updated_at = $2 WHERE id = $3', [
      newActive,
      Date.now(),
      codeId,
    ]);
    res.json({
      success: true,
      message: newActive ? '已启用' : '已停用',
      data: { isActive: newActive },
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/redemption-codes/:id', authRequired, adminRequired, async (req, res, next) => {
  try {
    const codeId = Number(req.params.id);
    if (!codeId) {
      res.status(400).json({ success: false, message: '兑换码 ID 无效' });
      return;
    }
    await getPool().query('DELETE FROM redemption_codes WHERE id = $1', [codeId]);
    res.json({ success: true, message: '已删除' });
  } catch (err) {
    next(err);
  }
});

// ========== 管理员：统计概览 ==========
router.get('/stats', authRequired, adminRequired, async (_req, res, next) => {
  try {
    const db = getPool();
    const totalUsers = (await db.query<{ c: number }>('SELECT COUNT(*)::int AS c FROM users')).rows[0].c;
    const activeUsers = (await db.query<{ c: number }>('SELECT COUNT(*)::int AS c FROM users WHERE is_active = true'))
      .rows[0].c;
    const adminUsers = (await db.query<{ c: number }>('SELECT COUNT(*)::int AS c FROM users WHERE is_admin = true'))
      .rows[0].c;
    const totalBooks = (await db.query<{ c: number }>('SELECT COUNT(*)::int AS c FROM books')).rows[0].c;

    res.json({ success: true, data: { totalUsers, activeUsers, adminUsers, totalBooks } });
  } catch (err) {
    next(err);
  }
});

export default router;

