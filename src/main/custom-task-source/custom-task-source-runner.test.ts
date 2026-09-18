import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listCustomTaskItems, listCustomTaskSources } from './custom-task-source-runner'

let dir: string
let configPath: string

function writeSource(script: string): void {
  const sources = [{ id: 'src', name: 'Test', command: process.execPath, args: ['-e', script] }]
  writeFileSync(configPath, JSON.stringify(sources))
}

function printJson(value: unknown): string {
  return `process.stdout.write(${JSON.stringify(JSON.stringify(value))})`
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error instanceof Error && 'code' in error && error.code === 'EPERM'
  }
}

async function waitForDeath(pidFile: string): Promise<void> {
  const pid = Number(readFileSync(pidFile, 'utf8'))
  await vi.waitFor(() => expect(isAlive(pid)).toBe(false), { timeout: 5_000 })
}

const item = { id: '1', title: 'Fix it', url: 'https://tracker.test/1' }

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'orca-custom-tasks-'))
  configPath = join(dir, 'task-sources.json')
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('listCustomTaskSources', () => {
  it('returns [] when the file is missing or empty', async () => {
    expect(await listCustomTaskSources({ configPath })).toEqual({ ok: true, sources: [] })
    writeFileSync(configPath, '\uFEFF  \n')
    expect(await listCustomTaskSources({ configPath })).toEqual({ ok: true, sources: [] })
  })

  it('returns only id and name, never the command', async () => {
    writeSource('')
    expect(await listCustomTaskSources({ configPath })).toEqual({
      ok: true,
      sources: [{ id: 'src', name: 'Test' }]
    })
  })

  it('reports invalid JSON and schema violations with the file path', async () => {
    writeFileSync(configPath, '[{')
    expect(await listCustomTaskSources({ configPath })).toEqual({
      ok: false,
      error: `${configPath} is not valid JSON`
    })
    writeFileSync(configPath, JSON.stringify([{ id: 'x', name: 'X' }]))
    const result = await listCustomTaskSources({ configPath })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain(`${configPath}: 0.command:`)
  })
})

describe('listCustomTaskItems', () => {
  it('returns the items the command prints, BOM stripped', async () => {
    writeSource(`process.stdout.write('\\uFEFF'); ${printJson({ items: [item] })}`)
    expect(await listCustomTaskItems('src', undefined, { configPath })).toEqual({
      ok: true,
      items: [item]
    })
  })

  it('passes the query as ORCA_TASK_QUERY', async () => {
    writeSource(
      `process.stdout.write(JSON.stringify({ items: [{ id: '1', title: process.env.ORCA_TASK_QUERY, url: 'https://t.test/1' }] }))`
    )
    const result = await listCustomTaskItems('src', 'needle', { configPath })
    expect(result.ok && result.items[0].title).toBe('needle')
  })

  it('rejects an unknown source id', async () => {
    writeSource('')
    expect(await listCustomTaskItems('nope', undefined, { configPath })).toEqual({
      ok: false,
      error: 'Unknown task source: nope'
    })
  })

  it('reports non-JSON output', async () => {
    writeSource(`process.stdout.write('WARNING: not json')`)
    expect(await listCustomTaskItems('src', undefined, { configPath })).toEqual({
      ok: false,
      error: 'Test did not print valid JSON'
    })
  })

  it('rejects non-http urls from the adapter', async () => {
    writeSource(printJson({ items: [{ ...item, url: 'file:///x' }] }))
    const result = await listCustomTaskItems('src', undefined, { configPath })
    expect(!result.ok && result.error).toMatch(/^Test printed invalid items: items\.0\.url: /)
  })

  it('includes stderr when the command exits non-zero', async () => {
    writeSource(`process.stderr.write('login failed'); process.exit(1)`)
    expect(await listCustomTaskItems('src', undefined, { configPath })).toEqual({
      ok: false,
      error: 'Test exited with code 1: login failed'
    })
  })

  it('times out and kills the whole process tree', async () => {
    const pidFile = join(dir, 'grandchild.pid')
    // Why detached on Windows: libuv puts node's children in a kill-on-close job, so a plain
    // grandchild would die with the root and hide an orphan that a pwsh adapter's child becomes.
    writeSource(
      `const c = require('child_process').spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30000)'], { stdio: 'ignore', detached: process.platform === 'win32' }); require('fs').writeFileSync(${JSON.stringify(pidFile)}, String(c.pid)); setTimeout(() => {}, 30000)`
    )
    expect(await listCustomTaskItems('src', undefined, { configPath, timeoutMs: 1000 })).toEqual({
      ok: false,
      error: 'Test timed out after 1 s'
    })
    await waitForDeath(pidFile)
  })

  it('resolves as cancelled and kills the command when aborted', async () => {
    const pidFile = join(dir, 'root.pid')
    writeSource(
      `require('fs').writeFileSync(${JSON.stringify(pidFile)}, String(process.pid)); setTimeout(() => {}, 30000)`
    )
    const controller = new AbortController()
    const run = listCustomTaskItems('src', undefined, {
      configPath,
      timeoutMs: 10_000,
      signal: controller.signal
    })
    await vi.waitFor(() => expect(existsSync(pidFile)).toBe(true), { timeout: 5_000 })
    controller.abort()
    expect(await run).toEqual({ ok: false, error: 'cancelled' })
    await waitForDeath(pidFile)
  })

  it('reports a missing command', async () => {
    const sources = [{ id: 'src', name: 'Test', command: 'orca-no-such-command-xyz' }]
    writeFileSync(configPath, JSON.stringify(sources))
    expect(await listCustomTaskItems('src', undefined, { configPath })).toEqual({
      ok: false,
      error: 'Command not found: orca-no-such-command-xyz'
    })
  })
})
