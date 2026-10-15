import { Router } from 'express';
import type { PoolClient } from 'pg';
import { withUserContext } from '../db/index.js';
import { authRequired } from '../middleware/auth.js';
import type { IBookWork, IChapter, IVolume, ICharacterProfile } from '../types/book.js';

const router = Router();

type BookRow = Record<string, unknown>;

// ========== 工具函数：组装作品完整数据 ==========
async function assembleBook(client: { query: PoolClient['query'] }, bookRow: BookRow): Promise<IBookWork> {
  const bookId = bookRow.id as string;

  const titleRes = await client.query<{ title: string }>(
    'SELECT title FROM book_title_candidates WHERE book_id = $1 ORDER BY sort_order',
    [bookId]
  );
  const titleCandidates = titleRes.rows.map((r) => r.title);

  const charRes = await client.query<Record<string, unknown>>(
    'SELECT * FROM characters WHERE book_id = $1 ORDER BY sort_order',
    [bookId]
  );
  const characterProfiles: ICharacterProfile[] = charRes.rows.map((c) => {
    const relationship = (c.relationship as string) || '';
    return {
      id: c.id as string,
      name: c.name as string,
      identity: (c.identity as string) || '',
      gender: (c.gender as string) || '',
      personality: (c.personality as string) || '',
      background: (c.background as string) || '',
      relationship,
      relationships: relationship,
      characterArc: (c.character_arc as string) || '',
      keyTraits: (c.key_traits as string) || '',
      extraFields: Array.isArray(c.extra_fields) ? (c.extra_fields as ICharacterProfile['extraFields']) : [],
    };
  });

  const volRes = await client.query<Record<string, unknown>>(
    'SELECT * FROM volumes WHERE book_id = $1 ORDER BY sort_order',
    [bookId]
  );
  const volumes: IVolume[] = volRes.rows.map((v) => ({
    id: v.id as string,
    title: v.title as string,
    summary: (v.summary as string) || '',
    chapterCount: v.chapter_count as number,
    createdAt: v.created_at as number,
    updatedAt: v.updated_at as number,
  }));

  const chRes = await client.query<Record<string, unknown>>(
    'SELECT * FROM chapters WHERE book_id = $1 ORDER BY sort_order',
    [bookId]
  );
  const chapters: IChapter[] = chRes.rows.map((c) => ({
    id: c.id as string,
    title: c.title as string,
    summary: (c.summary as string) || '',
    wordCount: c.word_count as number,
    content: c.content as string,
    volumeId: (c.volume_id as string) || undefined,
    status: c.status as 'draft' | 'completed',
    createdAt: c.created_at as number,
    updatedAt: c.updated_at as number,
  }));

  const categoryGroup = bookRow.category_group as 'male' | 'female';
  return {
    id: bookId,
    title: bookRow.title as string,
    author: (bookRow.author as string) || '墨客',
    genre: bookRow.genre as string,
    category: categoryGroup,
    categoryGroup,
    coverImage: (bookRow.cover_image as string) || undefined,
    setting: bookRow.setting as string,
    characters: [],
    writingStyle: bookRow.writing_style as string,
    narrativePerspective: bookRow.narrative_perspective as 'first' | 'third',
    styleDescription: bookRow.style_description as string,
    styleGuide: (bookRow.style_guide as string) || undefined,
    synopsis: (bookRow.synopsis as string) || undefined,
    blurb: (bookRow.blurb as string) || undefined,
    blurbWordCount: (bookRow.blurb_word_count as string) || undefined,
    blurbFocus: (bookRow.blurb_focus as string) || undefined,
    titleCandidates,
    outline: (bookRow.outline as string) || undefined,
    characterProfiles,
    volumes,
    chapters,
    scriptContent: (bookRow.script_content as string) || undefined,
    wordCount: bookRow.word_count as number,
    chapterCount: bookRow.chapter_count as number,
    status: bookRow.status as 'active' | 'archived',
    createdAt: bookRow.created_at as number,
    updatedAt: bookRow.updated_at as number,
  };
}

