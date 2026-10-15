/**
 * 作品数据类型（后端用，避免 import 前端类型）
 * 保持与 src/data/novel.ts 中的 IBookWork 字段对齐
 */

export interface ICharacterExtraField {
  id: string;
  label: string;
  value: string;
}

export interface ICharacterProfile {
  id: string;
  name: string;
  identity: string;
  gender: string;
  personality: string;
  background: string;
  relationship: string;
  relationships?: string;
  characterArc: string;
  keyTraits: string;
  extraFields: ICharacterExtraField[];
}

export interface IVolume {
  id: string;
  title: string;
  summary: string;
  chapterCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface IChapter {
  id: string;
  title: string;
  summary: string;
  wordCount: number;
  content: string;
  volumeId?: string;
  status: 'draft' | 'completed';
  createdAt: number;
  updatedAt: number;
}

export interface IBookWork {
  id: string;
  title: string;
  author?: string;
  genre: string;
  category?: 'male' | 'female';
  categoryGroup: 'male' | 'female';
  coverImage?: string;
  setting: string;
  characters: Array<Record<string, unknown>>;
  writingStyle: string;
  narrativePerspective: 'first' | 'third';
  styleDescription: string;
  styleGuide?: string;
  synopsis?: string;
  blurb?: string;
  blurbWordCount?: string;
  blurbFocus?: string;
  titleCandidates: string[];
  outline?: string;
  characterProfiles: ICharacterProfile[];
  volumes: IVolume[];
  chapters: IChapter[];
  scriptContent?: string;
  wordCount: number;
  chapterCount: number;
  status: 'active' | 'archived';
  createdAt: number;
  updatedAt: number;
}
