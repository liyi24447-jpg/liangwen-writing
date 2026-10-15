#!/usr/bin/env node
/**
 * 独立部署构建脚本（跨平台，不依赖 bash / rsync）：
 * 1. 构建前端 → dist/client
 * 2. 编译后端 → dist/server
 * 产物可直接由 `node dist/server/index.js` 启动（Render 等平台用）
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
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

console.log('[build] 独立部署构建完成：dist/client（前端） + dist/server（后端）');

