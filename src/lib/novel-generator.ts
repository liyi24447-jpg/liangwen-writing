import { scopedStorage, logger, capabilityClient } from '@lark-apaas/client-toolkit-lite';
import { toast } from 'sonner';
import type { IBookWork, IChapter, ICharacterProfile, IVolume } from '@/data/novel';
import { getBooksStorageKey, getCurrentBookKey } from '@/lib/storage-keys';
import { apiRequest, getAuthToken, apiConsumeQuota, type QuotaResult } from '@/lib/api-client';

/**
 * 每日字数配额：登录用户走后端 API（云端统一统计，跨设备一致）；
 * 游客不受限。后端不可用时阻止生成，避免绕过云端配额。
 */
async function consumeDailyWordQuota(generatedChars: number): Promise<QuotaResult> {
  const token = getAuthToken();
  if (!token) {
    return { ok: true, used: 0, limit: 0, message: '' };
  }
  const res = await apiConsumeQuota(generatedChars);
  if (!res.success || !res.data) {
    return { ok: false, used: 0, limit: 0, message: res.message || '无法连接服务器，请检查网络后重试' };
  }
  return res.data;
}

// ========== 全书设定上下文拼装 ==========
export function buildBookContextPrompt(book: IBookWork): string {
  const parts: string[] = [];

  parts.push(`【作品基础信息】`);
  parts.push(`书名：${book.title || '未命名'}`);
  parts.push(`题材：${book.genre || '未设定'}`);
  parts.push(`分类：${book.category === 'male' ? '男频' : '女频'}`);
  if (book.styleDescription) parts.push(`风格提示：${book.styleDescription}`);
  if (book.setting) parts.push(`世界观设定：${book.setting}`);
  if (book.writingStyle) parts.push(`文风：${book.writingStyle}`);
  parts.push('');

  if (book.styleGuide?.trim()) {
    parts.push(`【创作风格指南】`);
    parts.push(book.styleGuide);
    parts.push('');
  }

  if (book.synopsis?.trim()) {
    parts.push(`【故事梗概】`);
    parts.push(book.synopsis);
    parts.push('');
  }

  if (book.outline?.trim()) {
    parts.push(`【详细大纲】`);
    parts.push(book.outline);
    parts.push('');
  }

  if (book.characterProfiles && book.characterProfiles.length > 0) {
    parts.push(`【人物设定】`);
    book.characterProfiles.forEach((char, i) => {
      parts.push(`人物${i + 1}：${char.name}`);
      if (char.identity) parts.push(`  身份：${char.identity}`);
      if (char.gender) parts.push(`  性别：${char.gender === 'male' ? '男' : char.gender === 'female' ? '女' : '其他'}`);
      if (char.personality) parts.push(`  性格：${char.personality}`);
      if (char.keyTraits) parts.push(`  关键经历与性格关键词：${char.keyTraits}`);
      if (char.background) parts.push(`  背景：${char.background.slice(0, 300)}`);
      if (char.relationships) parts.push(`  人物关系：${char.relationships}`);
      if (char.characterArc) parts.push(`  成长弧光：${char.characterArc}`);
    });
    parts.push('');
  }

  if (book.volumes && book.volumes.length > 0) {
    parts.push(`【卷章结构】`);
    book.volumes.forEach((vol, i) => {
      parts.push(`${vol.title}（共${vol.chapterCount}章）`);
      if (vol.summary) parts.push(`  ${vol.summary}`);
      const volChapters = book.chapters.filter((c) => c.volumeId === vol.id);
      volChapters.forEach((ch) => {
        parts.push(`  - ${ch.title}${ch.summary ? `：${ch.summary.slice(0, 50)}` : ''}`);
      });
    });
    parts.push('');
  }

  return parts.join('\n');
}

const NOVEL_GENERATOR_ID = 'ai_novel_generate_1';
const BOOK_ANALYSIS_ID = 'book_analysis_disassemble_1';
const HUMANIZE_OPTIMIZE_ID = 'ai_text_humanize_optimization_1';
const TITLE_SUGGESTION_ID = 'ai_book_title_suggestion_1';
const COVER_GENERATE_ID = 'ai_novel_cover_generate_1';

export interface NovelGenerateParams {
  genre: string;
  novel_type: string;
  setting: string;
  characters: string;
  style: string;
  additional_requirements?: string;
}

// ========== 作品管理（后端 API，按用户隔离） ==========
export async function getAllBooks(): Promise<IBookWork[]> {
  // 未登录时回退到本地存储（兼容游客）
  if (!getAuthToken()) {
    try {
      const raw = scopedStorage.getItem(getBooksStorageKey());
      if (!raw) return [];
      return JSON.parse(raw) as IBookWork[];
    } catch {
      return [];
    }
  }
  const res = await apiRequest<IBookWork[]>('/books', { method: 'GET' });
  if (res.success && res.data) {
    return res.data;
  }
  if (res.statusCode !== 401) {
    toast.error(res.message || '作品列表加载失败，请检查网络后重试');
  }
  return [];
}

export async function getBook(id: string): Promise<IBookWork | undefined> {
  if (!getAuthToken()) {
    const books = await getAllBooks();
    return books.find((b) => b.id === id);
  }
  const res = await apiRequest<IBookWork>(`/books/${id}`, { method: 'GET' });
  if (res.success && res.data) {
    return res.data;
  }
  if (res.statusCode !== 401) {
    toast.error(res.message || '作品加载失败，请检查网络后重试');
  }
  return undefined;
}

export async function saveBook(book: IBookWork): Promise<IBookWork | null> {
  book.updatedAt = Date.now();
  book.chapterCount = book.chapters.length;
  book.wordCount = book.chapters.reduce((sum, c) => sum + c.wordCount, 0);

  if (!getAuthToken()) {
    // 游客模式：用本地存储
    const books: IBookWork[] = [];
    try {
      const raw = scopedStorage.getItem(getBooksStorageKey());
      if (raw) books.push(...(JSON.parse(raw) as IBookWork[]));
    } catch { /* ignore */ }
    const idx = books.findIndex((b) => b.id === book.id);
    if (idx >= 0) {
      books[idx] = book;
    } else {
      books.unshift(book);
    }
    scopedStorage.setItem(getBooksStorageKey(), JSON.stringify(books));
    return book;
  }

  // 已登录：调后端 API（PUT 更新）
  const res = await apiRequest<IBookWork>(`/books/${book.id}`, {
    method: 'PUT',
    body: JSON.stringify(book),
  });
  if (res.success && res.data) {
    return res.data;
  }
  return null;
}

export async function deleteBook(id: string): Promise<void> {
  if (!getAuthToken()) {
    const books: IBookWork[] = [];
    try {
      const raw = scopedStorage.getItem(getBooksStorageKey());
      if (raw) books.push(...(JSON.parse(raw) as IBookWork[]));
    } catch { /* ignore */ }
    const filtered = books.filter((b) => b.id !== id);
    scopedStorage.setItem(getBooksStorageKey(), JSON.stringify(filtered));
    const current = scopedStorage.getItem(getCurrentBookKey());
    if (current === id) {
      scopedStorage.removeItem(getCurrentBookKey());
    }
    return;
  }

  await apiRequest(`/books/${id}`, { method: 'DELETE' });
}

