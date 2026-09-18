import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CUSTOM_TASKS_IPC } from '../../shared/custom-task-source-types'

const { handlers, listCustomTaskItemsMock } = vi.hoisted(() => ({
  handlers: new Map<string, (event: unknown, args: unknown) => Promise<unknown>>(),
  listCustomTaskItemsMock: vi.fn()
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (event: unknown, args: unknown) => Promise<unknown>) =>
      handlers.set(channel, handler)
  }
}))

vi.mock('../custom-task-source/custom-task-source-runner', () => ({
  listCustomTaskItems: listCustomTaskItemsMock,
  listCustomTaskSources: vi.fn()
}))

import { registerCustomTaskSourceHandlers } from './custom-task-sources'

registerCustomTaskSourceHandlers()

function listItems(senderId: number, args: unknown): Promise<unknown> {
  const handler = handlers.get(CUSTOM_TASKS_IPC.listItems)
  if (!handler) {
    throw new Error('listItems handler not registered')
  }
  return handler({ sender: { id: senderId } }, args)
}

function signalOfCall(index: number): AbortSignal {
  return listCustomTaskItemsMock.mock.calls[index][2].signal
}

describe('customTasks:listItems', () => {
  beforeEach(() => {
    listCustomTaskItemsMock.mockReset()
  })

  it('rejects a blank source id without running anything', async () => {
    expect(await listItems(1, { sourceId: '  ' })).toEqual({
      ok: false,
      error: 'Task source is required.'
    })
    expect(listCustomTaskItemsMock).not.toHaveBeenCalled()
  })

  it('trims the source id and trims and caps the query', async () => {
    listCustomTaskItemsMock.mockResolvedValueOnce({ ok: true, items: [] })
    await listItems(1, { sourceId: ' src ', query: `  ${'q'.repeat(600)}  ` })
    expect(listCustomTaskItemsMock).toHaveBeenCalledWith('src', 'q'.repeat(500), {
      signal: expect.any(AbortSignal)
    })
  })

  it('aborts the superseded run of the same renderer only', async () => {
    listCustomTaskItemsMock.mockReturnValue(new Promise(() => {}))
    void listItems(1, { sourceId: 'src', query: 'a' })
    void listItems(2, { sourceId: 'src', query: 'a' })
    void listItems(1, { sourceId: 'src', query: 'ab' })
    await vi.waitFor(() => expect(listCustomTaskItemsMock).toHaveBeenCalledTimes(3))
    expect(signalOfCall(0).aborted).toBe(true)
    expect(signalOfCall(1).aborted).toBe(false)
    expect(signalOfCall(2).aborted).toBe(false)
  })
})
