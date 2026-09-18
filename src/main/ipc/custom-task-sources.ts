import { ipcMain } from 'electron'
import { CUSTOM_TASKS_IPC } from '../../shared/custom-task-source-types'
import {
  listCustomTaskItems,
  listCustomTaskSources
} from '../custom-task-source/custom-task-source-runner'
import { JiraCancellableRequests } from './jira-cancellable-requests'

const MAX_QUERY_LENGTH = 500
// Why: keyed by renderer, so each search keystroke kills the previous (slow) adapter run.
const listItemsRuns = new JiraCancellableRequests()

/** Registers the `customTasks:*` IPC handlers on the main process. */
export function registerCustomTaskSourceHandlers(): void {
  ipcMain.handle(CUSTOM_TASKS_IPC.listSources, async () => listCustomTaskSources())

  ipcMain.handle(
    CUSTOM_TASKS_IPC.listItems,
    async (event, args: { sourceId: string; query?: string }) => {
      if (typeof args?.sourceId !== 'string' || !args.sourceId.trim()) {
        return { ok: false, error: 'Task source is required.' }
      }
      const sourceId = args.sourceId.trim()
      const query =
        typeof args.query === 'string' ? args.query.trim().slice(0, MAX_QUERY_LENGTH) : undefined
      return listItemsRuns.run(String(event.sender.id), (signal) =>
        listCustomTaskItems(sourceId, query, { signal })
      )
    }
  )
}
