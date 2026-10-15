-- ============================================================
-- 靓文写作 · 新增「修改密码 CDK」表
-- 迁移说明：
--   修改密码不再直接校验旧密码，改为用户先关注微信公众号《靓文写作》
--   获取一次性 CDK，凭 CDK + 新密码完成改密；管理员可在后台生成该码。
--   本表不开放任何直接访问（RLS 开启且不建策略），只能由后端服务端代码操作。
-- ============================================================

-- ---------- 12. 修改密码 CDK ----------
create table if not exists public.password_reset_codes (
  id bigint generated always as identity primary key,
  code text unique not null,
  is_active boolean not null default true,
  is_used boolean not null default false,
  used_by bigint references public.users(id) on delete set null,
  used_at bigint,
  created_by bigint references public.users(id) on delete set null,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists idx_password_reset_codes_code on public.password_reset_codes(code);
create index if not exists idx_password_reset_codes_used on public.password_reset_codes(is_used);

-- 行级权限：开启后不创建任何策略，即拒绝一切直接访问
alter table public.password_reset_codes enable row level security;

-- 权限授予（实际被 RLS 拦截，仅 service_role 走服务端连接生效）
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.password_reset_codes to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
