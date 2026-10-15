// ---- plugin:ai_novel_generate_1 ----
// ============================================================
// 插件 ai_novel_generate_1 (AI小说生成) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface AiNovelGenerateOneInput {
  /** 小说题材（如：玄幻、都市、仙侠、悬疑等） */
  genre: string;
  /** 小说类型（如：长篇、短篇、中篇、连载等） */
  novel_type: string;
  /** 小说世界观设定、背景介绍 */
  setting: string;
  /** 主要人物设定，包括姓名、身份、性格特点等 */
  characters: string;
  /** 小说写作风格（如：轻松幽默、严肃深沉、浪漫唯美、热血爽文等） */
  style: string;
  /** 其他补充要求（可选） */
  additional_requirements?: string;
}

/**
 * capabilityClient.load('ai_novel_generate_1').callStream<AiNovelGenerateOneOutput>('textGenerate', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 AiNovelGenerateOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"content":"示例文本","response":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.content ?? ''; }
 */
export interface AiNovelGenerateOneOutput {
  /** [object Object] */
  content: string;
  /** [object Object] */
  response?: string;
}
// ---- end:ai_novel_generate_1 ----

// ---- plugin:ai_text_humanize_optimization_1 ----
// ============================================================
// 插件 ai_text_humanize_optimization_1 (AI文本去AI味优化) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface AiTextHumanizeOptimizationOneInput {
  /** 待优化的AI生成文本内容 */
  ai_generated_text: string;
  /** 额外的个性化优化要求（可选） */
  custom_requirements?: string;
}

/**
 * capabilityClient.load('ai_text_humanize_optimization_1').callStream<AiTextHumanizeOptimizationOneOutput>('textGenerate', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 AiTextHumanizeOptimizationOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"content":"示例文本","response":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.content ?? ''; }
 */
export interface AiTextHumanizeOptimizationOneOutput {
  /** [object Object] */
  content: string;
  /** [object Object] */
  response?: string;
}
// ---- end:ai_text_humanize_optimization_1 ----

// ---- plugin:book_analysis_disassemble_1 ----
// ============================================================
// 插件 book_analysis_disassemble_1 (拆书分析插件) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface BookAnalysisDisassembleOneInput {
  /** 待拆解分析的文章完整内容 */
  article_content: string;
}

/**
 * capabilityClient.load('book_analysis_disassemble_1').callStream<BookAnalysisDisassembleOneOutput>('textGenerate', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 BookAnalysisDisassembleOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"response":"示例文本","content":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.response ?? ''; }
 */
export interface BookAnalysisDisassembleOneOutput {
  /** [object Object] */
  response?: string;
  /** [object Object] */
  content: string;
}
// ---- end:book_analysis_disassemble_1 ----

// ---- plugin:ai_novel_cover_generate_1 ----
// ============================================================
// 插件 ai_novel_cover_generate_1 (AI小说封面生成) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface AiNovelCoverGenerateOneInput {
  /** 图片比例，支持的值：1:1、4:3、3:4、16:9、9:16、3:2、2:3 */
  aspect_ratio?: string;
  /** 小说名称 */
  novel_title: string;
  /** 小说题材，如玄幻、都市、言情、科幻、悬疑等 */
  novel_genre: string;
  /** 封面风格，如古风、现代、动漫、写实、暗黑、唯美等 */
  cover_style: string;
  /** 封面核心元素，如人物形象、场景、标志性物品等 */
  key_elements?: string;
}

/**
 * capabilityClient.load('ai_novel_cover_generate_1').call<AiNovelCoverGenerateOneOutput>('textToImage', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { images } = result;
 * 返回值形如：
 *   {"images":["示例文本"]}
 */
export interface AiNovelCoverGenerateOneOutput {
  /** [object Object] */
  images: string[];
}
// ---- end:ai_novel_cover_generate_1 ----

// ---- plugin:ai_book_title_suggestion_1 ----
// ============================================================
// 插件 ai_book_title_suggestion_1 (AI书名建议生成) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface AiBookTitleSuggestionOneInput {
  /** 小说题材描述（如：都市悬疑、古代仙侠、科幻末世等） */
  novel_theme: string;
  /** 小说风格描述（如：轻松搞笑、暗黑压抑、温情治愈等） */
  novel_style?: string;
  /** 小说核心设定描述（如：主角穿越到游戏世界成为NPC、现代都市里隐藏着修仙门派等） */
  novel_setting: string;
}

/**
 * capabilityClient.load('ai_book_title_suggestion_1').callStream<AiBookTitleSuggestionOneOutput>('textGenerate', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 AiBookTitleSuggestionOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"content":"示例文本","response":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.content ?? ''; }
 */
export interface AiBookTitleSuggestionOneOutput {
  /** [object Object] */
  content: string;
  /** [object Object] */
  response?: string;
}
// ---- end:ai_book_title_suggestion_1 ----