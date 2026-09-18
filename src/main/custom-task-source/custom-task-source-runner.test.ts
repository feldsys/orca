import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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

  it('times out a hanging command', async () => {
    writeSource('setTimeout(() => {}, 60_000)')
    expect(await listCustomTaskItems('src', undefined, { configPath, timeoutMs: 300 })).toEqual({
      ok: false,
      error: 'Test timed out after 0.3 s'
    })
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
