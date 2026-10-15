import { Router } from 'express';
import type { PoolClient } from 'pg';
import { getPool, withUserContext } from '../db/index.js';
import { authRequired } from '../middleware/auth.js';
import { assembleBook } from './books.js';
import type { IBookWork } from '../types/book.js';

const router = Router();

interface ExportResult {
  version: 1;
  exportAt: number;
  account: string;
  user: {
    id: number;
    account: string;
    isAdmin: boolean;
    status: string;
    membershipLevel: string;
    membershipExpireAt: number;
    createdAt: number;
    updatedAt: number;
  };
  permissions: {
    canWriteShort: boolean;
    canDisassemble: boolean;
    canHotRank: boolean;
    canOptimize: boolean;
    canWorkbench: boolean;
    canUploadContinue: boolean;
  };
  books: IBookWork[];
}

// ========== 导出当前账号全部数据（跨设备迁移 / 备份） ==========
router.get('/export', authRequired, async (req, res, next) => {
  try {
    if (!req.user) return;
    const db = getPool();
    const userId = req.user.userId;

    const userRes = await db.query<Record<string, unknown>>(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    const u = userRes.rows[0];
    if (!u) {
      res.status(404).json({ success: false, message: '用户不存在' });
      return;
    }

    const permRes = await db.query<Record<string, unknown>>(
      'SELECT * FROM user_permissions WHERE user_id = $1',
      [userId]
    );
    const permRow = permRes.rows[0];

    const bookRes = await db.query<Record<string, unknown>>(
      'SELECT * FROM books WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    const books: IBookWork[] = [];
    for (const row of bookRes.rows) {
      books.push(await assembleBook(db, row));
    }

    const now = Date.now();
    const rawLevel = (u.membership_level as string) || 'none';
    const rawExpire = (u.membership_expire_at as number) || 0;
    const membershipLevel = rawExpire > 0 && rawExpire < now ? 'none' : rawLevel;

    const data: ExportResult = {
      version: 1,
      exportAt: now,
      account: u.account as string,
      user: {
        id: u.id as number,
        account: u.account as string,
        isAdmin: u.is_admin === true,
        status: u.is_active === true ? 'active' : 'disabled',
        membershipLevel,
        membershipExpireAt: membershipLevel === 'none' ? 0 : rawExpire,
        createdAt: u.created_at as number,
        updatedAt: u.updated_at as number,
      },
      permissions: {
        canWriteShort: permRow ? permRow.can_write_short === true : true,
        canDisassemble: permRow ? permRow.can_disassemble === true : true,
        canHotRank: permRow ? permRow.can_hot_rank === true : true,
        canOptimize: permRow ? permRow.can_optimize === true : true,
        canWorkbench: permRow ? permRow.can_workbench === true : true,
        canUploadContinue: permRow ? permRow.can_upload_continue === true : true,
      },
      books,
    };
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ========== 导入作品到当前账号 ==========
router.post('/import', authRequired, async (req, res, next) => {
  try {
    if (!req.user) return;
    const importData = req.body as ExportResult | undefined;
    if (!importData || importData.version !== 1 || !Array.isArray(importData.books)) {
      res.status(400).json({ success: false, message: '数据格式无效' });
      return;
    }

    const userId = req.user.userId;
    const now = Date.now();
    let imported = 0;
    let skipped = 0;

    for (const book of importData.books) {
      if (!book || !book.id) {
        skipped++;
        continue;
      }
      await withUserContext(req.user.supabaseUid, async (client: PoolClient) => {
        const existing = await client.query('SELECT id FROM books WHERE id = $1', [book.id]);
        let targetBook: IBookWork = book;
        if (existing.rows.length > 0) {
          const owned = await client.query('SELECT id FROM books WHERE id = $1 AND user_id = $2', [
            book.id,
            userId,
          ]);
          if (owned.rows.length > 0) {
            skipped++;
            return;
          }
          targetBook = {
            ...book,
            id: `${book.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          };
        }
        await insertBookForImport(client, userId, targetBook, now);
        imported++;
      });
    }

    res.json({
      success: true,
      message: `导入完成：成功 ${imported} 部，跳过 ${skipped} 部`,
      data: { importedBooks: imported, skippedBooks: skipped },
    });
  } catch (err) {
    next(err);
  }
});

async function insertBookForImport(
  client: PoolClient,
  userId: number,
  book: IBookWork,
  now: number
): Promise<void> {
  const bookId = book.id;
  await client.query(
    `INSERT INTO books
      (id, user_id, title, author, genre, category_group, setting, writing_style,
       narrative_perspective, style_description, style_guide, synopsis, blurb,
       blurb_word_count, blurb_focus, outline, script_content, cover_image,
       word_count, chapter_count, status, created_at, updated_at)
     VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $22)`,
    [
      bookId,
      userId,
      book.title || '未命名作品',
      book.author || '墨客',
      book.genre || '玄幻',
      book.categoryGroup || book.category || 'male',
      book.setting || '',
      book.writingStyle || '朴实真挚',
      book.narrativePerspective || 'third',
      book.styleDescription || '',
      book.styleGuide || null,
      book.synopsis || null,
      book.blurb || null,
      book.blurbWordCount || null,
      book.blurbFocus || null,
      book.outline || null,
      book.scriptContent || null,
      book.coverImage || null,
      book.wordCount || 0,
      book.chapterCount || 0,
      book.status || 'active',
      book.createdAt || now,
    ]
  );

  if (book.titleCandidates && book.titleCandidates.length > 0) {
    for (let i = 0; i < book.titleCandidates.length; i++) {
      await client.query(
        'INSERT INTO book_title_candidates (book_id, title, sort_order) VALUES ($1, $2, $3)',
        [bookId, book.titleCandidates[i], i]
      );
    }
  }
  if (book.characterProfiles && book.characterProfiles.length > 0) {
    for (let i = 0; i < book.characterProfiles.length; i++) {
      const c = book.characterProfiles[i];
      await client.query(
        `INSERT INTO characters
          (id, book_id, name, identity, gender, personality, background, relationship, character_arc, key_traits, extra_fields, sort_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)`,
        [
          c.id,
          bookId,
          c.name,
          c.identity || null,
          c.gender || null,
          c.personality || null,
          c.background || null,
          c.relationship || c.relationships || null,
          c.characterArc || null,
          c.keyTraits || null,
          c.extraFields ? JSON.stringify(c.extraFields) : null,
          i,
          now,
        ]
      );
    }
  }
  if (book.volumes && book.volumes.length > 0) {
    for (let i = 0; i < book.volumes.length; i++) {
      const v = book.volumes[i];
      await client.query(
        `INSERT INTO volumes (id, book_id, title, summary, chapter_count, sort_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
        [v.id, bookId, v.title, v.summary || null, v.chapterCount || 0, i, v.createdAt || now]
      );
    }
  }
  if (book.chapters && book.chapters.length > 0) {
    for (let i = 0; i < book.chapters.length; i++) {
      const ch = book.chapters[i];
      await client.query(
        `INSERT INTO chapters
          (id, book_id, volume_id, title, summary, word_count, content, status, sort_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
        [
          ch.id,
          bookId,
          ch.volumeId || null,
          ch.title,
          ch.summary || null,
          ch.wordCount || 0,
          ch.content || '',
          ch.status || 'draft',
          i,
          ch.createdAt || now,
        ]
      );
    }
  }
}

export default router;

