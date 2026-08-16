import { WorkspaceList, type WorkspaceListItem } from './WorkspaceList';
import styles from './WorkspaceCollection.module.css';

export type WorkspaceCollectionStatus = 'idle' | 'loading' | 'ready' | 'error';
export type WorkspaceCollectionOperation = 'idle' | 'creating' | 'renaming' | 'opening' | 'refreshing';

export type WorkspaceCollectionOperationError = {
  code?: string;
};

export type WorkspaceCollectionProps = {
  activeWorkspaceId: string | null;
  collectionError?: string | null;
  collectionStatus: WorkspaceCollectionStatus;
  items: readonly WorkspaceListItem[];
  onAdd: () => void;
  onOpen: (workspaceId: string) => void;
  onRecheck: (workspaceId: string) => void;
  onRefresh: () => void;
  onRename: (workspaceId: string) => void;
  onRetry: () => void;
  operation?: WorkspaceCollectionOperation;
  operationError?: WorkspaceCollectionOperationError | null;
};

const operationMessages: Record<string, string> = {
  workspace_already_exists: '该目录已经添加为工作区。',
  workspace_name_invalid: '显示名称不符合要求。',
  workspace_not_found: '找不到该工作区。',
  workspace_path_invalid: '请输入支持格式的绝对路径。',
  workspace_path_missing: '该路径不存在。',
  workspace_path_not_directory: '该路径不是目录。',
  workspace_path_inaccessible: '无法访问该路径。',
  workspace_persistence_failed: '工作区操作未能完成，请稍后重试。',
};

function safeOperationMessage(error: WorkspaceCollectionOperationError | null | undefined): string | null {
  if (!error) {
    return null;
  }
  return operationMessages[error.code ?? ''] ?? '工作区操作未能完成，请稍后重试。';
}

/** 展示集合状态和安全错误，所有操作与请求生命周期均由上层控制。 */
export function WorkspaceCollection({
  activeWorkspaceId,
  collectionError = null,
  collectionStatus,
  items,
  onAdd,
  onOpen,
  onRecheck,
  onRefresh,
  onRename,
  onRetry,
  operation = 'idle',
  operationError = null,
}: WorkspaceCollectionProps) {
  const pending = operation !== 'idle';
  const operationMessage = safeOperationMessage(operationError);
  const showEmpty = collectionStatus === 'ready' && items.length === 0;
  const showCollectionError = collectionStatus === 'error';

  return (
    <section aria-label="工作区集合" className={styles.collection} data-collection-status={collectionStatus}>
      {collectionStatus === 'loading' && <p role="status">正在加载工作区…</p>}
      {collectionStatus === 'idle' && <p className={styles.muted} role="status">等待后端连接后加载工作区。</p>}
      {showCollectionError && (
        <div className={styles.errorPanel} role="alert">
          <p>无法加载工作区，请重试。</p>
          <button onClick={onRetry} type="button">重试加载工作区</button>
          {collectionError && <span className={styles.visuallyHidden}>已记录安全错误。</span>}
        </div>
      )}
      {operationMessage && <p className={styles.operationError} role="alert">{operationMessage}</p>}
      {showEmpty && (
        <div className={styles.empty}>
          <p>尚未创建项目。</p>
          <button disabled={pending} onClick={onAdd} type="button">创建第一个项目</button>
        </div>
      )}
      {items.length > 0 && (
        <WorkspaceList
          activeWorkspaceId={activeWorkspaceId}
          items={items}
          onOpen={onOpen}
          onRecheck={onRecheck}
          onRename={onRename}
          pending={pending}
        />
      )}
    </section>
  );
}
