#!/usr/bin/env node
/**
 * 独立部署构建脚本（跨平台，不依赖 bash / rsync）：
 * 1. 构建前端 → dist/client
 * 2. 编译后端 → dist/server
 * 产物可直接由 `node dist/server/index.js` 启动（Render 等平台用）
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

// 与平台构建脚本保持一致的环境变量（独立部署时给安全默认值）
process.env.CLIENT_BASE_PATH = process.env.MIAODA_APP_ID ? `/app/${process.env.MIAODA_APP_ID}` : '';
process.env.ASSETS_CDN_PATH = process.env.MIAODA_RESOURCE_CDN_PREFIX || '/';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const isWin = process.platform === 'win32';
const run = (cmd) => {
  console.log(`[build] ${cmd}`);
  execSync(cmd, { stdio: 'inherit', shell: isWin ? 'cmd.exe' : '/bin/sh' });
};

run('npx vite build --outDir dist/client --emptyOutDir');
run('npx tsc -p server/tsconfig.json');

// 构建后：vite 插件会注入妙搭平台 HTML 模板（含 mustache 占位符）。
// 独立部署时这些占位符不会被替换，其中 __BASENAME__="{{basename}}" 会导致
// BrowserRouter 的 basename 非法、整页空白。这里统一替换为独立部署安全值。
const indexPath = path.join(root, 'dist', 'client', 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  // 1) 路由 basename：置空（bundle 内会 fallback 到 "/"）
  html = html.replace('window.__BASENAME__ = "{{basename}}";', 'window.__BASENAME__ = "";');
  // 2) 应用名 / 描述
  html = html.split('{{appName}}').join('靓文写作');
  html = html.split('{{appDescription}}').join('靓文写作 · AI 智能创作平台');
  // 3) 三花括号占位符（appAvatar）先清空
  html = html.split('{{{appAvatar}}}').join('');
  // 4) 其余所有双花括号占位符（appId/userId/csrfToken/environment 等）清空
  html = html.replace(/\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}/g, '');
  // 5) favicon 占位清空后补回静态图标
  html = html.replace('<link rel="icon" href="">', '<link rel="icon" href="/favicon.svg">');
  fs.writeFileSync(indexPath, html);
  console.log('[build] 已清理 index.html 平台占位符（独立部署）');
}

console.log('[build] 独立部署构建完成：dist/client（前端） + dist/server（后端）');

