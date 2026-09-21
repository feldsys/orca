import type { CustomTaskItem } from '../../../../../shared/custom-task-source-types'

export type CustomTaskBoardGroup = { title: string; items: CustomTaskItem[] }

/**
 * Groups items into the adapter's columns (matched on `item.status`, order kept).
 * Items with no status or an unknown one land in a trailing `otherTitle` column,
 * which is omitted when empty. Item order inside a column is the adapter's.
 */
export function groupCustomTaskItemsByColumn(
  items: CustomTaskItem[],
  columns: string[],
  otherTitle: string
): CustomTaskBoardGroup[] {
  const groups: CustomTaskBoardGroup[] = columns.map((title) => ({ title, items: [] }))
  const byStatus = new Map(groups.map((group) => [group.title, group]))
  const other: CustomTaskItem[] = []
  for (const item of items) {
    const group = item.status === undefined ? undefined : byStatus.get(item.status)
    ;(group?.items ?? other).push(item)
  }
  return other.length > 0 ? [...groups, { title: otherTitle, items: other }] : groups
}
