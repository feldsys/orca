import { ArrowRight, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '../../task-page-source-context'
import type { CustomTaskItem } from '../../../../../shared/custom-task-source-types'

// Why: one grid for header and rows so the columns line up; Assignee hides below lg like Jira.
export const CUSTOM_TASK_GRID_CLASS =
  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 md:grid-cols-[90px_minmax(0,1fr)_128px_80px_64px] lg:grid-cols-[96px_minmax(0,1.25fr)_132px_136px_96px_64px] xl:grid-cols-[104px_minmax(0,1.45fr)_144px_160px_128px_72px]'

export function TaskPageCustomItemRow({
  item,
  onStart
}: {
  item: CustomTaskItem
  onStart: (item: CustomTaskItem) => void
}): React.JSX.Element {
  const unassigned = translate('auto.components.TaskPage.42a9160321', 'Unassigned')
  return (
    <div
      className={cn('group/row min-h-12 py-2 transition hover:bg-accent', CUSTOM_TASK_GRID_CLASS)}
    >
      <span className="block truncate font-mono text-[12px] text-muted-foreground max-md:!hidden">
        {item.id}
      </span>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground md:hidden">
            {item.id}
          </span>
          <h3 className="min-w-0 truncate text-[13px] font-medium text-foreground">{item.title}</h3>
        </div>
        {item.context ? (
          <div className="mt-1 truncate text-[11px] text-muted-foreground">{item.context}</div>
        ) : null}
      </div>

      <div className="flex min-w-0 max-md:!hidden">
        {item.status ? (
          <span className="inline-flex max-w-full items-center rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <span className="truncate">{item.status}</span>
          </span>
        ) : null}
      </div>

      <span className="block truncate text-[12px] text-muted-foreground max-lg:!hidden">
        {item.assignee ?? unassigned}
      </span>

      {item.updatedAt ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="block min-w-0 truncate text-[12px] text-muted-foreground max-md:!hidden">
              {formatRelativeTime(item.updatedAt)}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {new Date(item.updatedAt).toLocaleString()}
          </TooltipContent>
        </Tooltip>
      ) : (
        <span className="max-md:!hidden" />
      )}

      <div className="flex shrink-0 items-center justify-end gap-1 md:opacity-0 md:transition-opacity md:group-hover/row:opacity-100 md:group-focus-within/row:opacity-100">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onStart(item)}
              aria-label={translate(
                'auto.components.TaskPage.ff90d0abc7',
                'Start workspace from {{value0}}',
                { value0: item.id }
              )}
            >
              <ArrowRight className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {translate('auto.components.TaskPage.9497f2787c', 'Start workspace')}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => void window.api.shell.openUrl(item.url)}
              aria-label={translate('auto.components.TaskPage.c1d1600362', 'Open in browser')}
            >
              <ExternalLink className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {translate('auto.components.TaskPage.c1d1600362', 'Open in browser')}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
