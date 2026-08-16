import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { WorkspaceCollection } from './WorkspaceCollection';
import type { WorkspaceListItem } from './WorkspaceList';
import styles from './WorkspaceCollection.module.css';

const available: WorkspaceListItem = {
  id: 'workspace-1',
  name: 'Mini Agent',
  root_path: 'C:\\work\\mini-agent',
  availability: 'available',
};

function renderCollection(overrides: Partial<React.ComponentProps<typeof WorkspaceCollection>> = {}) {
  const callbacks = {
    onAdd: vi.fn(),
    onOpen: vi.fn(),
    onRecheck: vi.fn(),
    onRefresh: vi.fn(),
    onRename: vi.fn(),
    onRetry: vi.fn(),
  };
  render(
    <WorkspaceCollection
      activeWorkspaceId={null}
      collectionStatus="ready"
      items={[]}
      {...callbacks}
      {...overrides}
    />,
  );
  return callbacks;
}

describe('WorkspaceCollection', () => {
  it('明确展示 Loading 和 Empty 状态，并引导添加绝对路径', () => {
    const { rerender } = render(
      <WorkspaceCollection
        activeWorkspaceId={null}
        collectionStatus="loading"
        items={[]}
        onAdd={vi.fn()}
        onOpen={vi.fn()}
        onRecheck={vi.fn()}
        onRefresh={vi.fn()}
        onRename={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('正在加载工作区…');

    rerender(
      <WorkspaceCollection
        activeWorkspaceId={null}
        collectionStatus="ready"
        items={[]}
        onAdd={vi.fn()}
        onOpen={vi.fn()}
        onRecheck={vi.fn()}
        onRefresh={vi.fn()}
        onRename={vi.fn()}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByText('尚未创建项目。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '创建第一个项目' })).toBeInTheDocument();
  });

  it('Collection Error 提供 Retry，且最近成功列表仍然可见', async () => {
    const user = userEvent.setup();
    const callbacks = renderCollection({ collectionStatus: 'error', collectionError: 'C:\\private\\traceback', items: [available] });

    expect(screen.getByRole('alert')).toHaveTextContent('无法加载工作区，请重试。');
    expect(screen.queryByText(/private|traceback/i)).not.toBeInTheDocument();
    expect(screen.getByText('Mini Agent')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试加载工作区' }));
    expect(callbacks.onRetry).toHaveBeenCalledTimes(1);
  });

  it('展示安全 Operation Error，并将列表意图交给回调', async () => {
    const user = userEvent.setup();
    const callbacks = renderCollection({
      items: [available],
      operationError: { code: 'workspace_already_exists' },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('该目录已经添加为工作区。');
    await user.click(screen.getByRole('button', { name: '打开 Mini Agent' }));
    await user.click(screen.getByRole('button', { name: '重命名 Mini Agent' }));

    expect(callbacks.onOpen).toHaveBeenCalledWith('workspace-1');
    expect(callbacks.onRename).toHaveBeenCalledWith('workspace-1');
  });

  it('Pending 时禁用相关操作而不隐藏集合内容', async () => {
    const user = userEvent.setup();
    const callbacks = renderCollection({ items: [available], operation: 'opening' });

    expect(screen.getByText('Mini Agent')).toBeInTheDocument();
    const open = screen.getByRole('button', { name: '打开 Mini Agent' });
    expect(open).toBeDisabled();
    await user.click(open);
    expect(callbacks.onOpen).not.toHaveBeenCalled();
  });

  it('保留可识别的集合 Accessible Name 与样式边界', () => {
    renderCollection();
    expect(screen.getByRole('region', { name: '工作区集合' })).toHaveClass(styles.collection);
  });
});
