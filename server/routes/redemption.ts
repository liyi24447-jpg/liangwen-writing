import { Router } from 'express';
import { getPool } from '../db/index.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// ========== 兑换兑换码 ==========
router.post('/redeem', authRequired, async (req, res, next) => {
  try {
    if (!req.user) return;
    const { code } = req.body as { code?: string };
    if (!code || !code.trim()) {
      res.status(400).json({ success: false, message: '请输入兑换码' });
      return;
    }

    const db = getPool();
    const trimmedCode = code.trim().toUpperCase();

    const redemptionRes = await db.query<{
      id: number;
      membership_level: string;
      days: number;
      is_active: boolean;
      is_used: boolean;
    }>('SELECT id, membership_level, days, is_active, is_used FROM redemption_codes WHERE code = $1', [
      trimmedCode,
    ]);
    const redemption = redemptionRes.rows[0];
    if (!redemption) {
      res.status(400).json({ success: false, message: '兑换码无效，请检查后重试' });
      return;
    }
    if (!redemption.is_active) {
      res.status(400).json({ success: false, message: '该兑换码已停用' });
      return;
    }
    if (redemption.is_used) {
      res.status(400).json({ success: false, message: '该兑换码已被使用' });
      return;
    }

    const now = Date.now();
    const level = redemption.membership_level;
    const days = redemption.days;
    const extendMs = days * 24 * 60 * 60 * 1000;

    const userRes = await db.query<{ membership_level: string; membership_expire_at: number }>(
      'SELECT membership_level, membership_expire_at FROM users WHERE id = $1',
      [req.user.userId]
    );
    const user = userRes.rows[0];
    if (!user) {
      res.status(400).json({ success: false, message: '用户不存在' });
      return;
    }

    const currentLevel = user.membership_level;
    const currentExpire = user.membership_expire_at;
    let newExpireAt: number;

    if (currentLevel === 'none' || currentExpire <= now) {
      newExpireAt = now + extendMs;
    } else if (currentLevel === level) {
      newExpireAt = currentExpire + extendMs;
    } else if (level === 'ultra') {
      newExpireAt = now + extendMs;
    } else {
      newExpireAt = currentExpire + extendMs;
    }

    let finalLevel = currentLevel;
    if (level === 'ultra' || currentLevel === 'ultra') {
      finalLevel = 'ultra';
    } else if (level === 'plus' || currentLevel === 'plus') {
      finalLevel = 'plus';
    }
    if (currentLevel === 'ultra' && currentExpire > now && level === 'plus') {
      finalLevel = 'ultra';
      newExpireAt = currentExpire + extendMs;
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        'UPDATE users SET membership_level = $1, membership_expire_at = $2, updated_at = $3 WHERE id = $4',
        [finalLevel, newExpireAt, now, req.user.userId]
      );
      const used = await client.query(
        'UPDATE redemption_codes SET is_used = true, used_by = $1, used_at = $2, updated_at = $2 WHERE code = $3 AND is_used = false',
        [req.user.userId, now, trimmedCode]
      );
      if (used.rowCount === 0) {
        throw new Error('CODE_ALREADY_USED');
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      if (err instanceof Error && err.message === 'CODE_ALREADY_USED') {
        res.status(400).json({ success: false, message: '该兑换码已被使用' });
        return;
      }
      throw err;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      message: `兑换成功！已开通 ${level === 'ultra' ? 'Ultra' : 'Plus'} 会员 ${days} 天`,
      data: { membershipLevel: finalLevel, membershipExpireAt: newExpireAt },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

