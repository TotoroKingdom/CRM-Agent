import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '../App';

const timestamp = '2026-08-16T00:00:00.000Z';

function workspace(id: string, name: string, rootPath: string) {
  return {
    id,
    name,
    root_path: rootPath,
    availability: 'available' as const,
    created_at: timestamp,
    updated_at: timestamp,
    last_opened_at: timestamp,
  };
}

function healthResponse(): Response {
  return {
    status: 200,
    json: () => Promise.resolve({
      status: 'ok',
      service: 'mini-agent-backend',
      api_version: 'v1',
      database: { status: 'ready', schema_version: 1 },
    }),
  } as Response;
}

function workspaceListResponse(items: ReturnType<typeof workspace>[]): Response {
  return { status: 200, json: () => Promise.resolve({ items }) } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App workspace integration', () => {
  it('loads only after Backend Connected, and wires Add, Open, and Rename through the controller', async () => {
    const alpha = workspace('workspace-alpha', 'Alpha', 'C:\\work\\alpha');
    const beta = workspace('workspace-beta', 'Beta', 'C:\\work\\beta');
    const betaRenamed = { ...beta, name: 'Beta 已重命名' };
    let listedItems = [alpha];
    const fetchMock = vi.fn((url: string, options: RequestInit) => {
      if (url.endsWith('/api/health')) {
        return Promise.resolve(healthResponse());
      }
      if (url.endsWith('/api/workspaces') && options.method === 'GET') {
        return Promise.resolve(workspaceListResponse(listedItems));
      }
      if (url.endsWith('/api/workspaces') && options.method === 'POST') {
        listedItems = [alpha, beta];
        return Promise.resolve({ status: 201, json: () => Promise.resolve(beta) } as Response);
      }
      if (url.endsWith('/api/workspaces/workspace-beta') && options.method === 'PATCH') {
        listedItems = [alpha, betaRenamed];
        return Promise.resolve({ status: 200, json: () => Promise.resolve(betaRenamed) } as Response);
      }
      if (url.endsWith('/api/workspaces/workspace-alpha/open') && options.method === 'POST') {
        return Promise.resolve({ status: 200, json: () => Promise.resolve(alpha) } as Response);
      }
      throw new Error(`未预期的请求：${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByText('后端已连接')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '打开 Alpha' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '打开 Alpha' }));
    await waitFor(() => expect(screen.getByText('Alpha').closest('li')).toHaveAttribute('aria-current', 'true'));

    await user.click(screen.getByRole('button', { name: '创建项目' }));
    const addForm = screen.getByRole('form', { name: '添加工作区' });
    await user.type(within(addForm).getByRole('textbox', { name: '绝对工作区路径' }), 'C:\\work\\beta');
    await user.type(within(addForm).getByRole('textbox', { name: '显示名称（可选）' }), 'Beta');
    await user.click(within(addForm).getByRole('button', { name: '添加工作区' }));
    expect(await screen.findByRole('button', { name: '重命名 Beta' })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: '添加工作区' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重命名 Beta' }));
    const renameDialog = screen.getByRole('dialog', { name: '重命名工作区' });
    const nameInput = within(renameDialog).getByRole('textbox', { name: '显示名称' });
    await user.clear(nameInput);
    await user.type(nameInput, 'Beta 已重命名');
    await user.click(within(renameDialog).getByRole('button', { name: '保存名称' }));
    expect(await screen.findByRole('button', { name: '重命名 Beta 已重命名' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/workspaces\/workspace-beta$/),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('keeps M01/M02 controls available when Workspace Collection fails and allows an explicit refresh', async () => {
    let listAttempt = 0;
    vi.stubGlobal('fetch', vi.fn((url: string, options: RequestInit) => {
      if (url.endsWith('/api/health')) {
        return Promise.resolve(healthResponse());
      }
      if (url.endsWith('/api/workspaces') && options.method === 'GET') {
        listAttempt += 1;
        return listAttempt === 1
          ? Promise.reject(new TypeError('offline'))
          : Promise.resolve(workspaceListResponse([]));
      }
      throw new Error(`未预期的请求：${url}`);
    }));
    const user = userEvent.setup();

    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('无法加载工作区，请重试。');
    expect(screen.getByRole('form', { name: '消息编辑器' })).toHaveAttribute('data-mode', 'enabled');
    await user.click(screen.getByRole('button', { name: '更多会话选项' }));
    expect(screen.getByRole('dialog', { name: '验收面板' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '切换侧边栏' }));
    expect(screen.getByRole('complementary', { name: '侧边栏' })).toHaveAttribute('data-collapsed', 'true');

    await user.click(screen.getByRole('button', { name: '切换侧边栏' }));
    await user.click(screen.getByRole('button', { name: '重试加载工作区' }));
    expect(await screen.findByText('尚未创建项目。')).toBeInTheDocument();
  });
});
