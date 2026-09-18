import { ipcMain } from 'electron'
import { CUSTOM_TASKS_IPC } from '../../shared/custom-task-source-types'
import {
  listCustomTaskItems,
  listCustomTaskSources
} from '../custom-task-source/custom-task-source-runner'

const MAX_QUERY_LENGTH = 500

/** Registers the `customTasks:*` IPC handlers on the main process. */
export function registerCustomTaskSourceHandlers(): void {
  ipcMain.handle(CUSTOM_TASKS_IPC.listSources, async () => listCustomTaskSources())

  ipcMain.handle(
    CUSTOM_TASKS_IPC.listItems,
    async (_event, args: { sourceId: string; query?: string }) => {
      if (typeof args?.sourceId !== 'string' || !args.sourceId.trim()) {
        return { ok: false, error: 'Task source is required.' }
      }
      const query =
        typeof args.query === 'string' ? args.query.trim().slice(0, MAX_QUERY_LENGTH) : undefined
      return listCustomTaskItems(args.sourceId.trim(), query)
    }
  )
}