// ========== 工具函数：写入作品明细（书名候选 / 人物 / 卷 / 章节） ==========
async function replaceBookDetails(client: PoolClient, bookId: string, book: IBookWork, now: number): Promise<void> {
  await client.query('DELETE FROM book_title_candidates WHERE book_id = $1', [bookId]);
  if (book.titleCandidates && book.titleCandidates.length > 0) {
    for (let i = 0; i < book.titleCandidates.length; i++) {
      await client.query(
        'INSERT INTO book_title_candidates (book_id, title, sort_order) VALUES ($1, $2, $3)',
        [bookId, book.titleCandidates[i], i]
      );
    }
  }

  await client.query('DELETE FROM characters WHERE book_id = $1', [bookId]);
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

  await client.query('DELETE FROM volumes WHERE book_id = $1', [bookId]);
  if (book.volumes && book.volumes.length > 0) {
    for (let i = 0; i < book.volumes.length; i++) {
      const v = book.volumes[i];
      await client.query(
        `INSERT INTO volumes (id, book_id, title, summary, chapter_count, sort_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
        [v.id, bookId, v.title, v.summary || null, v.chapterCount || 0, i, now]
      );
    }
  }

  await client.query('DELETE FROM chapters WHERE book_id = $1', [bookId]);
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
          now,
        ]
      );
    }
  }
}

// ========== 获取当前用户的所有作品 ==========
router.get('/', authRequired, async (req, res, next) => {
  try {
    if (!req.user) return;
    const userId = req.user.userId;
    const supabaseUid = req.user.supabaseUid;

    const books = await withUserContext(supabaseUid, async (client) => {
      const res = await client.query<Record<string, unknown>>(
        `SELECT * FROM books WHERE user_id = $1 AND status = 'active' ORDER BY updated_at DESC`,
        [userId]
      );
      const list: IBookWork[] = [];
      for (const row of res.rows) {
        list.push(await assembleBook(client, row));
      }
      return list;
    });

    res.json({ success: true, data: books });
  } catch (err) {
    next(err);
  }
});

// ========== 获取单个作品详情 ==========
router.get('/:id', authRequired, async (req, res, next) => {
  try {
    if (!req.user) return;
    const bookId = String(req.params.id);
    const userId = req.user.userId;

    const book = await withUserContext(req.user.supabaseUid, async (client) => {
      const res = await client.query<Record<string, unknown>>(
        'SELECT * FROM books WHERE id = $1 AND user_id = $2',
        [bookId, userId]
      );
      if (res.rows.length === 0) return null;
      return assembleBook(client, res.rows[0]);
    });

    if (!book) {
      res.status(404).json({ success: false, message: '作品不存在' });
      return;
    }
    res.json({ success: true, data: book });
  } catch (err) {
    next(err);
  }
});

// ========== 保存/更新作品（全量，事务内先删明细后重建） ==========
router.put('/:id', authRequired, async (req, res, next) => {
  try {
    if (!req.user) return;
    const bookId = String(req.params.id);
    const book = req.body as IBookWork;
    const userId = req.user.userId;
    const now = Date.now();

    const result = await withUserContext(req.user.supabaseUid, async (client) => {
      const existing = await client.query('SELECT id FROM books WHERE id = $1 AND user_id = $2', [
        bookId,
        userId,
      ]);
      if (existing.rows.length === 0) return null;

      await client.query(
        `UPDATE books SET
          title = $1, author = $2, genre = $3, category_group = $4, setting = $5,
          writing_style = $6, narrative_perspective = $7, style_description = $8,
          style_guide = $9, synopsis = $10, blurb = $11, blurb_word_count = $12,
          blurb_focus = $13, outline = $14, script_content = $15, cover_image = $16,
          word_count = $17, chapter_count = $18, status = $19, updated_at = $20
         WHERE id = $21 AND user_id = $22`,
        [
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
          now,
          bookId,
          userId,
        ]
      );

      await replaceBookDetails(client, bookId, book, now);

      const updated = await client.query<Record<string, unknown>>(
        'SELECT * FROM books WHERE id = $1',
        [bookId]
      );
      return assembleBook(client, updated.rows[0]);
    });

    if (!result) {
      res.status(404).json({ success: false, message: '作品不存在' });
      return;
    }
    res.json({ success: true, data: result, message: '保存成功' });
  } catch (err) {
    next(err);
  }
});

// ========== 创建作品 ==========
router.post('/', authRequired, async (req, res, next) => {
  try {
    if (!req.user) return;
    const book = req.body as IBookWork;
    const userId = req.user.userId;
    const now = Date.now();
    const bookId = book.id || `book_${now}_${Math.random().toString(36).slice(2, 8)}`;

    const created = await withUserContext(req.user.supabaseUid, async (client) => {
      // Plus 会员作品数量限制：最多 2 部（Ultra / 管理员 / 免费用户不受限）
      const userRes = await client.query<{
        is_admin: boolean;
        membership_level: string;
        membership_expire_at: number;
      }>('SELECT is_admin, membership_level, membership_expire_at FROM users WHERE id = $1', [userId]);
      const u = userRes.rows[0];
      const isPlusActive =
        u?.membership_level === 'plus' &&
        (!u.membership_expire_at || u.membership_expire_at > now);
      if (!u?.is_admin && isPlusActive) {
        const countRes = await client.query<{ c: number }>(
          "SELECT COUNT(*)::int AS c FROM books WHERE user_id = $1 AND status = 'active'",
          [userId]
        );
        if (countRes.rows[0].c >= 2) {
          const err = new Error('PLUS_BOOK_LIMIT');
          (err as Error & { code: string }).code = 'PLUS_BOOK_LIMIT';
          throw err;
        }
      }

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
          now,
        ]
      );

      await replaceBookDetails(client, bookId, { ...book, id: bookId }, now);

      const createdRes = await client.query<Record<string, unknown>>(
        'SELECT * FROM books WHERE id = $1',
        [bookId]
      );
      return assembleBook(client, createdRes.rows[0]);
    });

    res.json({ success: true, data: created, message: '创建成功' });
  } catch (err) {
    if ((err as Error & { code?: string }).code === 'PLUS_BOOK_LIMIT') {
      res.status(400).json({
        success: false,
        message: 'Plus 会员最多保存 2 部作品，升级 Ultra 可解锁不限数量',
      });
      return;
    }
    next(err);
  }
});

// ========== 删除作品（软删除） ==========
router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    if (!req.user) return;
    const bookId = String(req.params.id);
    const userId = req.user.userId;

    const changed = await withUserContext(req.user.supabaseUid, async (client) => {
      const result = await client.query(
        "UPDATE books SET status = 'archived', updated_at = $1 WHERE id = $2 AND user_id = $3",
        [Date.now(), bookId, userId]
      );
      return result.rowCount || 0;
    });

    if (changed === 0) {
      res.status(404).json({ success: false, message: '作品不存在' });
      return;
    }
    res.json({ success: true, message: '作品已删除' });
  } catch (err) {
    next(err);
  }
});

export default router;

// 供数据导出/导入复用
export { assembleBook };

