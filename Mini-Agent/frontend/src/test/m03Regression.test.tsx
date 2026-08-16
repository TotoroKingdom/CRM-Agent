import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '../App';

const timestamp = '2026-08-16T08:00:00.000Z';

function workspace(
  id: string,
  name: string,
  availability: 'available' | 'missing' | 'not_directory' | 'inaccessible',
) {
  return {
    id,
    name,
    root_path: `C:\\workspace\\${id}`,
    availability,
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
      database: { status: 'ready', schema_version: 2 },
    }),
  } as Response;
}

function listResponse(items: ReturnType<typeof workspace>[]): Response {
  return { status: 200, json: () => Promise.resolve({ items }) } as Response;
}

function duplicateResponse(): Response {
  return {
    status: 409,
    json: () => Promise.resolve({
      error: {
        code: 'workspace_already_exists',
        message: 'The workspace has already been added.',
        field: 'root_path',
        workspace_id: 'available',
      },
    }),
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('M03 regression', () => {
  it('renders every Workspace availability, preserves the list after a failed recheck, and keeps M01 independent', async () => {
    const available = workspace('available', '可用项目', 'available');
    const missing = workspace('missing', '缺失项目', 'missing');
    const notDirectory = workspace('file', '文件项目', 'not_directory');
    const inaccessible = workspace('blocked', '受限项目', 'inaccessible');
    const fetchMock = vi.fn((url: string, options: RequestInit) => {
      if (url.endsWith('/api/health')) {
        return Promise.resolve(healthResponse());
      }
      if (url.endsWith('/api/workspaces') && options.method === 'GET') {
        return Promise.resolve(listResponse([available, missing, notDirectory, inaccessible]));
      }
      if (url.endsWith('/api/workspaces/missing/open') && options.method === 'POST') {
        return Promise.resolve({
          status: 422,
          json: () => Promise.resolve({
            error: {
              code: 'workspace_path_missing',
              message: 'The workspace path does not exist.',
              field: 'root_path',
            },
          }),
        } as Response);
      }
      if (url.endsWith('/api/workspaces/available/open') && options.method === 'POST') {
        return Promise.resolve({ status: 200, json: () => Promise.resolve(available) } as Response);
      }
      throw new Error(`未预期的请求：${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    render(<App />);

    const workspaceList = await screen.findByRole('list', { name: '工作区列表' });
    expect(within(workspaceList).getAllByRole('listitem')).toHaveLength(4);
    expect(within(workspaceList).queryByRole('listitem', { current: true })).not.toBeInTheDocument();
    expect(screen.getByText('状态：可用')).toBeInTheDocument();
    expect(screen.getByText('状态：目录缺失')).toBeInTheDocument();
    expect(screen.getByText('状态：不是目录')).toBeInTheDocument();
    expect(screen.getByText('状态：无法访问')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新检查并打开 缺失项目' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新检查并打开 文件项目' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新检查并打开 受限项目' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重新检查并打开 缺失项目' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('该路径不存在。');
    expect(within(workspaceList).getAllByRole('listitem')).toHaveLength(4);
    await user.click(screen.getByRole('button', { name: '打开 可用项目' }));
    expect(within(workspaceList).getAllByRole('listitem').find((item) => item.getAttribute('aria-current') === 'true')).toHaveTextContent('可用项目');

    await user.click(screen.getByRole('button', { name: '更多会话选项' }));
    expect(screen.getByRole('dialog', { name: '验收面板' })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: '消息编辑器' })).toHaveAttribute('data-mode', 'enabled');
  });

  it('projects duplicate errors safely and does not restore the active Workspace after remount', async () => {
    const available = workspace('available', '可用项目', 'available');
    vi.stubGlobal('fetch', vi.fn((url: string, options: RequestInit) => {
      if (url.endsWith('/api/health')) {
        return Promise.resolve(healthResponse());
      }
      if (url.endsWith('/api/workspaces') && options.method === 'GET') {
        return Promise.resolve(listResponse([available]));
      }
      if (url.endsWith('/api/workspaces') && options.method === 'POST') {
        return Promise.resolve(duplicateResponse());
      }
      throw new Error(`未预期的请求：${url}`);
    }));
    const user = userEvent.setup();

    const firstMount = render(<App />);
    await screen.findByRole('button', { name: '打开 可用项目' });
    await user.click(screen.getByRole('button', { name: '创建项目' }));
    const form = screen.getByRole('form', { name: '添加工作区' });
    await user.type(within(form).getByRole('textbox', { name: '绝对工作区路径' }), 'C:\\workspace\\available');
    await user.click(within(form).getByRole('button', { name: '添加工作区' }));
    expect(await within(form).findByText('该目录已经添加为工作区。')).toBeInTheDocument();
    expect(within(form).getByRole('textbox', { name: '绝对工作区路径' })).toHaveAttribute('aria-invalid', 'true');

    firstMount.unmount();
    render(<App />);
    const remountedList = await screen.findByRole('list', { name: '工作区列表' });
    expect(within(remountedList).queryByRole('listitem', { current: true })).not.toBeInTheDocument();
  });
});
