import { z } from 'zod'

// Why: generic command-based task source (stablyai/orca#8376). An external
// adapter prints this JSON on stdout, so Orca needs no per-tracker code.
// Sources are read from ~/.orca/task-sources.json.

export const CustomTaskSourceConfigSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  command: z.string().trim().min(1),
  args: z.array(z.string()).optional()
})

export const CustomTaskSourcesFileSchema = z.array(CustomTaskSourceConfigSchema)

// Why: adapter output is untrusted; only http(s) links may reach openUrl.
const HttpUrlSchema = z.url({ protocol: /^https?$/ })

export const CustomTaskItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: HttpUrlSchema,
  status: z.string().optional(),
  assignee: z.string().optional(),
  context: z.string().optional(),
  updatedAt: z.string().optional(),
  /** Agent prompt used when the item is started (e.g. `/mantisPRfix <url>`). */
  prompt: z.string().optional()
})

export const CustomTaskListOutputSchema = z.object({
  items: z.array(CustomTaskItemSchema),
  /** Board columns in display order, matched against item.status. Opts the
   *  source into the board layout; without it the list stays a flat table. */
  columns: z.array(z.string().trim().min(1)).optional()
})

export type CustomTaskSourceConfig = z.infer<typeof CustomTaskSourceConfigSchema>
export type CustomTaskItem = z.infer<typeof CustomTaskItemSchema>

/** What the renderer sees of a source — never the command line. */
export type CustomTaskSourceSummary = { id: string; name: string }

export type CustomTaskResult<T> = ({ ok: true } & T) | { ok: false; error: string }

export const CUSTOM_TASKS_IPC = {
  listSources: 'customTasks:listSources',
  listItems: 'customTasks:listItems'
} as const

export type CustomTasksApi = {
  listSources: () => Promise<CustomTaskResult<{ sources: CustomTaskSourceSummary[] }>>
  listItems: (args: {
    sourceId: string
    query?: string
  }) => Promise<CustomTaskResult<{ items: CustomTaskItem[]; columns?: string[] }>>
}
