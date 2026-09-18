import { describe, expect, it } from 'vitest'
import { areWorkspaceLinkedItemsEqual, normalizeWorkspaceLinkedItem } from './workspace-linked-item'
import type { WorkspaceLinkedItem } from './worktree/types'

describe('normalizeWorkspaceLinkedItem', () => {
  it('round-trips a custom item with its identifier through JSON persistence', () => {
    const item: WorkspaceLinkedItem = {
      provider: 'custom',
      type: 'issue',
      number: 1234,
      title: 'Fix login',
      url: 'https://mantis.example.com/view.php?id=1234',
      customIdentifier: '1234'
    }
    const restored = normalizeWorkspaceLinkedItem(JSON.parse(JSON.stringify(item)))
    expect(restored).toEqual(item)
    expect(areWorkspaceLinkedItemsEqual(restored, item)).toBe(true)
  })

  it('drops a blank custom identifier and rejects unknown providers', () => {
    expect(
      normalizeWorkspaceLinkedItem({
        provider: 'custom',
        type: 'issue',
        number: 0,
        title: ' Plan task ',
        url: 'https://tasks.example.com/t/abc',
        customIdentifier: '  '
      })
    ).toEqual({
      provider: 'custom',
      type: 'issue',
      number: 0,
      title: 'Plan task',
      url: 'https://tasks.example.com/t/abc'
    })
    expect(
      normalizeWorkspaceLinkedItem({
        provider: 'trello',
        type: 'issue',
        number: 1,
        title: 'x',
        url: 'https://x'
      })
    ).toBeNull()
  })
})
