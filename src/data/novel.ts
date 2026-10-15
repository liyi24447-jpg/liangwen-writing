// EXPORTS: INovelWork, ICharacter, ICreationParams, IBookWork, IChapter, IVolume, ICharacterProfile, ICharacterExtraField, IRankBook, IRankPlatform, GENRE_OPTIONS, TYPE_OPTIONS, STYLE_OPTIONS, PERSPECTIVE_OPTIONS, WORD_COUNT_OPTIONS, INSPIRATION_TAGS, HOT_RANK_PLATFORMS, MOCK_RANK_DATA, CATEGORY_GROUPS

export interface ICharacter {
  id: string;
  name: string;
  identity?: string;
  personality?: string;
  description?: string;
}

export type NovelType = 'short' | 'mini' | 'story' | 'emotion';
export type NarrativePerspective = 'first' | 'third';

export interface ICreationParams {
  genre: string;
  novelType: NovelType;
  setting: string;
  characters: ICharacter[];
  writingStyle: string;
  narrativePerspective: NarrativePerspective;
  extraRequirements?: string;
  /** 章节设置 */
  chapter?: string;
  /** 章节梗概 */
  chapterSummary?: string;
  /** 目标创作字数 */
  wordCount?: string;
}

export interface INovelWork {
  id: string;
  title: string;
  params: ICreationParams;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export const GENRE_OPTIONS = [
  { value: '玄幻', label: '玄幻奇幻' },
  { value: '仙侠', label: '仙侠修真' },
  { value: '都市', label: '都市言情' },
  { value: '悬疑', label: '悬疑推理' },
  { value: '科幻', label: '科幻未来' },
  { value: '历史', label: '历史架空' },
  { value: '武侠', label: '武侠江湖' },
  { value: '灵异', label: '灵异惊悚' },
];

export const TYPE_OPTIONS = [
  { value: 'short', label: '短篇小说' },
  { value: 'mini', label: '微小说' },
  { value: 'story', label: '短篇故事' },
  { value: 'emotion', label: '情感短文' },
];

export const STYLE_OPTIONS = [
  { value: '华丽唯美', label: '华丽唯美' },
  { value: '朴实自然', label: '朴实自然' },
  { value: '轻松幽默', label: '轻松幽默' },
  { value: '严肃深沉', label: '严肃深沉' },
  { value: '热血爽文', label: '热血爽文' },
  { value: '浪漫唯美', label: '浪漫唯美' },
];

export const PERSPECTIVE_OPTIONS = [
  { value: 'first', label: '第一人称' },
  { value: 'third', label: '第三人称' },
];

export interface IChapter {
  id: string;
  title: string;
  summary?: string;
  wordCount: number;
  content: string;
  createdAt: number;
  updatedAt: number;
  status: 'draft' | 'completed';
  volumeId?: string;
}

export interface IVolume {
  id: string;
  title: string;
  summary?: string;
  chapterCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ICharacterExtraField {
  key: string;
  label: string;
  value: string;
}

export interface ICharacterProfile {
  id: string;
  name: string;
  identity?: string;
  gender?: 'male' | 'female' | 'other';
  personality?: string;
  background?: string;
  appearance?: string;
  description?: string;
  avatar?: string;
  /** 与其他人物的关系 */
  relationships?: string;
  /** 人物成长弧光 */
  characterArc?: string;
  /** 关键经历与性格关键词，正文生成时作为上下文 */
  keyTraits?: string;
  /** 自定义扩展字段 */
  extraFields?: ICharacterExtraField[];
}

export interface IBookWork {
  id: string;
  title: string;
  author: string;
  genre: string;
  category: 'male' | 'female';
  coverImage?: string;
  styleDescription: string;
  setting: string;
  characters: ICharacter[];
  writingStyle: string;
  narrativePerspective: NarrativePerspective;
  /** 创作风格指南（AI 生成） */
  styleGuide?: string;
  /** 故事梗概（AI 生成） */
  synopsis?: string;
  /** 书名候选列表（AI 生成） */
  titleCandidates?: string[];
  /** 内容简介（AI 生成） */
  blurb?: string;
  /** 简介生成参数：目标字数 */
  blurbWordCount?: string;
  /** 简介生成参数：卖点侧重（plot/character/world/emotion，可多选逗号分隔） */
  blurbFocus?: string;
  /** 详细大纲（AI 生成） */
  outline?: string;
  /** 人物小传列表 */
  characterProfiles: ICharacterProfile[];
  /** 卷列表 */
  volumes: IVolume[];
  chapters: IChapter[];
  /** 剧本内容（AI 生成） */
  scriptContent?: string;
  wordCount: number;
  chapterCount: number;
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'archived';
}

export const CATEGORY_GROUPS = {
  male: {
    label: '男频',
    desc: '热血升级 · 玄幻仙侠',
    genres: ['玄幻', '仙侠', '都市', '科幻', '历史', '武侠', '游戏', '悬疑'],
  },
  female: {
    label: '女频',
    desc: '情感细腻 · 言情古风',
    genres: ['言情', '古风', '现言', '仙侠', '悬疑', '玄幻', '科幻', '历史'],
  },
} as const;

export const WORD_COUNT_OPTIONS = [
  { value: '1000字左右', label: '约 1000 字' },
  { value: '2000字左右', label: '约 2000 字' },
  { value: '3000字左右', label: '约 3000 字' },
  { value: '5000字左右', label: '约 5000 字' },
  { value: '8000字左右', label: '约 8000 字' },
  { value: '10000字以上', label: '1 万字以上' },
];

export const INSPIRATION_TAGS = [
  { genre: '玄幻', title: '异世大陆', desc: '穿越到魔法与斗气交织的异世界' },
  { genre: '仙侠', title: '仙路漫漫', desc: '凡胎肉体踏上长生问道之路' },
  { genre: '都市', title: '都市重生', desc: '回到过去改写人生轨迹' },
  { genre: '悬疑', title: '迷雾重重', desc: '一桩离奇案件背后的真相' },
  { genre: '科幻', title: '星际征程', desc: '人类文明迈向浩瀚宇宙' },
  { genre: '历史', title: '大争之世', desc: '群雄逐鹿问鼎天下' },
];

export const HOT_RANK_PLATFORMS: IRankPlatform[] = [
  { id: 'qidian', name: '起点读书', icon: '🚀', searchUrl: 'https://www.qidian.com/search?kw=' },
  { id: 'jinjiang', name: '晋江文学', icon: '🌸', searchUrl: 'https://www.jjwxc.net/search.php?kw=' },
  { id: 'fanqie', name: '番茄小说', icon: '🍅', searchUrl: 'https://fanqienovel.com/search?keyword=' },
  { id: 'zongheng', name: '纵横中文网', icon: '⚔️', searchUrl: 'https://search.zongheng.com/search?q=' },
  { id: 'feilu', name: '飞卢小说', icon: '📚', searchUrl: 'https://b.faloo.com/search/?keywords=' },
  { id: 'yuewen', name: '阅文集团', icon: '👑', searchUrl: 'https://www.qidian.com/search?kw=' },
];

export interface IRankPlatform {
  id: string;
  name: string;
  icon: string;
  searchUrl: string;
}

export interface IRankBook {
  rank: number;
  title: string;
  author: string;
  genre: string;
  status: string;
  description: string;
  hot: string;
}

export const MOCK_RANK_DATA: Record<string, IRankBook[]> = {
  qidian: [
    { rank: 1, title: '深空彼岸', author: '辰东', genre: '都市异能', status: '连载中', description: '都市异能与深空探索的交织，主角在平凡生活中揭开宇宙的终极秘密。', hot: '980万' },
    { rank: 2, title: '凡人修仙传之仙界篇', author: '忘语', genre: '仙侠', status: '完结', description: '仙界风云再起，凡人修行之路永无止境。', hot: '860万' },
    { rank: 3, title: '斗破苍穹', author: '天蚕土豆', genre: '玄幻', status: '完结', description: '三十年河东三十年河西，莫欺少年穷。', hot: '750万' },
    { rank: 4, title: '诡秘之主', author: '爱潜水的乌贼', genre: '玄幻', status: '完结', description: '蒸汽与机械的浪潮中，谁能窥见序列之上的奥秘。', hot: '680万' },
    { rank: 5, title: '牧神记', author: '宅猪', genre: '玄幻', status: '完结', description: '道在人间，道在凡尘，道在众生。', hot: '590万' },
    { rank: 6, title: '圣墟', author: '辰东', genre: '玄幻', status: '完结', description: '天地异变，灵气复苏，少年踏上修行路。', hot: '520万' },
    { rank: 7, title: '遮天', author: '辰东', genre: '玄幻', status: '完结', description: '冰冷与黑暗并存的宇宙深处，九具龙尸拉着一座铜棺。', hot: '480万' },
    { rank: 8, title: '完美世界', author: '辰东', genre: '玄幻', status: '完结', description: '一粒尘可填海，一根草斩尽日月星辰。', hot: '420万' },
    { rank: 9, title: '庆余年', author: '猫腻', genre: '历史', status: '完结', description: '积善之家，必有余庆。', hot: '390万' },
    { rank: 10, title: '将夜', author: '猫腻', genre: '玄幻', status: '完结', description: '与天斗，其乐无穷。', hot: '350万' },
  ],
  jinjiang: [
    { rank: 1, title: '某某', author: '木苏里', genre: '现代言情', status: '完结', description: '青春校园，少年心事。', hot: '720万' },
    { rank: 2, title: '全球高考', author: '木苏里', genre: '现代言情', status: '完结', description: '无限流，考试与生存的终极博弈。', hot: '650万' },
    { rank: 3, title: '伪装学渣', author: '木瓜黄', genre: '现代言情', status: '完结', description: '两个学霸装学渣的校园趣事。', hot: '580万' },
    { rank: 4, title: '默读', author: 'Priest', genre: '悬疑推理', status: '完结', description: '真实案件背后的人性深渊。', hot: '510万' },
    { rank: 5, title: '山河表里', author: 'Priest', genre: '玄幻', status: '完结', description: '山河之间，表里如一。', hot: '470万' },
    { rank: 6, title: '杀破狼', author: 'Priest', genre: '历史', status: '完结', description: '乱世中的家国情怀与儿女情长。', hot: '420万' },
    { rank: 7, title: '破云', author: '淮上', genre: '悬疑推理', status: '完结', description: '缉毒战线的生死较量。', hot: '380万' },
    { rank: 8, title: '提灯映桃花', author: '淮上', genre: '玄幻', status: '完结', description: '神魔之间的千年纠葛。', hot: '340万' },
    { rank: 9, title: 'AWM绝地求生', author: '漫漫何其多', genre: '电竞', status: '完结', description: '电竞少年的热血与荣耀。', hot: '310万' },
    { rank: 10, title: '二哈和他的白猫师尊', author: '肉包不吃肉', genre: '仙侠', status: '完结', description: '师徒之间，爱恨交织。', hot: '280万' },
  ],
  fanqie: [
    { rank: 1, title: '我有一座恐怖屋', author: '我会修空调', genre: '灵异', status: '完结', description: '继承一座恐怖屋，从此踏上不归路。', hot: '1200万' },
    { rank: 2, title: '校花的贴身高手', author: '鱼人二代', genre: '都市异能', status: '连载中', description: '特种兵王化身校园护花使者。', hot: '1050万' },
    { rank: 3, title: '我的治愈系游戏', author: '我会修空调', genre: '悬疑', status: '连载中', description: '一款治愈游戏背后的恐怖真相。', hot: '920万' },
    { rank: 4, title: '超级上门女婿', author: '一起成功', genre: '都市', status: '连载中', description: '上门女婿逆袭之路。', hot: '850万' },
    { rank: 5, title: '最强狂兵', author: '烈焰滔滔', genre: '都市异能', status: '连载中', description: '最强兵王回归都市。', hot: '760万' },
    { rank: 6, title: '女总裁的王牌高手', author: '三羊猪猪', genre: '都市', status: '连载中', description: '王牌高手与女总裁的故事。', hot: '680万' },
    { rank: 7, title: '我的体内有只鬼', author: '风凌天下', genre: '玄幻', status: '连载中', description: '体内封印着一只远古凶鬼。', hot: '610万' },
    { rank: 8, title: '都市至尊神医', author: '青狐妖', genre: '都市异能', status: '连载中', description: '神医下山，都市纵横。', hot: '540万' },
    { rank: 9, title: '废柴逆天', author: '夜南听风', genre: '玄幻', status: '连载中', description: '废柴少年逆天改命。', hot: '480万' },
    { rank: 10, title: '重生之都市修仙', author: '十里剑神', genre: '都市仙侠', status: '连载中', description: '重生归来，都市修仙。', hot: '420万' },
  ],
  zongheng: [
    { rank: 1, title: '雪中悍刀行', author: '烽火戏诸侯', genre: '武侠', status: '完结', description: '江湖是什么？江湖是酒，是剑，是美人。', hot: '860万' },
    { rank: 2, title: '剑来', author: '烽火戏诸侯', genre: '仙侠', status: '连载中', description: '剑修之道，在于心，在于道，在于人。', hot: '780万' },
    { rank: 3, title: '大道朝天', author: '猫腻', genre: '仙侠', status: '完结', description: '大道之巅，谁与争锋。', hot: '650万' },
    { rank: 4, title: '永夜君王', author: '烟雨江南', genre: '玄幻', status: '完结', description: '永夜降临，人族何去何从。', hot: '580万' },
    { rank: 5, title: '罪恶之城', author: '烟雨江南', genre: '玄幻', status: '完结', description: '罪恶与救赎的永恒主题。', hot: '510万' },
    { rank: 6, title: '龙骑战机', author: '华表', genre: '科幻', status: '完结', description: '空天战场，龙骑士的荣耀。', hot: '450万' },
    { rank: 7, title: '修真世界', author: '方想', genre: '仙侠', status: '完结', description: '小人物的修真大世界。', hot: '400万' },
    { rank: 8, title: '不败战神', author: '方想', genre: '玄幻', status: '完结', description: '战神之路，永不言败。', hot: '360万' },
    { rank: 9, title: '卡徒', author: '方想', genre: '科幻', status: '完结', description: '卡牌世界的无限可能。', hot: '320万' },
    { rank: 10, title: '兽血沸腾', author: '静官', genre: '玄幻', status: '完结', description: '异界大陆的热血传说。', hot: '290万' },
  ],
  feilu: [
    { rank: 1, title: '开局签到荒古圣体', author: '问道青衣', genre: '玄幻', status: '连载中', description: '开局即巅峰，签到就送神级体质。', hot: '1500万' },
    { rank: 2, title: '我师兄实在太稳健了', author: '言归正传', genre: '仙侠', status: '连载中', description: '稳健是我，苟是艺术。', hot: '1320万' },
    { rank: 3, title: '西游：俺老孙绝不取经', author: '花果山', genre: '玄幻', status: '连载中', description: '齐天大圣的另一种可能。', hot: '1180万' },
    { rank: 4, title: '大秦：我，最后一个人皇', author: '秦皇', genre: '历史', status: '连载中', description: '穿越大秦，成为最后一位人皇。', hot: '1050万' },
    { rank: 5, title: '火影：这个忍者不对劲', author: '木叶下忍', genre: '同人', status: '连载中', description: '火影世界的异常忍者。', hot: '920万' },
    { rank: 6, title: '精灵：开局一颗蛋', author: '训练家', genre: '同人', status: '连载中', description: '宝可梦世界的冒险之旅。', hot: '850万' },
    { rank: 7, title: '漫威：我有一个聊天群', author: '钢铁侠', genre: '同人', status: '连载中', description: '聊天群连接诸天万界。', hot: '760万' },
    { rank: 8, title: '三国：开局娶了蔡文姬', author: '曹阿瞒', genre: '历史', status: '连载中', description: '三国乱世，英雄辈出。', hot: '680万' },
    { rank: 9, title: '原神：我在提瓦特当魔神', author: '旅行者', genre: '同人', status: '连载中', description: '提瓦特大陆的魔神传说。', hot: '610万' },
    { rank: 10, title: '斗罗：我，比比东的弟子', author: '武魂殿', genre: '同人', status: '连载中', description: '武魂殿的天才弟子之路。', hot: '540万' },
  ],
  yuewen: [
    { rank: 1, title: '万相之王', author: '天蚕土豆', genre: '玄幻', status: '连载中', description: '相术世界，相师为王。少年自废相宫而起，踏上万相之王之路。', hot: '1850万' },
    { rank: 2, title: '大奉打更人', author: '卖报小郎君', genre: '仙侠', status: '完结', description: '大奉王朝，打更人执剑护苍生。', hot: '1620万' },
    { rank: 3, title: '赘婿', author: '愤怒的香蕉', genre: '历史', status: '连载中', description: '小小赘婿，搅动天下风云。', hot: '1450万' },
    { rank: 4, title: '夜的命名术', author: '会说话的肘子', genre: '都市异能', status: '连载中', description: '夜幕降临，规则由我书写。', hot: '1280万' },
    { rank: 5, title: '大王饶命', author: '会说话的肘子', genre: '都市异能', status: '完结', description: '毒舌少年的都市异能路。', hot: '1150万' },
    { rank: 6, title: '全职法师', author: '乱', genre: '玄幻', status: '完结', description: '全职法师的崛起之路。', hot: '980万' },
    { rank: 7, title: '武动乾坤', author: '天蚕土豆', genre: '玄幻', status: '完结', description: '林动的武动乾坤之路。', hot: '890万' },
    { rank: 8, title: '大主宰', author: '天蚕土豆', genre: '玄幻', status: '完结', description: '大千世界，万道争锋，吾为大主宰。', hot: '820万' },
    { rank: 9, title: '元尊', author: '天蚕土豆', genre: '玄幻', status: '完结', description: '源之气，尊之路。', hot: '750万' },
    { rank: 10, title: '一念永恒', author: '耳根', genre: '仙侠', status: '完结', description: '一念成沧海，一念化桑田。', hot: '680万' },
  ],
};
