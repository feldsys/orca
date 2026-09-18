import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { z } from 'zod'
import { runProcess, type ProcessResult } from '../../shared/child-process/run-process'
import {
  CustomTaskListOutputSchema,
  CustomTaskSourcesFileSchema,
  type CustomTaskItem,
  type CustomTaskResult,
  type CustomTaskSourceConfig,
  type CustomTaskSourceSummary
} from '../../shared/custom-task-source-types'

const DEFAULT_TIMEOUT_MS = 30_000
const MAX_OUTPUT_BYTES = 10 * 1024 * 1024
const MAX_STDERR_CHARS = 500

export type CustomTaskRunnerOptions = {
  configPath?: string
  timeoutMs?: number
}

function getCustomTaskSourcesPath(): string {
  return join(homedir(), '.orca', 'task-sources.json')
}

// Why: Notepad and PowerShell 5 write UTF-8 with a BOM, which JSON.parse rejects.
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

function describeIssue(error: z.ZodError): string {
  const issue = error.issues[0]
  const path = issue?.path.map(String).join('.')
  return `${path ? `${path}: ` : ''}${issue?.message ?? 'invalid'}`
}

function errorCode(error: unknown): unknown {
  return error instanceof Error && 'code' in error ? error.code : undefined
}

// Why no cache: the file is hand-edited and read rarely, so re-reading keeps edits live.
async function readSources(
  configPath: string
): Promise<CustomTaskResult<{ sources: CustomTaskSourceConfig[] }>> {
  let text: string
  try {
    text = stripBom(await readFile(configPath, 'utf8'))
  } catch (error) {
    if (errorCode(error) === 'ENOENT') {
      return { ok: true, sources: [] }
    }
    return { ok: false, error: `Cannot read ${configPath}: ${String(error)}` }
  }
  if (!text.trim()) {
    return { ok: true, sources: [] }
  }
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: `${configPath} is not valid JSON` }
  }
  const parsed = CustomTaskSourcesFileSchema.safeParse(json)
  if (!parsed.success) {
    return { ok: false, error: `${configPath}: ${describeIssue(parsed.error)}` }
  }
  return { ok: true, sources: parsed.data }
}

export async function listCustomTaskSources(
  options: CustomTaskRunnerOptions = {}
): Promise<CustomTaskResult<{ sources: CustomTaskSourceSummary[] }>> {
  const loaded = await readSources(options.configPath ?? getCustomTaskSourcesPath())
  if (!loaded.ok) {
    return loaded
  }
  // Why: the renderer must never see the command line.
  return { ok: true, sources: loaded.sources.map(({ id, name }) => ({ id, name })) }
}

export async function listCustomTaskItems(
  sourceId: string,
  query: string | undefined,
  options: CustomTaskRunnerOptions = {}
): Promise<CustomTaskResult<{ items: CustomTaskItem[] }>> {
  const loaded = await readSources(options.configPath ?? getCustomTaskSourcesPath())
  if (!loaded.ok) {
    return loaded
  }
  const source = loaded.sources.find((candidate) => candidate.id === sourceId)
  if (!source) {
    return { ok: false, error: `Unknown task source: ${sourceId}` }
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  let result: ProcessResult
  try {
    result = await runProcess({
      program: source.command,
      args: source.args ?? [],
      env: { ...process.env, ORCA_TASK_QUERY: query ?? '' },
      timeoutMs,
      maxOutputBytes: MAX_OUTPUT_BYTES
    })
  } catch (error) {
    if (errorCode(error) === 'ENOENT') {
      return { ok: false, error: `Command not found: ${source.command}` }
    }
    return { ok: false, error: `${source.name} could not be started: ${String(error)}` }
  }

  if (result.timedOut) {
    return { ok: false, error: `${source.name} timed out after ${timeoutMs / 1000} s` }
  }
  if (result.code !== 0) {
    const stderr = result.stderr.trim().slice(0, MAX_STDERR_CHARS)
    const exit = result.code === null ? `signal ${result.signal}` : `code ${result.code}`
    return { ok: false, error: `${source.name} exited with ${exit}${stderr ? `: ${stderr}` : ''}` }
  }
  if (result.outputTruncated) {
    return { ok: false, error: `${source.name} printed more than 10 MB` }
  }

  let json: unknown
  try {
    json = JSON.parse(stripBom(result.stdout))
  } catch {
    return { ok: false, error: `${source.name} did not print valid JSON` }
  }
  const parsed = CustomTaskListOutputSchema.safeParse(json)
  if (!parsed.success) {
    return {
      ok: false,
      error: `${source.name} printed invalid items: ${describeIssue(parsed.error)}`
    }
  }
  return { ok: true, items: parsed.data.items }
}
