// EXPORTS: STAGES, WorkStageKey, WorkPhaseKey
import {
  Sparkles,
  BookOpen,
  Type,
  FileText,
  ListOrdered,
  Users,
  Layers,
  BookMarked,
  PenTool,
  ScrollText,
} from 'lucide-react';

export type WorkStageKey =
  | 'overview'
  | 'style'
  | 'synopsis'
  | 'titles'
  | 'blurb'
  | 'outline'
  | 'characters'
  | 'volumes'
  | 'chapters'
  | 'body'
  | 'script';

export type WorkPhaseKey = 'ideation' | 'structure' | 'writing';

export interface WorkStageDef {
  key: WorkStageKey;
  label: string;
  icon: typeof Sparkles;
  phase: WorkPhaseKey;
  index: number;
  totalInPhase: number;
}

export const STAGES: WorkStageDef[] = [
  // 立意阶段（内容阶段）
  { key: 'style', label: '创作风格', icon: Sparkles, phase: 'ideation', index: 1, totalInPhase: 4 },
  { key: 'synopsis', label: '故事梗概', icon: BookOpen, phase: 'ideation', index: 2, totalInPhase: 4 },
  { key: 'titles', label: '书名生成', icon: Type, phase: 'ideation', index: 3, totalInPhase: 4 },
  { key: 'blurb', label: '内容简介', icon: FileText, phase: 'ideation', index: 4, totalInPhase: 4 },
  // 结构阶段
  { key: 'outline', label: '详细大纲', icon: ListOrdered, phase: 'structure', index: 1, totalInPhase: 4 },
  { key: 'characters', label: '人物小传', icon: Users, phase: 'structure', index: 2, totalInPhase: 4 },
  { key: 'volumes', label: '卷管理', icon: Layers, phase: 'structure', index: 3, totalInPhase: 4 },
  { key: 'chapters', label: '章节管理', icon: BookMarked, phase: 'structure', index: 4, totalInPhase: 4 },
  // 成文阶段
  { key: 'body', label: '正文生成', icon: PenTool, phase: 'writing', index: 1, totalInPhase: 2 },
  { key: 'script', label: '剧本生成', icon: ScrollText, phase: 'writing', index: 2, totalInPhase: 2 },
];

export const PHASE_LABELS: Record<WorkPhaseKey, string> = {
  ideation: '立意',
  structure: '结构',
  writing: '成文',
};

export function getPhaseStages(phase: WorkPhaseKey): WorkStageDef[] {
  return STAGES.filter((s) => s.phase === phase);
}

// 根据作品状态计算已完成阶段
export function computeCompletedStages(book: {
  styleGuide?: string;
  synopsis?: string;
  titleCandidates?: string[];
  blurb?: string;
  outline?: string;
  characterProfiles?: { id: string }[];
  volumes?: { id: string }[];
  chapters?: { id: string; content?: string }[];
}): Set<WorkStageKey> {
  const completed = new Set<WorkStageKey>();
  if (book.styleGuide?.trim()) completed.add('style');
  if (book.synopsis?.trim()) completed.add('synopsis');
  if ((book.titleCandidates?.length ?? 0) > 0) completed.add('titles');
  if (book.blurb?.trim()) completed.add('blurb');
  if (book.outline?.trim()) completed.add('outline');
  if ((book.characterProfiles?.length ?? 0) > 0) completed.add('characters');
  if ((book.volumes?.length ?? 0) > 0) completed.add('volumes');
  if ((book.chapters?.length ?? 0) > 0) completed.add('chapters');
  if ((book.chapters ?? []).some((c) => (c.content?.length ?? 0) > 0)) completed.add('body');
  return completed;
}
