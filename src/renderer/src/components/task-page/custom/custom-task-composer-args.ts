import type { LinkedWorkItemSummary } from '@/lib/new-workspace'
import type { CustomTaskItem } from '../../../../../shared/custom-task-source-types'
import {
  getLinkedWorkItemSuggestedName,
  getLinkedWorkItemWorkspaceName
} from '../../../../../shared/workspace-name'

export type CustomTaskComposerArgs = {
  linkedWorkItem: LinkedWorkItemSummary
  prefilledName: string
  initialPrompt?: string
  telemetrySource: 'sidebar'
}

// Why: adapter ids are free text (e.g. "1234", "AB-12", a Planner GUID);
// only a plain positive integer may become the numeric link number.
function getCustomTaskLinkNumber(id: string): number {
  const number = /^\d+$/.test(id) ? Number(id) : 0
  return Number.isSafeInteger(number) ? number : 0
}

export function buildCustomTaskComposerArgs(item: CustomTaskItem): CustomTaskComposerArgs {
  const linkedWorkItem: LinkedWorkItemSummary = {
    type: 'issue',
    provider: 'custom',
    number: getCustomTaskLinkNumber(item.id),
    title: `${item.id} ${item.title}`,
    url: item.url,
    customIdentifier: item.id
  }
  // Why: same seed the composer derives for the linked item, so the name stays auto-managed (like Jira).
  const prefilledName =
    getLinkedWorkItemWorkspaceName({
      type: linkedWorkItem.type,
      number: linkedWorkItem.number,
      title: linkedWorkItem.title
    })?.seedName ?? getLinkedWorkItemSuggestedName(linkedWorkItem)
  const initialPrompt = item.prompt?.trim()
  return {
    linkedWorkItem,
    prefilledName,
    ...(initialPrompt ? { initialPrompt } : {}),
    telemetrySource: 'sidebar'
  }
}
