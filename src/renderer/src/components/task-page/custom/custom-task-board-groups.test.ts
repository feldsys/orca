import { describe, expect, it } from 'vitest'
import type { CustomTaskItem } from '../../../../../shared/custom-task-source-types'
import { groupCustomTaskItemsByColumn } from './custom-task-board-groups'

function task(id: string, status?: string): CustomTaskItem {
  return {
    id,
    title: `Task ${id}`,
    url: `https://tracker.test/${id}`,
    ...(status ? { status } : {})
  }
}

const ids = (groups: { title: string; items: CustomTaskItem[] }[]): [string, string[]][] =>
  groups.map((group) => [group.title, group.items.map((item) => item.id)])

describe('groupCustomTaskItemsByColumn', () => {
  it('keeps the column order and the adapter item order, empty columns included', () => {
    const items = [task('1', 'To do'), task('2', 'Done'), task('3', 'To do')]
    expect(ids(groupCustomTaskItemsByColumn(items, ['To do', 'Doing', 'Done'], 'Other'))).toEqual([
      ['To do', ['1', '3']],
      ['Doing', []],
      ['Done', ['2']]
    ])
  })

  it('collects unknown and missing statuses in a trailing Other column', () => {
    const items = [task('1', 'To do'), task('2', 'Archived'), task('3')]
    expect(ids(groupCustomTaskItemsByColumn(items, ['To do'], 'Other'))).toEqual([
      ['To do', ['1']],
      ['Other', ['2', '3']]
    ])
  })

  it('omits the Other column when every item matched', () => {
    expect(groupCustomTaskItemsByColumn([task('1', 'To do')], ['To do'], 'Other')).toHaveLength(1)
  })
})
