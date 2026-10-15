import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit-lite';
import { saveBook as apiSaveBook } from './novel-generator';
import type { IBookWork } from '@/data/novel';

/**
 * 共享的 saveBook 包装：
 * 先乐观更新 UI，后台默默持久化。
 * 失败时 toast 提示。
 *
 * 返回 Promise<IBookWork | null>，调用方可以 await 以确认保存完成。
 */
export function saveBookOptimistic(
  book: IBookWork,
  onBookUpdate: (b: IBookWork) => void,
  options?: { successMessage?: string; errorMessage?: string; silent?: boolean }
): Promise<IBookWork | null> {
  // 先乐观更新 UI（立即响应用户）
  onBookUpdate(book);

  const bookId = book.id;
  logger.info('[save] 开始保存', { bookId, fields: Object.keys(book as unknown as Record<string, unknown>).filter(k => (book as unknown as Record<string, unknown>)[k] !== undefined).length });

  // 后台异步持久化
  return apiSaveBook(book)
    .then((saved) => {
      if (saved) {
        if (options?.successMessage && !options?.silent) {
          toast.success(options.successMessage);
        }
        logger.info('[save] 保存成功', { bookId, updatedAt: saved.updatedAt });
        return saved;
      }
      const errMsg = options?.errorMessage || '保存失败，请稍后重试';
      if (!options?.silent) {
        toast.error(errMsg);
      }
      logger.error('[save] 保存失败: apiSaveBook 返回空', { bookId });
      return null;
    })
    .catch((error) => {
      const errMsg = options?.errorMessage || '保存失败，请稍后重试';
      if (!options?.silent) {
        toast.error(errMsg);
      }
      logger.error('[save] 保存异常:', String(error));
      return null;
    });
}
