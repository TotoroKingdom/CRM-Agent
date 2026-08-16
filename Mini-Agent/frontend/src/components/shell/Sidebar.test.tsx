import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';
import styles from './Sidebar.module.css';

describe('Sidebar', () => {
  it('renders the expanded information-dense sidebar with current item and footer', () => {
    render(<Sidebar />);

    const sidebar = screen.getByRole('complementary', { name: '侧边栏' });
    expect(sidebar).toHaveClass(styles.expanded);
    expect(sidebar).toHaveAttribute('data-collapsed', 'false');
    ['置顶', '项目', '最近'].forEach((name) => expect(screen.getByRole('heading', { name })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '新对话' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '创建项目' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '当前示例会话' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('用户')).toBeInTheDocument();
    expect(document.querySelector('[data-scroll-region="sidebar"]')).toBeInTheDocument();
  });

  it('renders a 64px collapsed state that keeps only essential entry points', () => {
    render(
      <Sidebar
        collapsed
        workspaceActiveId="workspace-a"
        workspaceItems={[{ id: 'workspace-a', name: 'Mini Agent', root_path: 'C:\\AI\\Mini-Codex\\Mini-Agent', availability: 'available' }]}
      />,
    );

    const sidebar = screen.getByRole('complementary', { name: '侧边栏' });
    expect(sidebar).toHaveClass(styles.collapsed);
    expect(sidebar).toHaveAttribute('data-collapsed', 'true');
    expect(screen.getByRole('button', { name: 'Codex 工作区' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新对话' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '创建项目' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: '当前工作区：Mini Agent' })).toHaveAttribute('title', 'C:\\AI\\Mini-Codex\\Mini-Agent');
    expect(screen.queryByRole('heading', { name: '置顶' })).not.toBeInTheDocument();
    expect(screen.queryByText('用户')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '打开用户菜单' })).toBeInTheDocument();
  });

  it('keeps Fixture conversations independent and exposes Workspace Collection operations', async () => {
    const user = userEvent.setup();
    const onConversationSelect = vi.fn();
    render(
      <Sidebar
        conversations={[
          { id: 'pinned', title: '置顶会话', collection: 'pinned', timeline: [] },
          { id: 'project-a', title: '项目示例 A', collection: 'project', timeline: [] },
          { id: 'recent-a', title: '示例记录 A', collection: 'recent', timeline: [] },
        ]}
        onConversationSelect={onConversationSelect}
        workspaceActiveId="workspace-a"
        workspaceCollectionStatus="ready"
        workspaceItems={[{ id: 'workspace-a', name: 'Mini Agent', root_path: 'C:\\AI\\Mini-Codex\\Mini-Agent', availability: 'available' }]}
      />,
    );

    await user.click(screen.getByRole('button', { name: '项目示例 A' }));
    await user.click(screen.getByRole('button', { name: '示例记录 A' }));

    expect(onConversationSelect).toHaveBeenNthCalledWith(1, 'project-a');
    expect(onConversationSelect).toHaveBeenNthCalledWith(2, 'recent-a');
    expect(screen.getByRole('button', { name: '打开 Mini Agent' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重命名 Mini Agent' })).toBeInTheDocument();
    expect(screen.getByText('Mini Agent 的会话')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '最近更多操作' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '编辑最近分组' })).toBeInTheDocument();
  });

  it('支持折叠项目、按名称排序，并通过加号发起创建项目', async () => {
    const user = userEvent.setup();
    const onWorkspaceAdd = vi.fn();
    render(
      <Sidebar
        onWorkspaceAdd={onWorkspaceAdd}
        workspaceCollectionStatus="ready"
        workspaceItems={[
          { id: 'beta', name: 'Beta', root_path: 'C:\\work\\beta', availability: 'available' },
          { id: 'alpha', name: 'Alpha', root_path: 'C:\\work\\alpha', availability: 'available' },
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: '项目' }));
    expect(screen.queryByRole('list', { name: '工作区列表' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '项目' }));

    await user.click(screen.getByRole('button', { name: '项目排序和操作' }));
    await user.click(screen.getByRole('menuitemradio', { name: '项目名称' }));
    expect(within(screen.getByRole('list', { name: '工作区列表' })).getAllByRole('listitem')[0]).toHaveTextContent('Alpha');

    await user.click(screen.getByRole('button', { name: '创建项目' }));
    expect(onWorkspaceAdd).toHaveBeenCalledTimes(1);
  });

  it('将置顶会话放在项目之前，并允许收缩置顶分区', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    const sidebarText = screen.getByRole('complementary', { name: '侧边栏' }).textContent ?? '';
    expect(sidebarText.indexOf('置顶')).toBeLessThan(sidebarText.indexOf('项目'));

    const pinnedToggle = screen.getByRole('button', { name: '置顶' });
    await user.click(pinnedToggle);
    expect(pinnedToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: '当前示例会话' })).not.toBeInTheDocument();
  });

  it('允许收缩最近记录分区', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    const recentToggle = screen.getByRole('button', { name: '最近' });
    await user.click(recentToggle);
    expect(recentToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: '示例记录 A' })).not.toBeInTheDocument();
  });
});
