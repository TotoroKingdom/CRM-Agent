import {
  Bell,
  Bot,
  ChevronRight,
  ChevronDown,
  Clock3,
  Folder,
  GitPullRequest,
  Grid2X2,
  HelpCircle,
  MoreHorizontal,
  PanelTop,
  Pin,
  Plus,
  Search,
  Settings2,
  SquarePen,
  Sparkles,
} from 'lucide-react';
import { useState, type RefObject } from 'react';
import type { ConversationFixture } from '../../presentation/types';
import { BackendConnectionStatus } from './BackendConnectionStatus';
import type { BackendConnectionStatusValue } from './BackendConnectionStatus';
import { WorkspaceCollection } from '../workspaces/WorkspaceCollection';
import type { WorkspaceCollectionOperation, WorkspaceCollectionOperationError, WorkspaceCollectionStatus } from '../workspaces/WorkspaceCollection';
import type { WorkspaceListItem } from '../workspaces/WorkspaceList';
import styles from './Sidebar.module.css';

export type SidebarProps = {
  collapsed?: boolean;
  conversations?: readonly ConversationFixture[];
  activeConversationId?: string | null;
  backendConnectionStatus?: BackendConnectionStatusValue;
  onConversationSelect?: (conversationId: string) => void;
  onBackendConnectionRetry?: () => void;
  workspaceActiveId?: string | null;
  workspaceCollectionError?: string | null;
  workspaceCollectionStatus?: WorkspaceCollectionStatus;
  workspaceFocusReturnRef?: RefObject<HTMLElement | null>;
  workspaceItems?: readonly WorkspaceListItem[];
  workspaceOperation?: WorkspaceCollectionOperation;
  workspaceOperationError?: WorkspaceCollectionOperationError | null;
  onWorkspaceAdd?: () => void;
  onWorkspaceOpen?: (workspaceId: string) => void;
  onWorkspaceRecheck?: (workspaceId: string) => void;
  onWorkspaceRefresh?: () => void;
  onWorkspaceRename?: (workspaceId: string) => void;
  onWorkspaceRetry?: () => void;
};

const primaryActions = [
  { label: '新对话', icon: <Plus aria-hidden="true" /> },
  { label: '拉取请求', icon: <GitPullRequest aria-hidden="true" /> },
  { label: '站点', icon: <Grid2X2 aria-hidden="true" /> },
  { label: '已安排', icon: <Clock3 aria-hidden="true" /> },
  { label: '插件', icon: <Sparkles aria-hidden="true" /> },
];

const collections = [
  {
    label: '最近',
    collection: 'recent',
    icon: <Clock3 aria-hidden="true" />,
  },
] as const;

const fallbackConversations: readonly ConversationFixture[] = [
  { id: 'fallback-current', title: '当前示例会话', timeline: [] },
];

