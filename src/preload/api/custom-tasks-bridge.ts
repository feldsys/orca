import { ipcRenderer } from 'electron'
import { CUSTOM_TASKS_IPC } from '../../shared/custom-task-source-types'
import type { PreloadApi } from '../api-types'

export const customTasksApi = {
  listSources: () => ipcRenderer.invoke(CUSTOM_TASKS_IPC.listSources),
  listItems: (args: { sourceId: string; query?: string }) =>
    ipcRenderer.invoke(CUSTOM_TASKS_IPC.listItems, args)
} satisfies PreloadApi['customTasks']
