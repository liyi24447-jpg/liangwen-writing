import pg from 'pg';

const { Pool } = pg;

// int8（bigint）在 node-postgres 里默认返回字符串，这里统一转成 number。
// 本项目的时间戳是毫秒级（< 2^53），转 number 是安全的。
pg.types.setTypeParser(20, (value: string) => Number(value));

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      '数据库未配置：请在服务端设置 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / DATABASE_URL 等环境变量'
    );
    this.name = 'DatabaseNotConfiguredError';
  }
}

let pool: pg.Pool | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool(): pg.Pool {
  if (!isDbConfigured()) {
    throw new DatabaseNotConfiguredError();
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on('error', (err) => {
      console.error('[db] PostgreSQL 连接池错误:', err.message);
    });
  }
  return pool;
}

export async function pingDatabase(): Promise<boolean> {
  try {
    if (!isDbConfigured()) return false;
    await getPool().query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/**
 * 以「登录用户」身份执行一段 SQL（RLS 生效）：
 * 在同一事务内 SET LOCAL ROLE authenticated + 注入该用户的 JWT claims，
 * 即使后端持有高权限连接，数据库层也会再次强制“只能操作自己的数据”。
 * 注意：Supabase 的 Transaction Pooler（端口 6543）在事务期间会固定连接，安全可用。
 */
export async function withUserContext<T>(
  supabaseUid: string,
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE authenticated');
    await client.query("SELECT set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: supabaseUid, role: 'authenticated' }),
    ]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 确保 public.users 里存在 Supabase Auth 用户对应的行。
 * 通常由数据库触发器自动创建，这里做兜底（幂等）。
 */
export async function ensureUserRow(params: {
  supabaseUid: string;
  account: string;
  email: string;
}): Promise<{ id: number; account: string; isAdmin: boolean }> {
  const now = Date.now();
  const result = await getPool().query<{ id: number; account: string; is_admin: boolean }>(
    `INSERT INTO users (supabase_uid, account, email, is_admin, is_active, membership_level, membership_expire_at, created_at, updated_at)
     VALUES ($1, $2, $3, false, true, 'none', 0, $4, $4)
     ON CONFLICT (supabase_uid)
     DO UPDATE SET account = EXCLUDED.account, email = EXCLUDED.email
     RETURNING id, account, is_admin`,
    [params.supabaseUid, params.account, params.email, now]
  );
  const row = result.rows[0];

  // 兜底：给新用户建默认权限行
  await getPool().query(
    `INSERT INTO user_permissions
      (user_id, can_write_short, can_disassemble, can_hot_rank, can_optimize, can_workbench, can_upload_continue, configured_by_admin, created_at, updated_at)
     VALUES ($1, true, true, true, true, true, true, false, $2, $2)
     ON CONFLICT (user_id) DO NOTHING`,
    [row.id, now]
  );

  return { id: row.id, account: row.account, isAdmin: row.is_admin };
}

/**
 * 管理员初始化：如果 INITIAL_ADMIN_ACCOUNT 配置了账号，且系统里还没有任何管理员，
 * 就把该账号提升为管理员（幂等，可在服务启动时调用）。
 */
export async function bootstrapInitialAdmin(): Promise<void> {
  const initialAccount = (process.env.INITIAL_ADMIN_ACCOUNT || '').trim().toLowerCase();
  if (!initialAccount || !isDbConfigured()) return;
  try {
    const result = await getPool().query(
      `UPDATE users SET is_admin = true, updated_at = $2
       WHERE account = $1
         AND NOT EXISTS (SELECT 1 FROM users WHERE is_admin = true)
       RETURNING id`,
      [initialAccount, Date.now()]
    );
    if (result.rowCount && result.rowCount > 0) {
      console.log(`[db] 已将账号「${initialAccount}」设为管理员`);
    }
  } catch (err) {
    console.error('[db] 管理员初始化失败:', err instanceof Error ? err.message : err);
  }
}

export default getPool;

