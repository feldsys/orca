import { describe, expect, it } from 'vitest'
import { buildCustomTaskComposerArgs } from './custom-task-composer-args'

const item = {
  id: '1234',
  title: 'Fix login timeout',
  url: 'https://mantis.example.com/view.php?id=1234'
}

describe('buildCustomTaskComposerArgs', () => {
  it('links a numeric-id item and seeds name and prompt', () => {
    expect(
      buildCustomTaskComposerArgs({
        ...item,
        prompt: ' /mantisPRfix https://mantis.example.com/view.php?id=1234 '
      })
    ).toEqual({
      linkedWorkItem: {
        type: 'issue',
        provider: 'custom',
        number: 1234,
        title: '1234 Fix login timeout',
        url: item.url,
        customIdentifier: '1234'
      },
      prefilledName: '1234-fix-login-timeout',
      initialPrompt: '/mantisPRfix https://mantis.example.com/view.php?id=1234',
      telemetrySource: 'sidebar'
    })
  })

  it('uses 0 as the link number for non-integer ids', () => {
    for (const id of ['AB-12', '0x1A', '1e3', '12.5', '-3', '99999999999999999999']) {
      expect(buildCustomTaskComposerArgs({ ...item, id }).linkedWorkItem.number).toBe(0)
    }
  })

  it('omits a blank prompt', () => {
    expect(buildCustomTaskComposerArgs({ ...item, prompt: '  ' })).not.toHaveProperty(
      'initialPrompt'
    )
  })
})
