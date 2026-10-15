import { Router } from 'express';
import { withUserContext } from '../db/index.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

const PLUS_DAILY_WORD_LIMIT = 100000;

function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 每日字数配额（Plus 会员每日 10 万字上限，云端统一统计，跨设备一致）。
 * body: { chars: number }，chars=0 表示只查询不扣减。
 */
router.post('/consume', authRequired, async (req, res, next) => {
  try {
    if (!req.user) return;
    const { chars } = req.body as { chars?: number };
    const generatedChars = typeof chars === 'number' && chars > 0 ? Math.floor(chars) : 0;
    const userId = req.user.userId;

    const result = await withUserContext(req.user.supabaseUid, async (client) => {
      const userRes = await client.query<{
        is_admin: boolean;
        membership_level: string;
        membership_expire_at: number;
      }>('SELECT is_admin, membership_level, membership_expire_at FROM users WHERE id = $1', [
        userId,
      ]);
      const u = userRes.rows[0];
      const now = Date.now();

      // 管理员 / Ultra 会员：不限制
      if (!u || u.is_admin) {
        return { ok: true, used: 0, limit: 0, message: '' };
      }
      const isUltraActive =
        u.membership_level === 'ultra' && (!u.membership_expire_at || u.membership_expire_at > now);
      if (isUltraActive) {
        return { ok: true, used: 0, limit: 0, message: '' };
      }

      const todayKey = getTodayKey();
      const existing = await client.query<{ word_count: number }>(
        'SELECT word_count FROM daily_word_stats WHERE user_id = $1 AND date_str = $2',
        [userId, todayKey]
      );
      const used = existing.rows[0]?.word_count || 0;

      if (used + generatedChars > PLUS_DAILY_WORD_LIMIT) {
        return {
          ok: false,
          used,
          limit: PLUS_DAILY_WORD_LIMIT,
          message: `今日已生成 ${used} 字，Plus 会员每日最多 10 万字，升级 Ultra 可解锁无上限生成`,
        };
      }

      if (generatedChars > 0) {
        await client.query(
          `INSERT INTO daily_word_stats (user_id, date_str, word_count, updated_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, date_str)
           DO UPDATE SET word_count = daily_word_stats.word_count + EXCLUDED.word_count, updated_at = EXCLUDED.updated_at
           RETURNING word_count`,
          [userId, todayKey, generatedChars, now]
        );
      }
      return { ok: true, used: used + generatedChars, limit: PLUS_DAILY_WORD_LIMIT, message: '' };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;

