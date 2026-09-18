// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderWorkspace } from '../../../../shared/folder-workspace-types'
import { folderWorkspaceKey } from '../../../../shared/workspace-scope'
import type * as NewWorkspaceModule from '@/lib/new-workspace'

const mocks = vi.hoisted(() => ({
  activateAndRevealFolderWorkspace: vi.fn(),
  ensureAgentStartupInTerminal: vi.fn()
}))

vi.mock('@/lib/worktree-activation', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, activateAndRevealFolderWorkspace: mocks.activateAndRevealFolderWorkspace }
})

vi.mock('@/lib/new-workspace', async (importOriginal) => {
  const actual = await importOriginal<typeof NewWorkspaceModule>()
  return { ...actual, ensureAgentStartupInTerminal: mocks.ensureAgentStartupInTerminal }
})

import { submitFolderWorkspaceCreate } from './folder-workspace-composer-submit'

const SEEDED = '/mantisPRfix https://mantis.example.com/view.php?id=7'

describe('submitFolderWorkspaceCreate seeded start prompt', () => {
  beforeEach(() => {
    mocks.activateAndRevealFolderWorkspace.mockReturnValue({ primaryTabId: 'tab-1' })
    Object.assign(window, {
      api: { agentTrust: { markTrusted: vi.fn().mockResolvedValue(undefined) } }
    })
  })

  afterEach(() => {
    mocks.activateAndRevealFolderWorkspace.mockReset()
    mocks.ensureAgentStartupInTerminal.mockReset()
    Reflect.deleteProperty(window, 'api')
  })

  it('auto-submits a custom source seeded prompt instead of drafting the linked item', async () => {
    const workspace: FolderWorkspace = {
      id: 'folder-workspace-1',
      projectGroupId: 'group-1',
      name: '7 Fix login',
      folderPath: '/repo/platform/fix-login',
      linkedTask: null,
      comment: '',
      isArchived: false,
      isUnread: false,
      isPinned: false,
      sortOrder: 0,
      lastActivityAt: 1,
      createdAt: 1,
      updatedAt: 1
    }

    await submitFolderWorkspaceCreate({
      projectGroup: {
        id: 'group-1',
        name: 'Platform',
        parentPath: '/repo/platform',
        parentGroupId: null,
        createdFrom: 'folder-scan',
        tabOrder: 0,
        isCollapsed: false,
        color: null,
        createdAt: 1,
        updatedAt: 1
      },
      name: '',
      lastAutoName: '',
      linkedWorkItem: {
        provider: 'custom',
        type: 'issue',
        number: 7,
        title: '7 Fix login',
        url: 'https://mantis.example.com/view.php?id=7',
        customIdentifier: '7'
      },
      note: '',
      seededStartPrompt: SEEDED,
      quickAgent: 'aider',
      autoRenameBranchFromWork: false,
      agentCmdOverrides: {},
      createFolderWorkspace: vi.fn(async () => workspace),
      onOpenChange: vi.fn()
    })

    expect(mocks.ensureAgentStartupInTerminal).toHaveBeenCalledWith({
      worktreeId: folderWorkspaceKey('folder-workspace-1'),
      primaryTabId: 'tab-1',
      startup: expect.objectContaining({ followupPrompt: SEEDED })
    })
    const startup = mocks.ensureAgentStartupInTerminal.mock.calls[0]?.[0]?.startup
    expect(startup?.draftPrompt).toBeFalsy()
  })
})
