import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { DatabaseNotConfiguredError, isDbConfigured, pingDatabase, bootstrapInitialAdmin } from './db/index.js';
import authRouter from './routes/auth.js';
import booksRouter from './routes/books.js';
import adminRouter from './routes/admin.js';
import announcementRouter from './routes/announcement.js';
import redemptionRouter from './routes/redemption.js';
import dataRouter from './routes/data.js';
import quotaRouter from './routes/quota.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

// 中间件
const frontendOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: frontendOrigins.length > 0 ? frontendOrigins : true,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API 路由
app.use('/api/auth', authRouter);
app.use('/api/books', booksRouter);
app.use('/api/admin', adminRouter);
app.use('/api/announcement', announcementRouter);
app.use('/api/redemption', redemptionRouter);
app.use('/api/data', dataRouter);
app.use('/api/quota', quotaRouter);

// 健康检查
app.get('/api/health', async (_req, res) => {
  const dbConnected = await pingDatabase();
  res.json({
    status: 'ok',
    db: dbConnected ? 'connected' : isDbConfigured() ? 'connecting' : 'not_configured',
    time: Date.now(),
  });
});

// 统一错误处理
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (err instanceof DatabaseNotConfiguredError) {
      res.status(503).json({
        success: false,
        message:
          '数据库未配置：请在服务端环境变量里设置 DATABASE_URL（Supabase 连接串）后重启服务',
      });
      return;
    }
    console.error('[server] 请求处理错误:', err);
    res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' });
  }
);

// 静态文件：前端构建产物（standalone 构建输出到 dist/client）
const clientDistCandidates = [
  path.resolve(__dirname, '../client'),
  path.resolve(__dirname, '../../dist/client'),
  path.resolve(__dirname, '../../dist/output'),
  path.resolve(__dirname, '../../dist'),
];
const distPath = clientDistCandidates.find((p) => fs.existsSync(path.join(p, 'index.html')));

if (distPath) {
  app.use(express.static(distPath));

  // SPA 路由回退
  app.use((req, res, next) => {
    if (req.method !== 'GET') {
      next();
      return;
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// 启动
app.listen(PORT, () => {
  console.log(`[server] 后端服务启动，端口 ${PORT}`);
  console.log(`[server] API 前缀: /api`);
  console.log(
    isDbConfigured()
      ? '[server] 已检测到 DATABASE_URL，数据将读写云端 Supabase PostgreSQL'
      : '[server] 警告：未检测到 DATABASE_URL，所有 API 将返回 503，请先配置环境变量'
  );
  if (distPath) {
    console.log(`[server] 前端静态文件: ${distPath}`);
  }
});

// 服务启动时初始化管理员账号（幂等）
bootstrapInitialAdmin().catch((err) => {
  console.error('[server] 管理员初始化异常:', err instanceof Error ? err.message : err);
});

export default app;