export async function createBook(book: Partial<IBookWork> & { title: string }): Promise<IBookWork | null> {
  const newBook: IBookWork = {
    ...createEmptyBook(),
    ...book,
    id: book.id || `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (!getAuthToken()) {
    const books: IBookWork[] = [];
    try {
      const raw = scopedStorage.getItem(getBooksStorageKey());
      if (raw) books.push(...(JSON.parse(raw) as IBookWork[]));
    } catch { /* ignore */ }
    books.unshift(newBook);
    scopedStorage.setItem(getBooksStorageKey(), JSON.stringify(books));
    return newBook;
  }

  const res = await apiRequest<IBookWork>('/books', {
    method: 'POST',
    body: JSON.stringify(newBook),
  });
  if (res.success && res.data) {
    return res.data;
  }
  toast.error(res.message || '创建失败，请重试');
  return null;
}

export function setCurrentBookId(id: string | null): void {
  if (id) {
    scopedStorage.setItem(getCurrentBookKey(), id);
  } else {
    scopedStorage.removeItem(getCurrentBookKey());
  }
}

export function getCurrentBookId(): string | null {
  return scopedStorage.getItem(getCurrentBookKey());
}

export function createEmptyBook(): IBookWork {
  return {
    id: Date.now().toString(),
    title: '',
    author: '墨客',
    genre: '玄幻',
    category: 'male',
    coverImage: '',
    styleDescription: '',
    setting: '',
    characters: [],
    writingStyle: '华丽唯美',
    narrativePerspective: 'third',
    styleGuide: '',
    synopsis: '',
    titleCandidates: [],
    blurb: '',
    outline: '',
    characterProfiles: [],
    volumes: [],
    chapters: [],
    wordCount: 0,
    chapterCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'active',
  };
}

export function createEmptyChapter(title = ''): IChapter {
  return {
    id: Date.now().toString(),
    title: title || '新章节',
    summary: '',
    wordCount: 0,
    content: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'draft',
  };
}

export async function* streamNovelGenerate(
  params: Record<string, unknown>,
  bookContext?: string
): AsyncGenerator<string, void, unknown> {
  const executor = capabilityClient.load(NOVEL_GENERATOR_ID);

  // 必填字段提取 + 非空兜底
  const genre = (params.genre as string) || '玄幻';
  const novelType = (params.novel_type as string) || '长篇';
  const setting = (params.setting as string) || (params.synopsis as string) || '一部小说的故事背景';
  const characters = (params.characters as string) || '主要人物待设定';
  const style = (params.style as string) || '网文叙事风格';

  // 业务侧可能传入的额外字段，统一收敛进 additional_requirements
  const extraPieces: string[] = [];
  if (params.chapter_title) extraPieces.push(`【章节标题】${params.chapter_title}`);
  if (params.chapter_summary) extraPieces.push(`【本章梗概】${params.chapter_summary}`);
  if (params.perspective) extraPieces.push(`【叙事视角】${params.perspective}`);
  if (params.target_word_count) extraPieces.push(`【目标字数】约 ${params.target_word_count} 字`);

  const baseReq = (params.additional_requirements as string) || '请创作一整章完整内容。';
  const userReq = extraPieces.length > 0 ? extraPieces.join('\n') + '\n\n' + baseReq : baseReq;

  const finalReq = bookContext
    ? `【全书设定参考】\n${bookContext}\n\n【本章创作要求】\n${userReq}\n\n重要：请严格按照以上全书设定生成正文，确保人物性格、背景、故事推进方向与全书一致。`
    : userReq;

  const stream = executor.callStream('textGenerate', {
    genre,
    novel_type: novelType,
    setting,
    characters,
    style,
    additional_requirements: finalReq,
  });
  for await (const chunk of stream) {
    const c = chunk as Record<string, unknown>;
    const piece = (c.content as string) ?? (c.response as string) ?? '';
    if (piece) {
      yield piece;
    }
  }
}

export async function generateNovel(
  params: Record<string, unknown>,
  onChunk: (text: string) => void,
  bookContext?: string
): Promise<string> {
  let full = '';
  const targetCount = parseInt(
    (params.target_word_count as string) || (params.wordCount as string) || '3000',
    10
  );
  try {
    // Plus 会员每日字数预检查（Ultra/管理员/游客不限制）
    const token = getAuthToken();
    if (token && targetCount > 0) {
      const quotaRes = await consumeDailyWordQuota(0);
      if (!quotaRes.ok) {
        toast.error(quotaRes.message);
        throw new Error(quotaRes.message);
      }
      if (quotaRes.limit > 0 && quotaRes.used + targetCount > quotaRes.limit) {
        const remaining = Math.max(0, quotaRes.limit - quotaRes.used);
        const msg = `今日剩余可生成 ${remaining} 字，Plus 会员每日最多 10 万字，升级 Ultra 可解锁无上限生成`;
        toast.error(msg);
        throw new Error(msg);
      }
    }

    for await (const piece of streamNovelGenerate(params, bookContext)) {
      full += piece;
      onChunk(piece);
    }

    // 生成完成后按实际字数扣减额度
    if (token && full.length > 0) {
      try {
        const consumeRes = await consumeDailyWordQuota(full.length);
        if (!consumeRes.ok) {
          logger.warn('[novel-generator] 字数统计写入失败:', consumeRes.message);
        }
      } catch (err) {
        logger.warn('[novel-generator] 字数统计写入失败:', String(err));
      }
    }
  } catch (error) {
    if (!(error instanceof Error && error.message.includes('10 万字'))) {
      toast.error('AI 生成失败，请稍后重试');
    }
    throw error;
  }
  return full;
}

export async function* streamNovelContinue(
  context: string,
  direction: string,
  params: Record<string, unknown>,
  bookContext?: string
): AsyncGenerator<string, void, unknown> {
  const executor = capabilityClient.load(NOVEL_GENERATOR_ID);

  // 必填字段提取 + 非空兜底
  const genre = (params.genre as string) || '玄幻';
  const novelType = (params.novel_type as string) || '长篇';
  const setting = (params.setting as string) || (params.synopsis as string) || '一部小说的故事背景';
  const characters = (params.characters as string) || '主要人物待设定';
  const style = (params.style as string) || '网文叙事风格';

  const continueReq = `${bookContext ? `【全书设定参考】\n${bookContext}\n\n` : ''}以下是已有小说内容，请在此基础上继续续写：\n\n${context}\n\n续写方向：${direction || '自然延续故事情节'}\n\n要求：\n1. 续写内容与前文风格一致、情节连贯\n2. 人物性格、行为方式必须符合人物设定\n3. 剧情沿大纲方向推进，避免偏离主线\n4. 直接输出续写的正文内容，不要重复前文\n5. 保持统一的叙事视角和文风`;

  const stream = executor.callStream('textGenerate', {
    genre,
    novel_type: novelType,
    setting,
    characters,
    style,
    additional_requirements: continueReq,
  });
  for await (const chunk of stream) {
    const c = chunk as Record<string, unknown>;
    const piece = (c.content as string) ?? (c.response as string) ?? '';
    if (piece) {
      yield piece;
    }
  }
}

export async function continueNovel(
  context: string,
  direction: string,
  params: Record<string, unknown>,
  onChunk: (text: string) => void,
  bookContext?: string
): Promise<string> {
  let full = '';
  const token = getAuthToken();
  try {
    // Plus 会员每日字数预检查（按 3000 字估算续写量，超限时阻止）
    if (token) {
      const quotaRes = await consumeDailyWordQuota(0);
      if (!quotaRes.ok) {
        toast.error(quotaRes.message);
        throw new Error(quotaRes.message);
      }
      const estimateChars = 3000;
      if (quotaRes.limit > 0 && quotaRes.used + estimateChars > quotaRes.limit) {
        const remaining = Math.max(0, quotaRes.limit - quotaRes.used);
        const msg = `今日剩余可生成 ${remaining} 字，Plus 会员每日最多 10 万字，升级 Ultra 可解锁无上限生成`;
        toast.error(msg);
        throw new Error(msg);
      }
    }

    for await (const piece of streamNovelContinue(context, direction, params, bookContext)) {
      full += piece;
      onChunk(piece);
    }

    // 生成完成后按实际字数扣减额度
    if (token && full.length > 0) {
      try {
        const consumeRes = await consumeDailyWordQuota(full.length);
        if (!consumeRes.ok) {
          logger.warn('[novel-generator] 续写字数统计写入失败:', consumeRes.message);
        }
      } catch (err) {
        logger.warn('[novel-generator] 续写字数统计写入失败:', String(err));
      }
    }
  } catch (error) {
    if (!(error instanceof Error && error.message.includes('10 万字'))) {
      toast.error('续写失败，请检查网络连接');
    }
    throw error;
  }
  return full;
}

// ========== 拆书分析 ==========
export async function* streamBookAnalysis(
  articleContent: string
): AsyncGenerator<string, void, unknown> {
  const executor = capabilityClient.load(BOOK_ANALYSIS_ID);
  const stream = executor.callStream('textGenerate', {
    article_content: articleContent,
  });
  for await (const chunk of stream) {
    const c = chunk as Record<string, unknown>;
    const piece = (c.content as string) ?? (c.response as string) ?? '';
    if (piece) {
      yield piece;
    }
  }
}

export async function analyzeBook(
  articleContent: string,
  onChunk: (text: string) => void
): Promise<string> {
  let full = '';
  try {
    for await (const piece of streamBookAnalysis(articleContent)) {
      full += piece;
      onChunk(piece);
    }
  } catch (error) {
    toast.error('拆书分析失败，请稍后重试');
    throw error;
  }
  return full;
}

// ========== 去 AI 味优化 ==========
export async function* streamHumanizeOptimize(
  text: string,
  customRequirements?: string
): AsyncGenerator<string, void, unknown> {
  // 实测 ai_text_humanize_optimization_1 实例疑似配置异常（调用成功但不返回内容），
  // 改用以验证流式输出正常的 ai_novel_generate_1 实例承载去 AI 味能力。
  const executor = capabilityClient.load(NOVEL_GENERATOR_ID);
  logger.info('[Humanize] start call via novel-generator, textLen=', text.length, 'hasCustomReq=', !!customRequirements);

  const requirement = customRequirements || '让文本更自然、更像真人写作，减少 AI 模板化痕迹，增加自然的语气和表达变化。';
  const instruction = `你是一位资深文字编辑，擅长把 AI 生成的文本改写成更自然、更像真人写作的风格。

【待优化文本】
${text}

【优化要求】
${requirement}

请直接输出优化后的完整文本，不要解释，不要加标题，保持原文的段落结构和核心含义。`;

  const stream = executor.callStream('textGenerate', {
    // 5 个必填字段（走插件 schema 校验），给合理兜底值保证校验通过
    genre: '现代文学',
    novel_type: '短篇',
    setting: '一段需要润色改写的文本',
    characters: '无特定人物',
    style: '自然流畅的编辑润色风格',
    // 完整业务指令放在 additional_requirements，模型实际按此执行
    additional_requirements: instruction,
  });
  let chunkIndex = 0;
  for await (const chunk of stream) {
    chunkIndex += 1;
    const c = chunk as Record<string, unknown>;
    // 兼容多种可能的字段名，优先 content
    const piece =
      (c.content as string) ??
      (c.response as string) ??
      (c.text as string) ??
      (c.delta as string) ??
      (c.result as string) ??
      '';
    if (chunkIndex <= 3) {
      logger.info(
        '[Humanize] chunk',
        chunkIndex,
        'keys=',
        Object.keys(c).join(','),
        'len=',
        piece.length
      );
    }
    if (piece) {
      yield piece;
    }
  }
  logger.info('[Humanize] stream ended, total chunks=', chunkIndex);
}

export async function humanizeText(
  text: string,
  customRequirements: string | undefined,
  onChunk: (text: string) => void
): Promise<string> {
  let full = '';
  try {
    for await (const piece of streamHumanizeOptimize(text, customRequirements)) {
      full += piece;
      onChunk(piece);
    }
  } catch (error) {
    toast.error('优化失败，请稍后重试');
    throw error;
  }
  return full;
}

// ========== AI 书名建议 ==========
export async function* streamTitleSuggestions(
  theme: string,
  style: string,
  setting: string
): AsyncGenerator<string, void, unknown> {
  const executor = capabilityClient.load(TITLE_SUGGESTION_ID);
  const stream = executor.callStream('textGenerate', {
    novel_theme: theme,
    novel_style: style,
    novel_setting: setting,
  });
  for await (const chunk of stream) {
    const c = chunk as Record<string, unknown>;
    const piece = (c.content as string) ?? (c.response as string) ?? '';
    if (piece) {
      yield piece;
    }
  }
}

export async function suggestTitles(
  theme: string,
  style: string,
  setting: string,
  onChunk: (text: string) => void
): Promise<string> {
  let full = '';
  try {
    for await (const piece of streamTitleSuggestions(theme, style, setting)) {
      full += piece;
      onChunk(piece);
    }
  } catch (error) {
    toast.error('书名建议生成失败');
    throw error;
  }
  return full;
}

// ========== AI 封面生成 ==========
export async function generateCover(
  title: string,
  genre: string,
  style: string,
  keyElements: string
): Promise<string[]> {
  try {
    const executor = capabilityClient.load(COVER_GENERATE_ID);
    const result = await executor.call('textToImage', {
      novel_title: title,
      novel_genre: genre,
      cover_style: style,
      key_elements: keyElements,
      aspect_ratio: '3:4',
    });
    return (result as any).images || [];
  } catch (error) {
    toast.error('封面生成失败，请稍后重试');
    throw error;
  }
}

// ========== 创作风格指南生成 ==========
export async function generateStyleGuide(
  genre: string,
  category: string,
  stylePrompt: string,
  onChunk: (text: string) => void
): Promise<string> {
  let full = '';
  try {
    const executor = capabilityClient.load(NOVEL_GENERATOR_ID);
    const stream = executor.callStream('textGenerate', {
      genre,
      novel_type: '风格指南',
      setting: `${category} · ${stylePrompt}`,
      characters: '无',
      style: stylePrompt || '网文风格',
      additional_requirements: `请根据以下信息生成一份详细的小说创作风格指南，包含：叙事基调、语言风格、节奏把控、场景描写特点、人物刻画方式、情绪营造等维度。输出为结构化的风格指南文本。

【题材】${genre}
【分类】${category}
【风格提示】${stylePrompt}`,
    });
    for await (const chunk of stream) {
      const c = chunk as Record<string, unknown>;
      const piece = (c.content as string) ?? '';
      if (piece) {
        full += piece;
        onChunk(piece);
      }
    }
  } catch (error) {
    toast.error('创作风格指南生成失败');
    throw error;
  }
  return full;
}

// ========== 故事梗概生成 ==========
export async function generateSynopsis(
  params: {
    genre: string;
    title?: string;
    author?: string;
    category?: string;
    creativeIdeas?: string;
    referenceDocs?: string;
    existingSynopsis?: string;
    styleGuide?: string;
  },
  onChunk: (text: string) => void
): Promise<string> {
  let full = '';
  try {
    const executor = capabilityClient.load(NOVEL_GENERATOR_ID);
    const stream = executor.callStream('textGenerate', {
      genre: params.genre,
      novel_type: '故事梗概',
      setting: params.creativeIdeas || params.title || '无具体设定',
      characters: params.existingSynopsis || '待定',
      style: params.styleGuide || (params.category === 'female' ? '女频言情风' : '男频热血风'),
      additional_requirements: `请根据以下信息，生成一份完整的小说故事梗概，包含：核心设定、主要人物、故事主线、关键冲突、转折点、结局走向等要素。要求结构清晰、情节有张力、人物鲜明。

⚠️ 重要要求（务必严格遵守）：
1. 故事风格必须与【风格提示】保持高度一致，世界观设定、人物命名、情节元素都要贴合风格定位，不得偏离到其他题材套路。
2. 人名、地名、势力名等要符合作品的题材与风格（如都市题材不要出现修仙界人名地名）。
3. 核心冲突与主线剧情应扎根于【题材】与【风格提示】的设定范围之内。

【题材】${params.genre}
【书名】${params.title || '未命名'}
【分类】${params.category || ''}
${params.styleGuide ? `【风格提示】${params.styleGuide}\n` : ''}【创意补充】${params.creativeIdeas || '无'}
【参考资料】${params.referenceDocs || '无'}
${params.existingSynopsis ? `【已有梗概】${params.existingSynopsis}（请在已有基础上优化或重写）` : ''}`,
    });
    for await (const chunk of stream) {
      const c = chunk as Record<string, unknown>;
      const piece = (c.content as string) ?? '';
      if (piece) {
        full += piece;
        onChunk(piece);
      }
    }
  } catch (error) {
    toast.error('故事梗概生成失败');
    throw error;
  }
  return full;
}

// ========== 书名候选生成 ==========
export async function generateTitles(
  genre: string,
  synopsis: string,
  styleGuide: string,
  onChunk: (text: string) => void
): Promise<string[]> {
  let full = '';
  try {
    const executor = capabilityClient.load(TITLE_SUGGESTION_ID);
    const stream = executor.callStream('textGenerate', {
      novel_theme: genre,
      novel_setting: synopsis || '核心设定待补充',
      novel_style: styleGuide || '网文风格',
    });
    for await (const chunk of stream) {
      const c = chunk as Record<string, unknown>;
      const piece = (c.content as string) ?? '';
      if (piece) {
        full += piece;
        onChunk(piece);
      }
    }
  } catch (error) {
    toast.error('书名生成失败');
    throw error;
  }
  // 解析书名列表
  const lines = full.split('\n').filter((l) => l.trim());
  const titles = lines
    .map((l) => l.replace(/^\d+\.\s*/, '').replace(/^[一二三四五六七八九十]+、\s*/, '').trim())
    .filter((t) => t.length > 0 && t.length < 50);
  return titles.slice(0, 10);
}

// ========== 内容简介生成 ==========
export async function generateBlurb(
  genre: string,
  title: string,
  synopsis: string,
  onChunk: (text: string) => void,
  options?: { wordCount?: string; focus?: string; extra?: string; styleGuide?: string }
): Promise<string> {
  const wordCount = options?.wordCount || '300';
  const focus = options?.focus || 'plot';
  const extra = options?.extra || '';
  const styleGuide = options?.styleGuide || '';

  // 卖点侧重的中文描述（支持多选，逗号分隔）
  const focusLabels: Record<string, string> = {
    plot: '剧情冲突——突出悬念、转折与戏剧张力',
    character: '人物魅力——突出主角性格、成长弧光与独特性',
    world: '世界观设定——突出独特的背景设定与世界规则',
    emotion: '情感共鸣——突出情感关系、内心挣扎与共情点',
  };
  const focusDesc = focus
    .split(',')
    .map((f) => focusLabels[f.trim()])
    .filter(Boolean)
    .join('、');

  let full = '';
  try {
    const executor = capabilityClient.load(NOVEL_GENERATOR_ID);
    const stream = executor.callStream('textGenerate', {
      genre,
      novel_type: '内容简介文案',
      setting: synopsis,
      characters: title,
      style: '网文营销简介风格',
       additional_requirements: `【任务】请为这部小说撰写一段书籍内容简介（推荐文案），用于书籍详情页和推荐位展示，吸引读者点击阅读。

【严格要求——请务必遵守】
1. 你输出的是「内容简介/推荐文案」，不是小说正文、不是章节开篇、不是具体情节展开、不是叙事段落。
2. 简介是站在第三方视角的营销性文案，用一句话或一段话概括全书核心卖点，吸引读者。
3. 严禁以「第X章」「第一章」等章节形式开头；严禁使用小说叙事体（如具体场景描写、人物对话、动作描写）。
4. 字数控制在约 ${wordCount} 字左右，语言精炼，节奏感强。
5. 卖点侧重：${focusDesc || '剧情冲突'}。简介必须突出以上卖点。
6. 结构建议：开头抛出核心冲突/悬念 → 点出主角处境与困境 → 结尾留钩子或疑问，激发读者好奇心。
7. 文案风格必须与【风格提示】保持一致，人名、设定、用词都要贴合原作风格定位。
8. 直接输出简介文本，不要加标题、不要加「简介：」「内容简介：」等前缀、不要加任何解释性文字。
${extra ? `\n【额外要求】${extra}\n` : ''}
【题材】${genre}
【书名】${title}
【故事梗概】${synopsis}
${styleGuide ? `【风格提示】${styleGuide}` : ''}`,
    });
    for await (const chunk of stream) {
      const c = chunk as Record<string, unknown>;
      const piece = (c.content as string) ?? '';
      if (piece) {
        full += piece;
        onChunk(piece);
      }
    }
  } catch (error) {
    toast.error('内容简介生成失败');
    throw error;
  }
  return full;
}

// ========== 详细大纲生成 ==========
export interface IOutlineVolume {
  title: string;
  summary: string;
  chapters: Array<{ title: string; summary: string }>;
}

export async function generateOutline(
  genre: string,
  title: string,
  synopsis: string,
  styleGuide: string,
  onChunk: (text: string) => void,
  options?: {
    volumeCount?: number;
    chaptersPerVolume?: number;
    plotDirection?: string;
  }
): Promise<string> {
  let full = '';
  const volCount = options?.volumeCount ?? 3;
  const chPerVol = options?.chaptersPerVolume ?? 10;
  const plotDir = options?.plotDirection?.trim();

  try {
    const executor = capabilityClient.load(NOVEL_GENERATOR_ID);
    const stream = executor.callStream('textGenerate', {
      genre,
      novel_type: '详细大纲',
      setting: synopsis,
      characters: title,
      style: styleGuide || '结构化大纲',
      additional_requirements:
        '【任务：小说详细大纲规划】\n\n' +
        '请严格按照以下要求为这部小说规划详细大纲。\n\n' +
        '⚠️ 重要禁令：\n' +
        '- 绝对禁止输出任何小说正文内容\n' +
        '- 绝对禁止输出任何对话、场景描写、叙事性段落\n' +
        '- 绝对禁止展开章节正文、引子、楔子、序章等写作内容\n' +
        '- 你是在做大纲级别的卷/章结构规划，不是在写小说\n' +
        '- 只输出结构化的卷/章标题和一句话剧情要点，不要任何叙事性文字\n\n' +
        '【输出格式要求 — 严格遵守】\n\n' +
        '每卷按以下格式输出，卷与卷之间用一行 --- 分隔：\n\n' +
        '第X卷：卷名\n' +
        '【卷主题】：用一句话概括本卷核心剧情走向和主要冲突\n' +
        '【章节列表】：\n' +
        '1. 第一章标题 — 一句话剧情要点（15-30字，说明本章核心事件）\n' +
        '2. 第二章标题 — 一句话剧情要点\n' +
        '...（继续列出所有章节）\n\n' +
        '【详细要求】\n' +
         `1. 严格输出 ${volCount} 卷，不多不少\n` +
         `2. 每卷章节数在 ${chPerVol} 章左右（±2 章以内），根据卷的内容量合理分配\n` +
         '3. 每章标题简洁有力（4-12字），符合网文命名习惯\n' +
         '4. 每章配一句话剧情要点（15-30字），说明本章核心事件，不要展开\n' +
         '5. 卷名要有吸引力，符合网文调性，能体现本卷核心冲突或转折\n' +
         '6. 卷之间情节递进清晰：起 → 承 → 转 → 合（4卷以上再加高潮/结局）\n' +
         '7. 整体节奏张弛有度，高潮卷可适当多设章节\n' +
         '8. 直接输出卷/章结构内容，不要开场白、不要结束语、不要解释\n' +
         '9. 严禁出现任何小说正文、对话、场景描写等叙事性文字\n' +
         '10. ⚠️ 卷名、章节名、剧情要点必须严格贴合【创作风格】，人物命名、场景设定、情节元素不得偏离风格定位（如都市风格不得出现修仙界地名/功法名）\n\n' +
        '【小说信息】\n' +
        `【题材】${genre}\n` +
        `【书名】${title}\n` +
        `【故事梗概】${synopsis}\n` +
        (plotDir ? `【剧情大概走向】${plotDir}\n` : '') +
        (styleGuide ? `【创作风格】${styleGuide}\n` : ''),
    });
    for await (const chunk of stream) {
      const c = chunk as Record<string, unknown>;
      const piece = (c.content as string) ?? '';
      if (piece) {
        full += piece;
        onChunk(piece);
      }
    }
  } catch (error) {
    toast.error('详细大纲生成失败');
    throw error;
  }
  return full;
}

// ========== 解析大纲文本为结构化卷/章 ==========
export function parseOutlineText(text: string): IOutlineVolume[] {
  const volumes: IOutlineVolume[] = [];
  if (!text.trim()) return volumes;

  // 去掉 markdown 代码块标记
  const cleanText = text.replace(/```[\w]*\n?/g, '').trim();

  // 按 --- 或 「第X卷」 分割卷块
  let rawBlocks = cleanText
    .split(/\n---+\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  if (rawBlocks.length < 2) {
    const splitByVolume = cleanText.split(/(?=第[\d一二三四五六七八九十百]+卷[：:·])/);
    rawBlocks = splitByVolume.map((b) => b.trim()).filter((b) => b.length > 0);
  }

  for (let idx = 0; idx < rawBlocks.length; idx++) {
    const block = rawBlocks[idx];
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // 提取卷名
    let volTitle = `第${idx + 1}卷`;
    const firstLine = lines[0];
    const volTitleMatch = firstLine.match(/第[\d一二三四五六七八九十百]+卷[：:·\s]+(.+)/);
    if (volTitleMatch) {
      volTitle = `第${idx + 1}卷·${volTitleMatch[1].trim()}`;
    } else if (/^第[\d一二三四五六七八九十百]+卷/.test(firstLine)) {
      volTitle = firstLine.replace(/[：:·]+$/, '');
    } else {
      volTitle = `第${idx + 1}卷·${firstLine.slice(0, 20)}`;
    }

    // 提取卷主题
    let volSummary = '';
    const themeMatch =
      block.match(/【卷主题】[：:]\s*(.+)/) ||
      block.match(/【卷简介】[：:]\s*(.+)/) ||
      block.match(/简介[：:]\s*(.+)/) ||
      block.match(/核心剧情[：:]\s*(.+)/);
    if (themeMatch) {
      volSummary = themeMatch[1].trim();
    } else {
      const nonChapterLine = lines.find(
        (l, i) =>
          i > 0 &&
          !/^[\d]+[.、．]/.test(l) &&
          !/【?章节/.test(l) &&
          !/章节数/.test(l) &&
          !/第[\d]+卷/.test(l)
      );
      volSummary = nonChapterLine || '';
    }

    // 提取章节列表：匹配「数字. 标题 — 要点」或「数字、标题 — 要点」格式
    const chapterRegex = /^(\d+)[.、．]\s*(.+?)\s*[—–\-：:]\s*(.+)$/;
    const chapters: Array<{ title: string; summary: string }> = [];

    for (const line of lines) {
      const m = line.match(chapterRegex);
      if (m) {
        const title = m[2].trim();
        const summary = m[3].trim();
        if (title && summary) {
          chapters.push({ title, summary });
        }
      } else if (/^\d+[.、．]\s*[^（(]/.test(line) && line.length < 40) {
        // 只有标题没有要点，也收录
        const title = line.replace(/^\d+[.、．]\s*/, '').trim();
        if (title) {
          chapters.push({ title, summary: '' });
        }
      }
    }

    // 如果没匹配到「数字. 标题 — 要点」格式，尝试「第X章 标题」+ 下一行梗概
    if (chapters.length === 0) {
      const chapterLines = lines.filter((l) => /^第[\d一二三四五六七八九十百]+章/.test(l));
      for (let i = 0; i < chapterLines.length; i++) {
        const chLine = chapterLines[i];
        const chTitleMatch = chLine.match(/^第[\d一二三四五六七八九十百]+章[：:、\s]*(.+)/);
        const chTitle = chTitleMatch?.[1]?.trim() || chLine.trim();
        // 找下一行的梗概
        const lineIdx = lines.indexOf(chLine);
        let chSummary = '';
        if (lineIdx >= 0 && lineIdx + 1 < lines.length) {
          const nextLine = lines[lineIdx + 1];
          if (!/^第[\d一二三四五六七八九十百]+章/.test(nextLine)) {
            const summaryMatch = nextLine.match(/梗概[：:]\s*(.+)/);
            chSummary = summaryMatch?.[1]?.trim() || nextLine.slice(0, 60);
          }
        }
        chapters.push({ title: chTitle, summary: chSummary });
      }
    }

    // 验证：必须有章节列表内容
    const hasChapterList =
      chapters.length > 0 || lines.some((l) => /^\d+[.、．]/.test(l)) || /章节列表|章节数/.test(block);
    if (!hasChapterList && idx === 0) continue;

    if (chapters.length >= 2 || volSummary.length >= 2) {
      volumes.push({
        title: volTitle,
        summary: volSummary,
        chapters,
      });
    }
  }

  return volumes;
}

// ========== 人物小传生成 ==========
export async function generateCharacterProfiles(
  genre: string,
  title: string,
  synopsis: string,
  existingChars: string,
  onChunk: (text: string) => void,
  styleGuide?: string
): Promise<ICharacterProfile[]> {
  let full = '';
  try {
    const executor = capabilityClient.load(NOVEL_GENERATOR_ID);
    const stream = executor.callStream('textGenerate', {
      genre,
      novel_type: '人物小传',
      setting: synopsis,
      characters: existingChars || '无',
      style: styleGuide || '人物设定文',
      additional_requirements: `【任务：人物小传生成】

请为这部小说设计 4-6 个主要人物的完整小传。每个人物必须包含以下字段：
1. 姓名
2. 身份/背景（职业、社会地位、来历等）
3. 性格（3-5个关键词 + 一句话描述）
4. 外貌特征
5. 背景故事（成长经历、关键事件）
6. 人物关系（与其他主要人物的关系）
7. 人物弧光（性格/认知/能力在故事中的转变轨迹）

【输出格式 — 严格遵守】
每个人物以「【人物X：姓名】」开头（X 为数字序号，姓名为该人物全名），下一行起用「字段名：内容」的格式逐字段列出，字段名必须包含：姓名、身份、性格、外貌、背景故事、人物关系、人物弧光。人物之间用空行分隔。

⚠️ 极其重要的硬性约束：
1. 人物姓名、身份、职业、背景必须严格贴合【故事梗概】和【详细大纲】的时代与题材设定，人物命名方式、身份职业、社会背景要与时代一致，不得出现与设定时代/题材不符的元素。
2. 人物设定必须与【风格提示】保持高度一致，整体气质、语言风格、人物关系模式要符合风格要求。
3. 严禁输出任何小说正文、章节内容、对话或场景描写，只输出人物设定的结构化信息。
4. 角色之间要有清晰的关系网和戏剧张力，主角、配角、反派分工明确。
5. 不要输出任何前言、说明、解释性文字，直接从第一个人物开始输出。

【题材】${genre}
【书名】${title}
【故事梗概】${synopsis}
${styleGuide ? `【风格提示】${styleGuide}\n` : ''}${existingChars ? `【详细大纲】${existingChars}\n` : ''}`,
    });
    for await (const chunk of stream) {
      const c = chunk as Record<string, unknown>;
      const piece = (c.content as string) ?? '';
      if (piece) {
        full += piece;
        onChunk(piece);
      }
    }
  } catch (error) {
    toast.error('人物小传生成失败');
    throw error;
  }
  // 解析人物列表
  const blocks = full.split(/【人物[^】]+】/).filter((b) => b.trim());
  const profiles: ICharacterProfile[] = blocks.map((block, idx) => {
    const extractField = (text: string, field: string): string => {
      // 支持全角冒号和半角冒号，兼容空格，取冒号后到下一个字段名或段尾的内容
      const regex = new RegExp(
        `${field}s*[：:]s*([\\s\\S]*?)(?=\\n(?:姓名|身份|性格|外貌|背景故事|人物关系|人物弧光|成长弧光|关键特质)s*[：:]|$)`,
        'i'
      );
      const match = text.match(regex);
      return match?.[1]?.trim() || '';
    };

    const name = extractField(block, '姓名') || block.match(/【人物\d+[：:]\s*([^】]+)】/)?.[1]?.trim() || `人物${idx + 1}`;
    const identity = extractField(block, '身份');
    const personality = extractField(block, '性格');
    const background = extractField(block, '背景故事');
    const appearance = extractField(block, '外貌');
    const relationships = extractField(block, '人物关系');
    const characterArc = extractField(block, '人物弧光') || extractField(block, '成长弧光');

    // keyTraits：从性格中提取关键词（逗号/顿号/空格分隔的短词）
    const traitCandidates = personality
      ? personality.split(/[，、,\s]+/).filter((t) => t.length >= 2 && t.length <= 6)
      : [];
    const keyTraits = traitCandidates.slice(0, 5).join('、');

    // description：背景故事前几行作为简介
    const description = background
      ? background.split('\n').slice(0, 3).join('\n')
      : block.split('\n').slice(0, 5).join('\n');

    // 性别推断（从身份/姓名/背景中简单判断）
    let gender: 'male' | 'female' | 'other' = 'other';
    const allText = `${name} ${identity} ${background}`;
    if (/先生|男主|他|男|少爷|公子/.test(allText)) gender = 'male';
    else if (/女士|女主|她|女|小姐|夫人|公主/.test(allText)) gender = 'female';

    return {
      id: `char_${idx}_${Date.now()}`,
      name,
      identity: identity || '角色',
      gender,
      personality,
      background,
      appearance,
      description,
      relationships,
      characterArc,
      keyTraits,
      extraFields: [],
    };
  });

  // 有效性校验：至少有 2 个人物，且第一个人物的姓名不是默认占位
  const isValid = profiles.length >= 2 && !/^人物\d+$/.test(profiles[0].name);
  if (!isValid) {
    // 解析失败：返回空数组，由调用方决定是否保留原数据
    return [];
  }
  return profiles;
}

// ========== 章节规划生成 ==========
export async function generateChapterPlan(
  volumeTitle: string,
  outline: string,
  synopsis: string,
  chapterCount: number,
  onChunk: (text: string) => void
): Promise<Array<{ title: string; summary: string }>> {
  let full = '';
  try {
    const executor = capabilityClient.load(NOVEL_GENERATOR_ID);
    const stream = executor.callStream('textGenerate', {
      genre: '综合',
      novel_type: '章节规划',
      setting: synopsis,
      characters: volumeTitle,
      style: '结构化列表',
      additional_requirements: '【任务：章节标题规划】\n\n请为该卷规划 ' + chapterCount + ' 个章节。\n\n⚠️ 重要禁令：\n- 绝对禁止写出任何小说正文、对话、场景描写\n- 只需要章节标题 + 一句话梗概，不要展开叙事内容\n- 你是在做大纲规划，不是在写小说\n\n【输出格式 — 严格遵守】\n每章以「第X章 章节标题」开头，下一行写「梗概：一句话说明本章核心事件」。章节之间空一行分隔。直接输出列表，不要多余解释。\n\n【卷名】' + volumeTitle + '\n【全书梗概】' + synopsis + '\n【详细大纲】' + outline,
    });
    for await (const chunk of stream) {
      const c = chunk as Record<string, unknown>;
      const piece = (c.content as string) ?? '';
      if (piece) {
        full += piece;
        onChunk(piece);
      }
    }
  } catch (error) {
    toast.error('章节规划生成失败');
    throw error;
  }
  // 解析章节列表
  const chapterBlocks = full.split(/第[\d一二三四五六七八九十百]+章/).filter((b) => b.trim());
  const chapters = chapterBlocks.map((block, idx) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const title = lines[0]?.replace(/^[：:、s]+/, '') || `第${idx + 1}章`;
    const summaryMatch = block.match(/梗概[：:]s*([\s\S]*?)(?=\n第|$)/);
    return {
      title,
      summary: summaryMatch?.[1]?.trim() || lines.slice(1).join(' ').slice(0, 200),
    };
  });
  return chapters;
}

// ========== 卷划分生成 ==========
export async function generateVolumePlan(
  params: {
    genre: string;
    title: string;
    synopsis: string;
    outline?: string;
    styleGuide?: string;
    volumeCount?: number;
    chaptersPerVolume?: number;
    customRequirements?: string;
    characters?: string;
  },
  onChunk: (text: string) => void
): Promise<Array<{ title: string; summary: string; chapterCount: number }>> {
  let full = '';
  const volCount = params.volumeCount || 3;
  const chPerVol = params.chaptersPerVolume || 10;
  try {
    const executor = capabilityClient.load(NOVEL_GENERATOR_ID);
    const stream = executor.callStream('textGenerate', {
      genre: params.genre || '玄幻',
      novel_type: '长篇',
      setting: params.synopsis || params.outline || params.title || '一部小说的故事',
      characters: params.characters || '主要人物待设定',
      style: params.styleGuide || '网文叙事风格',
      additional_requirements: '【任务：小说卷结构规划】\n\n请严格按照以下要求为这部小说规划 ' + volCount + ' 卷的整体结构。\n\n⚠️ 重要禁令：\n- 绝对禁止展开任何章节正文内容\n- 绝对禁止输出开篇段落、引子、楔子、序章等正文写作内容\n- 你是在做大纲级别的卷与章的标题规划，不是在写小说\n- 只输出结构化的卷/章标题和一句话梗概，不要任何叙事性文字\n\n【小说信息】\n书名：' + (params.title || '未命名') + '\n题材：' + params.genre + '\n故事梗概：' + params.synopsis + (params.outline ? '\n详细大纲：' + params.outline : '') + '\n\n【输出格式要求 — 严格遵守】\n\n每卷按以下格式输出，卷与卷之间用一行 --- 分隔：\n\n第X卷：卷名\n【卷主题】：用一句话概括本卷核心剧情走向\n【章节数量】：N章\n【章节列表】：\n1. 第一章标题 — 一句话梗概\n2. 第二章标题 — 一句话梗概\n3. 第三章标题 — 一句话梗概\n...（继续列出所有章节）\n\n【详细要求】\n1. 严格输出 ' + volCount + ' 卷，不多不少\n2. 每卷严格输出 ' + chPerVol + ' 章，不多不少（用户指定了每卷章节数）\n3. 每章标题简洁有力（4-12字），符合网文命名习惯\n4. 每章配一句话梗概（15-30字），说明本章核心事件，不要展开正文\n5. 卷名要有吸引力，符合网文调性，能体现本卷核心冲突或转折\n6. 卷之间情节递进清晰：起 → 承 → 转 → 合（4卷以上再加高潮/结局）\n7. 整体节奏张弛有度，高潮卷可适当多设章节（但总章数不超过指定数量的 ±1 章）\n8. 直接输出卷结构内容，不要开场白、不要结束语、不要解释\n9. 严禁出现任何小说正文、对话、场景描写等叙事性文字' + (params.customRequirements ? '\n\n【额外要求】\n' + params.customRequirements : ''),
    });
    for await (const chunk of stream) {
      const c = chunk as Record<string, unknown>;
      const piece = (c.content as string) ?? (c.response as string) ?? '';
      if (piece) {
        full += piece;
        onChunk(piece);
      }
    }
  } catch (error) {
    toast.error('卷划分生成失败');
    throw error;
  }
  // 解析卷列表 — 严格从结构化输出中提取
  const volumes: Array<{ title: string; summary: string; chapterCount: number }> = [];

  // 先去掉 markdown 代码块标记
  const cleanText = full.replace(/```[\w]*\n?/g, '').trim();

  // 用 "---" 或 "第X卷" 分割卷块
  const rawBlocks = cleanText
    .split(/\n---+\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  let blocks: string[] = [];
  if (rawBlocks.length >= 2) {
    blocks = rawBlocks;
  } else {
    // 回退：按「第X卷」分割
    const splitByVolume = cleanText.split(/(?=第[\d一二三四五六七八九十百]+卷[：:·])/);
    blocks = splitByVolume.map((b) => b.trim()).filter((b) => b.length > 0);
  }

  for (let idx = 0; idx < blocks.length; idx++) {
    const block = blocks[idx];
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // 提取卷名：第一行或「第X卷：卷名」格式
    let volTitle = `第${idx + 1}卷`;
    const firstLine = lines[0];
    const volTitleMatch = firstLine.match(/第[\d一二三四五六七八九十百]+卷[：:·\s]+(.+)/);
    if (volTitleMatch) {
      volTitle = `第${idx + 1}卷·${volTitleMatch[1].trim()}`;
    } else if (/^第[\d一二三四五六七八九十百]+卷/.test(firstLine)) {
      volTitle = firstLine.replace(/[：:·]+$/, '');
      if (volTitle === firstLine && !volTitle.includes('·')) {
        volTitle = `第${idx + 1}卷`;
      }
    } else {
      volTitle = `第${idx + 1}卷·${firstLine.slice(0, 20)}`;
    }

    // 提取卷主题/简介
    let volSummary = '';
    const themeMatch = block.match(/【?卷主题】?[：:]\s*(.+)/) || block.match(/【?卷简介】?[：:]\s*(.+)/) || block.match(/简介[：:]\s*(.+)/);
    if (themeMatch) {
      volSummary = themeMatch[1].trim();
    } else {
      // 回退：取第二行（非章节列表行）
      const nonChapterLine = lines.find((l, i) => i > 0 && !/^[\d]+[.、．]/.test(l) && !/【?章节/.test(l) && !/章节数/.test(l));
      volSummary = nonChapterLine || '';
    }

    // 提取章节数
    let chapterCount = 10;
    const countMatch = block.match(/【?章节数(?:量)?】?[：:]\s*(\d+)/) || block.match(/共\s*(\d+)\s*章/);
    if (countMatch) {
      chapterCount = parseInt(countMatch[1], 10);
    } else {
      // 数章节列表行数
      const chapterLines = lines.filter((l) => /^\d+[.、．]/.test(l));
      if (chapterLines.length > 0) chapterCount = chapterLines.length;
    }

    // 验证：必须有章节列表相关内容（证明是卷结构不是正文）
    const hasChapterList = lines.some((l) => /^\d+[.、．]/.test(l)) || /章节列表|章节数/.test(block);
    if (!hasChapterList && idx === 0) {
      // 第一块如果是开场白，跳过
      continue;
    }

    if (chapterCount > 0 && volSummary.length >= 2) {
      volumes.push({
        title: volTitle,
        summary: volSummary,
        chapterCount: Math.min(Math.max(chapterCount, 5), 30),
      });
    }
  }

  // 如果卷数不够，用数字补齐
  while (volumes.length < volCount) {
    const idx = volumes.length;
    volumes.push({
      title: `第${idx + 1}卷`,
      summary: '',
      chapterCount: 10,
    });
  }

  // 只取指定卷数
  return volumes.slice(0, volCount);
}

// ========== 上传内容解析与续写 ==========
const BOOK_ANALYSIS_UPLOAD_ID = 'book_analysis_disassemble_1';

export interface IParsedUploadResult {
  title: string;
  genre: string;
  styleAnalysis: string;
  synopsis: string;
  characterSummary: string;
  chapters: Array<{ title: string; content: string; summary?: string }>;
  writingStyle: string;
  continueSuggestions: string;
}

export async function parseUploadedContent(
  rawText: string,
  onChunk?: (text: string) => void
): Promise<IParsedUploadResult> {
  let full = '';
  const preview = rawText.slice(0, 5000);
  try {
    const executor = capabilityClient.load(BOOK_ANALYSIS_UPLOAD_ID);
    const stream = executor.callStream('textGenerate', {
      article_content: rawText.slice(0, 15000),
      task: `请对以下小说内容进行全面分析，并按指定格式输出分析结果。

【分析要求】
1. 推断作品名称（如果文本中有书名，优先使用；没有则根据内容拟一个合适的书名）
2. 推断题材类型（如玄幻、都市、仙侠、言情等）
3. 文风分析（叙事基调、语言风格、节奏特点，约 200 字）
4. 故事梗概（核心设定、主要人物、故事主线，约 300 字）
5. 主要人物梳理（列出 3-5 位主要人物的姓名、身份、性格特点）
6. 识别章节列表（按章节标题拆分，列出每章标题和内容摘要）
7. 续写建议（基于现有内容，提出 3-5 条后续情节发展方向建议）

【输出格式】
请严格按以下格式输出：
===书名===
<书名>

===题材===
<题材类型>

===文风分析===
<文风分析内容>

===故事梗概===
<故事梗概内容>

===主要人物===
<人物列表，每人一行：姓名 - 身份 - 性格>

===章节列表===
第1章 <章节标题>
摘要：<章节内容摘要>
---
第2章 <章节标题>
摘要：<章节内容摘要>

===续写建议===
<续写建议内容>

【原始文本片段】
${preview}`,
    });
    for await (const chunk of stream) {
      const c = chunk as Record<string, unknown>;
      const piece = (c.content as string) ?? '';
      if (piece) {
        full += piece;
        onChunk?.(piece);
      }
    }
  } catch (error) {
    logger.error('上传解析失败:', String(error));
    toast.error('内容解析失败，请稍后重试');
    throw error;
  }

  // 解析结构化输出
  const extract = (tag: string): string => {
    const regex = new RegExp(`===${tag}===\s*\n([\\s\\S]*?)(?=\n===|$)`);
    const match = full.match(regex);
    return match?.[1]?.trim() || '';
  };

  const title = extract('书名') || '未命名作品';
  const genre = extract('题材') || '都市';
  const styleAnalysis = extract('文风分析') || '';
  const synopsis = extract('故事梗概') || '';
  const characterSummary = extract('主要人物') || '';
  const continueSuggestions = extract('续写建议') || '';
  const chaptersText = extract('章节列表');

  // 解析章节列表
  const chapterBlocks = chaptersText
    .split(/---/)
    .map((b) => b.trim())
    .filter(Boolean);

  let parsedChapters: Array<{ title: string; content: string; summary?: string }> = [];
  if (chapterBlocks.length > 1) {
    parsedChapters = chapterBlocks.map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      const titleLine = lines[0] || '';
      const summaryMatch = block.match(/摘要[：:]\s*([\s\S]*)$/);
      return {
        title: titleLine.replace(/^第[\d一二三四五六七八九十百]+章\s*/, ''),
        content: '',
        summary: summaryMatch?.[1]?.trim(),
      };
    }).filter((c) => c.title);
  }

  // 如果 AI 解析的章节太少，尝试用正则从原文中拆分章节
  if (parsedChapters.length < 2) {
    const chapterRegex = /第[\d一二三四五六七八九十百]+章[\s、·.．\u3000].*?(?=\n第[\d一二三四五六七八九十百]+章[\s、·.．\u3000]|$)/g;
    const matches = rawText.match(chapterRegex);
    if (matches && matches.length > 0) {
      parsedChapters = matches.slice(0, 20).map((m, idx) => {
        const firstLineMatch = m.match(/^(第[\d一二三四五六七八九十百]+章[^\n]*)/);
        const title = firstLineMatch?.[1]?.trim() || `第${idx + 1}章`;
        const content = m.replace(/^第[\d一二三四五六七八九十百]+章[^\n]*\n?/, '').trim();
        return {
          title,
          content: content.slice(0, 5000),
          summary: content.slice(0, 100),
        };
      });
    }
  }

  // 如果还是没有章节，把全文作为第一章
  if (parsedChapters.length === 0) {
    parsedChapters = [{
      title: '第一章',
      content: rawText.slice(0, 10000),
      summary: rawText.slice(0, 100),
    }];
  }

  return {
    title,
    genre,
    styleAnalysis,
    synopsis,
    characterSummary,
    chapters: parsedChapters,
    writingStyle: styleAnalysis.slice(0, 50),
    continueSuggestions,
  };
}

// ========== 剧本生成 ==========
export async function generateScript(
  params: {
    genre: string;
    title: string;
    chapterTitle?: string;
    chapterContent: string;
    styleGuide?: string;
    customRequirements?: string;
  },
  onChunk: (text: string) => void,
  bookContext?: string
): Promise<string> {
  let full = '';
  try {
    const executor = capabilityClient.load(NOVEL_GENERATOR_ID);
    const conversionReq = `请将以下小说章节内容转换为专业的剧本格式。

【小说章节内容】
${params.chapterContent}

【转换要求】
1. 输出标准剧本格式，包含：场景标题（内景/外景+地点+时间）、场景描述、角色名、对白、动作指示（括号标注）
2. 保留原著的核心情节、人物性格和对话风格
3. 场景描述要简洁明了，适合影视化呈现
4. 对白要口语化、自然流畅，符合人物身份
5. 动作指示用括号括起，放在角色名下方或对白中间
6. 每个场景以「第X场」或「场景X」开头
7. 直接输出剧本正文，不要多余解释
${params.customRequirements ? `\n【额外要求】\n${params.customRequirements}` : ''}`;
    const finalReq = bookContext
      ? `【全书设定参考】\n${bookContext}\n\n${conversionReq}\n\n重要：转换剧本时请严格参考全书人物设定与故事背景，确保角色行为与性格一致。`
      : conversionReq;
    const stream = executor.callStream('textGenerate', {
      genre: params.genre,
      novel_type: '剧本转换',
      setting: params.title,
      characters: params.chapterTitle || '',
      style: params.styleGuide || '',
      additional_requirements: finalReq,
    });
    for await (const chunk of stream) {
      const c = chunk as Record<string, unknown>;
      const piece = (c.content as string) ?? (c.response as string) ?? '';
      if (piece) {
        full += piece;
        onChunk(piece);
      }
    }
  } catch (error) {
    toast.error('剧本生成失败');
    throw error;
  }
  return full;
}
