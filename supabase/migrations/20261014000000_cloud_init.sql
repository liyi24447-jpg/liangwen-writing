-- ============================================================
-- 靓文写作 · 云端数据库初始化脚本（Supabase PostgreSQL）
-- 使用方法：Supabase 控制台 → SQL Editor → 粘贴本文件全部内容 → Run
-- 幂等设计：可重复执行，不会破坏已有数据
-- ============================================================

-- ---------- 1. 用户表（与 Supabase Auth 的 auth.users 关联） ----------
create table if not exists public.users (
  id bigint generated always as identity primary key,
  supabase_uid uuid unique not null,
  account text unique not null,
  email text unique,
  is_admin boolean not null default false,
  is_active boolean not null default true,
  membership_level text not null default 'none',   -- none / plus / ultra
  membership_expire_at bigint not null default 0,  -- 毫秒时间戳，0 表示非会员
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists idx_users_supabase_uid on public.users(supabase_uid);

-- 新用户在 Supabase Auth 注册后，自动在 public.users 创建对应行
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (
    supabase_uid, account, email, is_admin, is_active,
    membership_level, membership_expire_at, created_at, updated_at
  ) values (
    new.id, split_part(new.email, '@', 1), new.email, false, true,
    'none', 0,
    (extract(epoch from now()) * 1000)::bigint,
    (extract(epoch from now()) * 1000)::bigint
  )
  on conflict (supabase_uid) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 2. 功能权限表（按账号单独配置） ----------
create table if not exists public.user_permissions (
  id bigint generated always as identity primary key,
  user_id bigint unique not null references public.users(id) on delete cascade,
  can_write_short boolean not null default true,
  can_disassemble boolean not null default true,
  can_hot_rank boolean not null default true,
  can_optimize boolean not null default true,
  can_workbench boolean not null default true,
  can_upload_continue boolean not null default true,
  configured_by_admin boolean not null default false,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists idx_user_permissions_user_id on public.user_permissions(user_id);

-- ---------- 3. 等级默认权限表（none / plus / ultra） ----------
create table if not exists public.level_permissions (
  id bigint generated always as identity primary key,
  level text unique not null,
  can_write_short boolean not null default true,
  can_disassemble boolean not null default true,
  can_hot_rank boolean not null default true,
  can_optimize boolean not null default true,
  can_workbench boolean not null default true,
  can_upload_continue boolean not null default true,
  configured_by_admin boolean not null default false,
  updated_at bigint not null
);

-- 默认等级权限（默认全部开启，管理员可在后台按等级收紧）
insert into public.level_permissions
  (level, can_write_short, can_disassemble, can_hot_rank, can_optimize, can_workbench, can_upload_continue, configured_by_admin, updated_at)
values
  ('none',  true, true, true, true, true, true, false, 0),
  ('plus',  true, true, true, true, true, true, false, 0),
  ('ultra', true, true, true, true, true, true, false, 0)
on conflict (level) do nothing;

-- ---------- 4. 作品表 ----------
create table if not exists public.books (
  id text primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  title text not null default '未命名作品',
  author text not null default '墨客',
  genre text not null default '玄幻',
  category_group text not null default 'male',
  setting text not null default '',
  writing_style text not null default '朴实真挚',
  narrative_perspective text not null default 'third',
  style_description text not null default '',
  style_guide text,
  synopsis text,
  blurb text,
  blurb_word_count text,
  blurb_focus text,
  outline text,
  script_content text,
  cover_image text,
  word_count integer not null default 0,
  chapter_count integer not null default 0,
  status text not null default 'active',
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists idx_books_user_id on public.books(user_id);

-- ---------- 5. 书名候选 ----------
create table if not exists public.book_title_candidates (
  id bigint generated always as identity primary key,
  book_id text not null references public.books(id) on delete cascade,
  title text not null,
  sort_order integer not null default 0
);

create index if not exists idx_book_title_candidates_book_id on public.book_title_candidates(book_id);

-- ---------- 6. 人物小传 ----------
create table if not exists public.characters (
  id text primary key,
  book_id text not null references public.books(id) on delete cascade,
  name text not null,
  identity text,
  gender text,
  personality text,
  background text,
  relationship text,
  character_arc text,
  key_traits text,
  extra_fields jsonb,
  sort_order integer not null default 0,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists idx_characters_book_id on public.characters(book_id);

-- ---------- 7. 卷 ----------
create table if not exists public.volumes (
  id text primary key,
  book_id text not null references public.books(id) on delete cascade,
  title text not null,
  summary text,
  chapter_count integer not null default 0,
  sort_order integer not null default 0,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists idx_volumes_book_id on public.volumes(book_id);

-- ---------- 8. 章节 ----------
create table if not exists public.chapters (
  id text primary key,
  book_id text not null references public.books(id) on delete cascade,
  volume_id text references public.volumes(id) on delete set null,
  title text not null,
  summary text,
  word_count integer not null default 0,
  content text not null default '',
  status text not null default 'draft',
  sort_order integer not null default 0,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists idx_chapters_book_id on public.chapters(book_id);
create index if not exists idx_chapters_volume_id on public.chapters(volume_id);

-- ---------- 9. 公告 ----------
create table if not exists public.announcements (
  id bigint generated always as identity primary key,
  title text not null default '',
  content text not null default '',
  is_enabled boolean not null default false,
  updated_at bigint not null
);

-- ---------- 10. 兑换码 ----------
create table if not exists public.redemption_codes (
  id bigint generated always as identity primary key,
  code text unique not null,
  membership_level text not null default 'plus',
  days integer not null default 30,
  is_active boolean not null default true,
  is_used boolean not null default false,
  used_by bigint,
  used_at bigint,
  created_at bigint not null,
  updated_at bigint not null
);

create index if not exists idx_redemption_codes_code on public.redemption_codes(code);

-- ---------- 11. 每日字数统计（Plus 会员每日 10 万字上限） ----------
create table if not exists public.daily_word_stats (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  date_str text not null,
  word_count integer not null default 0,
  updated_at bigint not null,
  unique (user_id, date_str)
);

create index if not exists idx_daily_word_stats_user_date on public.daily_word_stats(user_id, date_str);

-- ============================================================
-- 12. Row Level Security（行级权限）：即使密钥泄露，也只能操作自己的数据
-- ============================================================

alter table public.users enable row level security;
alter table public.user_permissions enable row level security;
alter table public.level_permissions enable row level security;
alter table public.books enable row level security;
alter table public.book_title_candidates enable row level security;
alter table public.characters enable row level security;
alter table public.volumes enable row level security;
alter table public.chapters enable row level security;
alter table public.announcements enable row level security;
alter table public.redemption_codes enable row level security;
alter table public.daily_word_stats enable row level security;

-- 用户只能看到/改自己的账号行
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select using (supabase_uid = auth.uid());

-- 权限行：只能读取自己
drop policy if exists user_permissions_select_own on public.user_permissions;
create policy user_permissions_select_own on public.user_permissions
  for select using (
    user_id = (select id from public.users where supabase_uid = auth.uid())
  );

-- 等级权限：登录用户可读
drop policy if exists level_permissions_select on public.level_permissions;
create policy level_permissions_select on public.level_permissions
  for select using (true);

-- 作品：只能读写自己的
drop policy if exists books_own on public.books;
create policy books_own on public.books
  for all using (
    user_id = (select id from public.users where supabase_uid = auth.uid())
  );

drop policy if exists book_title_candidates_own on public.book_title_candidates;
create policy book_title_candidates_own on public.book_title_candidates
  for all using (
    exists (
      select 1 from public.books b
      where b.id = book_title_candidates.book_id
        and b.user_id = (select id from public.users where supabase_uid = auth.uid())
    )
  );

drop policy if exists characters_own on public.characters;
create policy characters_own on public.characters
  for all using (
    exists (
      select 1 from public.books b
      where b.id = characters.book_id
        and b.user_id = (select id from public.users where supabase_uid = auth.uid())
    )
  );

drop policy if exists volumes_own on public.volumes;
create policy volumes_own on public.volumes
  for all using (
    exists (
      select 1 from public.books b
      where b.id = volumes.book_id
        and b.user_id = (select id from public.users where supabase_uid = auth.uid())
    )
  );

drop policy if exists chapters_own on public.chapters;
create policy chapters_own on public.chapters
  for all using (
    exists (
      select 1 from public.books b
      where b.id = chapters.book_id
        and b.user_id = (select id from public.users where supabase_uid = auth.uid())
    )
  );

-- 公告：只允许读到已启用的
drop policy if exists announcements_read_enabled on public.announcements;
create policy announcements_read_enabled on public.announcements
  for select using (is_enabled = true);

-- 兑换码：不开放任何直接访问（只能由后端服务端代码操作）

-- 每日字数：只能读写自己的
drop policy if exists daily_word_stats_own on public.daily_word_stats;
create policy daily_word_stats_own on public.daily_word_stats
  for all using (
    user_id = (select id from public.users where supabase_uid = auth.uid())
  );

-- ---------- 13. 权限授予 ----------
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- ---------- 14. 可选：设置你的管理员 ----------
-- 注册一个账号（例如 admin）后，在 SQL Editor 执行下面这句，把它设为管理员：
-- update public.users set is_admin = true where account = 'admin';