export function Sidebar({
  collapsed = false,
  conversations = fallbackConversations,
  activeConversationId = conversations[0]?.id ?? null,
  backendConnectionStatus = 'checking',
  onConversationSelect,
  onBackendConnectionRetry,
  workspaceActiveId = null,
  workspaceCollectionError = null,
  workspaceCollectionStatus = 'idle',
  workspaceFocusReturnRef,
  workspaceItems = [],
  workspaceOperation = 'idle',
  workspaceOperationError = null,
  onWorkspaceAdd,
  onWorkspaceOpen,
  onWorkspaceRecheck,
  onWorkspaceRefresh,
  onWorkspaceRename,
  onWorkspaceRetry,
}: SidebarProps) {
  // 各分区的展开和排序只影响当前侧栏展示，不改变后端持久化顺序。
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const [isRecentExpanded, setIsRecentExpanded] = useState(true);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [projectSort, setProjectSort] = useState<'recent' | 'name'>('recent');
  const activeWorkspace = workspaceItems.find((workspace) => workspace.id === workspaceActiveId) ?? null;
  const pinnedConversations = conversations.filter((conversation) => (conversation.collection ?? 'pinned') === 'pinned');
  const projectConversations = conversations.filter((conversation) => (conversation.collection ?? 'pinned') === 'project');
  const displayedWorkspaceItems = projectSort === 'name'
    ? [...workspaceItems].sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
    : workspaceItems;

  function chooseProjectSort(sort: 'recent' | 'name'): void {
    setProjectSort(sort);
    setIsProjectMenuOpen(false);
  }
  return (
    <aside
      aria-label="侧边栏"
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : styles.expanded}`}
      data-collapsed={collapsed}
      ref={workspaceFocusReturnRef}
      tabIndex={-1}
    >
      <div className={styles.brandRow}>
        <button aria-label="Codex 工作区" className={styles.brandButton} type="button">
          <Bot aria-hidden="true" size={22} strokeWidth={1.8} />
          {!collapsed && <><span>Codex</span><ChevronDown aria-hidden="true" size={15} /></>}
        </button>
        {!collapsed && (
          <div className={styles.brandTools}>
            <button aria-label="搜索" className={styles.iconButton} type="button"><Search aria-hidden="true" /></button>
            <button aria-label="通知" className={styles.iconButton} type="button"><Bell aria-hidden="true" /></button>
          </div>
        )}
      </div>

      <nav aria-label="主要操作" className={styles.primaryActions}>
        {primaryActions.map(({ label, icon }) => (
          <button aria-label={label} className={styles.actionButton} key={label} type="button">
            {icon}
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
        {collapsed && (
          <button aria-label="创建项目" className={styles.actionButton} onClick={onWorkspaceAdd} type="button">
            <Folder aria-hidden="true" />
          </button>
        )}
      </nav>

      {!collapsed && (
        <div className={styles.collectionScroll} data-scroll-region="sidebar">
          <section aria-labelledby="collection-置顶" className={styles.collection}>
            <div className={styles.collectionHeader}>
              <button
                aria-controls="pinned-content"
                aria-expanded={isPinnedExpanded}
                className={styles.collectionToggle}
                onClick={() => setIsPinnedExpanded((expanded) => !expanded)}
                type="button"
              >
                <ChevronRight aria-hidden="true" className={isPinnedExpanded ? styles.projectChevronExpanded : undefined} size={16} />
                <h2 id="collection-置顶">置顶</h2>
              </button>
            </div>
            {isPinnedExpanded && (
              <ul id="pinned-content">
                {pinnedConversations.map((conversation, index) => {
                  const isCurrent = conversation.id === activeConversationId;
                  return (
                    <li className={styles.conversationItem} key={conversation.id}>
                      <button
                        aria-current={isCurrent ? 'page' : undefined}
                        className={`${styles.conversation} ${isCurrent ? styles.current : ''}`}
                        onClick={() => onConversationSelect?.(conversation.id)}
                        type="button"
                      >
                        {index === 0 ? <Pin aria-hidden="true" /> : <span className={styles.itemSpacer} aria-hidden="true" />}
                        <span>{conversation.title}</span>
                      </button>
                      <button aria-label={`打开${conversation.title}操作菜单`} className={styles.conversationMore} type="button">
                        <MoreHorizontal aria-hidden="true" size={16} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section aria-labelledby="collection-项目" className={styles.workspaceProject}>
            <div className={styles.projectHeader}>
              <button
                aria-controls="project-content"
                aria-expanded={isProjectsExpanded}
                className={styles.projectToggle}
                onClick={() => setIsProjectsExpanded((expanded) => !expanded)}
                type="button"
              >
                <ChevronRight aria-hidden="true" className={isProjectsExpanded ? styles.projectChevronExpanded : undefined} size={16} />
                <h2 id="collection-项目">项目</h2>
              </button>
              <div className={styles.projectHeaderActions}>
                <div className={styles.projectMenuContainer}>
                  <button
                    aria-expanded={isProjectMenuOpen}
                    aria-haspopup="menu"
                    aria-label="项目排序和操作"
                    className={styles.collectionAction}
                    onClick={() => setIsProjectMenuOpen((open) => !open)}
                    type="button"
                  >
                    <MoreHorizontal aria-hidden="true" size={16} />
                  </button>
                  {isProjectMenuOpen && (
                    <div aria-label="项目排序菜单" className={styles.projectMenu} role="menu">
                      <p>排序方式</p>
                      <button aria-pressed={projectSort === 'recent'} onClick={() => chooseProjectSort('recent')} role="menuitemradio" type="button">最近打开</button>
                      <button aria-pressed={projectSort === 'name'} onClick={() => chooseProjectSort('name')} role="menuitemradio" type="button">项目名称</button>
                      <button onClick={() => { setIsProjectMenuOpen(false); onWorkspaceRefresh?.(); }} role="menuitem" type="button">刷新项目</button>
                    </div>
                  )}
                </div>
                <button aria-label="创建项目" className={styles.collectionAction} onClick={onWorkspaceAdd} type="button">
                  <Plus aria-hidden="true" size={17} />
                </button>
              </div>
            </div>
            {isProjectsExpanded && (
              <div id="project-content" className={styles.projectContent}>
                <WorkspaceCollection
                  activeWorkspaceId={workspaceActiveId}
                  collectionError={workspaceCollectionError}
                  collectionStatus={workspaceCollectionStatus}
                  items={displayedWorkspaceItems}
                  onAdd={onWorkspaceAdd ?? (() => undefined)}
                  onOpen={(workspaceId) => {
                    setIsProjectsExpanded(true);
                    onWorkspaceOpen?.(workspaceId);
                  }}
                  onRecheck={(workspaceId) => {
                    setIsProjectsExpanded(true);
                    onWorkspaceRecheck?.(workspaceId);
                  }}
                  onRefresh={onWorkspaceRefresh ?? (() => undefined)}
                  onRename={onWorkspaceRename ?? (() => undefined)}
                  onRetry={onWorkspaceRetry ?? (() => undefined)}
                  operation={workspaceOperation}
                  operationError={workspaceOperationError}
                />
                {projectConversations.length > 0 && (
                  <section aria-labelledby="collection-项目会话" className={styles.projectConversations}>
                    <h3 id="collection-项目会话">{activeWorkspace ? `${activeWorkspace.name} 的会话` : '项目示例会话'}</h3>
                    <ul>
                      {projectConversations.map((conversation) => {
                        const isCurrent = conversation.id === activeConversationId;
                        return (
                          <li className={styles.conversationItem} key={conversation.id}>
                            <button
                              aria-current={isCurrent ? 'page' : undefined}
                              className={`${styles.conversation} ${isCurrent ? styles.current : ''}`}
                              onClick={() => onConversationSelect?.(conversation.id)}
                              type="button"
                            >
                              <span className={styles.itemSpacer} aria-hidden="true" />
                              <span>{conversation.title}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </section>
          {collections.map(({ label, collection, icon }) => {
            const collectionConversations = conversations.filter(
              (conversation) => (conversation.collection ?? 'pinned') === collection,
            );
            const isExpanded = collection === 'recent' ? isRecentExpanded : true;
            return (
            <section aria-labelledby={`collection-${label}`} className={styles.collection} key={label}>
              <div className={styles.collectionHeader}>
                <button
                  aria-controls={`${collection}-content`}
                  aria-expanded={isExpanded}
                  className={styles.collectionToggle}
                  onClick={() => setIsRecentExpanded((expanded) => !expanded)}
                  type="button"
                >
                  <ChevronRight aria-hidden="true" className={isExpanded ? styles.projectChevronExpanded : undefined} size={16} />
                  <h2 id={`collection-${label}`}>{label}</h2>
                </button>
                <div className={styles.collectionActions}>
                  <button aria-label={`${label}更多操作`} className={styles.collectionAction} type="button">
                    <MoreHorizontal aria-hidden="true" size={16} />
                  </button>
                  <button aria-label="编辑最近分组" className={styles.collectionAction} type="button">
                    <SquarePen aria-hidden="true" size={15} />
                  </button>
                </div>
              </div>
              {isExpanded && (
                <ul id={`${collection}-content`}>
                  {collectionConversations.map((conversation, index) => {
                  const isCurrent = conversation.id === activeConversationId;
                  return (
                    <li className={styles.conversationItem} key={conversation.id}>
                      <button
                        aria-current={isCurrent ? 'page' : undefined}
                        className={`${styles.conversation} ${isCurrent ? styles.current : ''}`}
                        onClick={() => onConversationSelect?.(conversation.id)}
                        type="button"
                      >
                        {index === 0 && collection !== 'recent' ? icon : <span className={styles.itemSpacer} aria-hidden="true" />}
                        <span>{conversation.title}</span>
                      </button>
                      <button aria-label={`打开${conversation.title}操作菜单`} className={styles.conversationMore} type="button">
                        <MoreHorizontal aria-hidden="true" size={16} />
                      </button>
                    </li>
                  );
                  })}
                </ul>
              )}
            </section>
            );
          })}
        </div>
      )}

      <footer className={styles.footer}>
        <BackendConnectionStatus
          collapsed={collapsed}
          onRetry={onBackendConnectionRetry ?? (() => undefined)}
          status={backendConnectionStatus}
        />
        <div className={styles.footerUserActions}>
          <button aria-label="打开用户菜单" className={styles.userButton} type="button">
            <span aria-hidden="true" className={styles.avatar}>T</span>
            {!collapsed && <span className={styles.userName}>用户</span>}
          </button>
          {!collapsed && <button aria-label="侧边栏设置" className={styles.iconButton} type="button"><Settings2 aria-hidden="true" /></button>}
        </div>
      </footer>
      {collapsed && activeWorkspace && (
        <span aria-label={`当前工作区：${activeWorkspace.name}`} className={styles.collapsedWorkspaceStatus} role="status" title={activeWorkspace.root_path}>
          <Folder aria-hidden="true" size={16} />
        </span>
      )}
    </aside>
  );
}
