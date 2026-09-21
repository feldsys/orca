import { translate } from '@/i18n/i18n'
import type { CustomTaskItem } from '../../../../../shared/custom-task-source-types'
import { groupCustomTaskItemsByColumn, type CustomTaskBoardGroup } from './custom-task-board-groups'
import { TaskPageCustomItemActions } from './ItemRow'

type OnStart = (item: CustomTaskItem) => void

function BoardCard({ item, onStart }: { item: CustomTaskItem; onStart: OnStart }) {
  return (
    <article className="group/card rounded-md border border-border/50 bg-card px-2.5 py-2 shadow-xs transition hover:bg-accent">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
          {item.id}
        </span>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/card:opacity-100 group-focus-within/card:opacity-100">
          <TaskPageCustomItemActions item={item} onStart={onStart} />
        </div>
      </div>
      <h3 className="mt-0.5 line-clamp-3 break-words text-[13px] font-medium leading-snug text-foreground">
        {item.title}
      </h3>
      {item.context || item.assignee ? (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {item.context ? <span className="min-w-0 truncate">{item.context}</span> : null}
          {item.context && item.assignee ? <span className="flex-none">·</span> : null}
          {item.assignee ? <span className="min-w-0 truncate">{item.assignee}</span> : null}
        </div>
      ) : null}
    </article>
  )
}

function BoardColumn({ group, onStart }: { group: CustomTaskBoardGroup; onStart: OnStart }) {
  return (
    <section className="flex h-full w-[300px] flex-none flex-col overflow-hidden rounded-md border border-border/50 bg-muted/30">
      <div className="flex h-9 flex-none items-center justify-between gap-2 border-b border-border/50 px-2.5">
        <h2 className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {group.title}
        </h2>
        <span className="flex-none tabular-nums text-[11px] text-muted-foreground">
          {group.items.length}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 scrollbar-sleek">
        {group.items.map((item) => (
          <BoardCard key={item.id} item={item} onStart={onStart} />
        ))}
      </div>
    </section>
  )
}

export function TaskPageCustomBoard({
  items,
  columns,
  onStart
}: {
  items: CustomTaskItem[]
  columns: string[]
  onStart: OnStart
}): React.JSX.Element {
  const groups = groupCustomTaskItemsByColumn(
    items,
    columns,
    translate('auto.components.TaskPage.customBoardOther', 'Other')
  )
  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-3">
      {groups.map((group) => (
        <BoardColumn key={group.title} group={group} onStart={onStart} />
      ))}
    </div>
  )
}
