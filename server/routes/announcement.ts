import { Router } from 'express';
import { getPool } from '../db/index.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// ========== 获取当前启用的公告（登录用户） ==========
router.get('/current', authRequired, async (_req, res, next) => {
  try {
    const result = await getPool().query<{
      id: number;
      title: string;
      content: string;
      is_enabled: boolean;
      updated_at: number;
    }>('SELECT id, title, content, is_enabled, updated_at FROM announcements WHERE is_enabled = true ORDER BY id DESC LIMIT 1');
    const row = result.rows[0];
    if (!row) {
      res.json({ success: true, data: null });
      return;
    }
    res.json({
      success: true,
      data: {
        id: row.id,
        title: row.title,
        content: row.content,
        isEnabled: row.is_enabled,
        updatedAt: row.updated_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

