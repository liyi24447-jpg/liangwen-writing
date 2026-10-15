# 云端部署说明（Supabase + Render）

本项目的正式数据源是 **云端 Supabase PostgreSQL**，账号系统使用 **Supabase Auth**。
后端（Express）只通过服务端密钥访问数据库；前端只访问同源的 `/api`，不接触任何密钥。

## 环境变量（全部只在后端/服务端配置）

| 变量 | 必填 | 从哪里获取 | 说明 |
|---|---|---|---|
| `SUPABASE_URL` | 是 | Supabase → Project Settings → API → Project URL | 形如 `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | 是 | 同上 → anon public | 仅后端调用登录接口用，不发给浏览器 |
| `SUPABASE_SERVICE_ROLE_KEY` | 是 | 同上 → service_role secret | 服务端专用，绝不可泄露 |
| `SUPABASE_JWT_SECRET` | 是 | 同上 → JWT Settings → JWT Secret | 验证登录令牌签名 |
| `DATABASE_URL` | 是 | Supabase → Project Settings → Database → Connection string → **Transaction pooler**（端口 6543） | 服务端直连云数据库 |
| `PORT` | 否 | 平台自动注入（本地默认 3001） | 服务端口 |
| `FRONTEND_ORIGIN` | 否 | 你的前端域名 | 前后端分域部署时配置跨域 |
| `INITIAL_ADMIN_ACCOUNT` | 否 | 自定义 | 该账号注册时若系统尚无管理员，自动成为管理员 |

前端不需要任何环境变量。本地开发请复制 `.env.example` 为 `.env` 填写。

## 数据库初始化

1. 打开 Supabase 控制台 → 左侧 **SQL Editor** → **New query**。
2. 把 `supabase/migrations/20261014000000_cloud_init.sql` 的**全部内容**粘贴进去 → 点 **Run**。
3. （可选）把某账号设为管理员：`update public.users set is_admin = true where account = 'admin';`

## 本地运行

```bash
npm install
npm run build:standalone   # 构建前端 dist/client + 编译后端 dist/server
npm start                  # 启动服务（读取 .env）
```

前端开发热更新：`npm run dev`（Vite 会把 `/api` 代理到本机 3001 端口）。

## 部署到 Render

1. 把项目推送到 GitHub 仓库。
2. Render（render.com）→ **New** → **Web Service** → 连接仓库。
3. Build Command：`npm install --no-audit --no-fund && npm run build:standalone`
4. Start Command：`npm start`
5. 在 **Environment** 里填上面表格的变量。
6. 部署完成后用返回的 `https://xxx.onrender.com` 访问，后端与前端同源。

注意：免费 Render 服务空闲会休眠，首次访问可能要等几十秒；数据库在 Supabase，数据不会丢。

## 旧本地数据迁移

新版不再使用本地 SQLite。旧数据迁移方式：旧版运行状态下在「设置」页导出 JSON，新版登录后在「设置」页导入。

