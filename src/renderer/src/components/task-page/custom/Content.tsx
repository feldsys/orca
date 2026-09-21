import { useEffect, useState } from 'react'
import { AlertCircle, ListTodo, LoaderCircle, RefreshCw } from 'lucide-react'
import type { TaskPageComposerActionsModel } from '../../use-task-page-composer-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import type { CustomTaskItem } from '../../../../../shared/custom-task-source-types'
import { CUSTOM_TASK_GRID_CLASS, TaskPageCustomItemRow } from './ItemRow'
import { TaskPageCustomBoard } from './Board'

const SEARCH_DEBOUNCE_MS = 300
const SOURCES_FILE = '~/.orca/task-sources.json'
const SOURCES_EXAMPLE =
  '[{"id":"mantis","name":"Mantis","command":"pwsh","args":["-NoProfile","-File","C:/…/mantis.ps1"]}]'

type ItemsLoad = {
  /** Source the items belong to, so a source switch never shows the previous list. */
  sourceId: string | null
  items: CustomTaskItem[]
  /** Non-empty when the adapter opted into the board layout. */
  columns: string[]
  loading: boolean
  error: string | null
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function CenteredState({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="mt-4 flex flex-col items-center justify-center rounded-md border border-border/50 bg-muted/50 px-6 py-14 text-center shadow-sm">
      {children}
    </div>
  )
}

export function TaskPageCustomContent({
  model
}: {
  model: TaskPageComposerActionsModel
}): React.JSX.Element {
  const { customTaskSourceState, handleUseCustomItem } = model
  const {
    customTaskSources: sources,
    customTaskSourcesError,
    selectedCustomTaskSource: source,
    reloadCustomTaskSources
  } = customTaskSourceState
  const sourceId = source?.id ?? null
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [load, setLoad] = useState<ItemsLoad>({
    sourceId: null,
    items: [],
    columns: [],
    loading: false,
    error: null
  })

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (!sourceId) {
      return
    }
    // Why: adapters can be slow; a newer source/query/refresh must win over a late older response.
    let stale = false
    setLoad((current) => ({ ...current, loading: true, error: null }))
    window.api.customTasks.listItems({ sourceId, ...(query ? { query } : {}) }).then(
      (result) => {
        if (!stale) {
          setLoad(
            result.ok
              ? {
                  sourceId,
                  items: result.items,
                  columns: result.columns ?? [],
                  loading: false,
                  error: null
                }
              : { sourceId, items: [], columns: [], loading: false, error: result.error }
          )
        }
      },
      (error: unknown) => {
        if (!stale) {
          setLoad({
            sourceId,
            items: [],
            columns: [],
            loading: false,
            error: errorMessage(error)
          })
        }
      }
    )
    return () => {
      stale = true
    }
  }, [sourceId, query, refreshNonce])

  if (!sources) {
    return (
      <div className="mt-4 flex items-center justify-center py-14">
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (customTaskSourcesError || !source) {
    return (
      <CenteredState>
        <ListTodo className="mb-4 size-8 text-muted-foreground/60" />
        <p className="text-base font-medium text-foreground">
          {customTaskSourcesError
            ? translate(
                'auto.components.TaskPage.customSourcesLoadFailed',
                'Couldn’t load custom task sources'
              )
            : translate(
                'auto.components.TaskPage.customSourcesEmpty',
                'No custom task sources configured'
              )}
        </p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {customTaskSourcesError ??
            translate(
              'auto.components.TaskPage.customSourcesHint',
              'Add commands that print task JSON to {{value0}}, for example:',
              { value0: SOURCES_FILE }
            )}
        </p>
        {customTaskSourcesError ? null : (
          <code className="mt-3 max-w-full overflow-x-auto rounded-md border border-border/50 bg-background px-2 py-1.5 text-left font-mono text-xs text-foreground">
            {SOURCES_EXAMPLE}
          </code>
        )}
        <Button variant="outline" className="mt-5" onClick={reloadCustomTaskSources}>
          {translate('auto.components.TaskPage.0bfbf62f75', 'Retry')}
        </Button>
      </CenteredState>
    )
  }

  const items = load.sourceId === sourceId ? load.items : []
  const loading = load.loading || load.sourceId !== sourceId
  const refresh = (): void => setRefreshNonce((n) => n + 1)
  // Why: an adapter that prints `columns` gets the board; everything else stays a table.
  const boardColumns = load.sourceId === sourceId ? load.columns : []
  const states = (
    <>
      {load.error && load.sourceId === sourceId ? (
        <div className="flex flex-none items-start gap-2 border-b border-border bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 flex-none" />
          <div className="min-w-0 flex-1 whitespace-pre-wrap break-words">{load.error}</div>
          <Button variant="outline" size="xs" onClick={refresh} disabled={loading}>
            {translate('auto.components.TaskPage.0bfbf62f75', 'Retry')}
          </Button>
        </div>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="flex-none divide-y divide-border/50">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-3 py-3">
              <div className="h-4 w-4/5 animate-pulse rounded bg-muted/70" />
              <div className="mt-2 h-3 w-3/5 animate-pulse rounded bg-muted/60" />
            </div>
          ))}
        </div>
      ) : null}

      {!loading && items.length === 0 && !load.error ? (
        <div className="flex-none px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">
            {translate('auto.components.TaskPage.customNoItems', 'No tasks found')}
          </p>
          {query ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {translate(
                'auto.components.TaskPage.customNoItemsForQuery',
                'Try a different search.'
              )}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  )
  return (
    <div className="mt-2 flex min-h-0 max-h-full flex-col">
      <div className="flex-none rounded-md rounded-b-none border border-border/50 bg-muted/50 px-3 py-2 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Why: type="search" brings the native clear button, so no custom X is needed. */}
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={translate(
              'auto.components.TaskPage.customSearchPlaceholder',
              'Search {{value0}}',
              { value0: source.name }
            )}
            className="h-8 flex-1"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={refresh}
                disabled={loading}
                aria-label={translate(
                  'auto.components.TaskPage.customRefresh',
                  'Refresh {{value0}}',
                  { value0: source.name }
                )}
              >
                {loading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {translate('auto.components.TaskPage.customRefresh', 'Refresh {{value0}}', {
                value0: source.name
              })}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div
        className={cn(
          'flex min-h-0 flex-col overflow-hidden rounded-md rounded-t-none border border-t-0 border-border/50 bg-background shadow-sm',
          // Why: the board's columns scroll on their own, so the card must own the height.
          boardColumns.length > 0 && 'flex-1'
        )}
      >
        <div className="flex h-10 flex-none items-center justify-between gap-3 border-b border-border/50 bg-muted/35 px-3">
          <div className="min-w-0 truncate text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {source.name}
          </div>
          <div className="shrink-0 text-[11px] text-muted-foreground">
            {items.length} {translate('auto.components.TaskPage.b7bae28b6a', 'shown')}
          </div>
        </div>

        {boardColumns.length > 0 ? (
          <>
            {states}
            <TaskPageCustomBoard
              items={items}
              columns={boardColumns}
              onStart={handleUseCustomItem}
            />
          </>
        ) : (
          <>
            <div
              className={cn(
                'h-8 flex-none border-b border-border/50 bg-muted/25 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground max-md:!hidden',
                CUSTOM_TASK_GRID_CLASS
              )}
            >
              <span>{translate('auto.components.TaskPage.eb10c32872', 'ID')}</span>
              <span>{translate('auto.components.TaskPage.16cba35bee', 'Title')}</span>
              <span>{translate('auto.components.TaskPage.154b0fa623', 'Status')}</span>
              <span className="max-lg:!hidden">
                {translate('auto.components.TaskPage.d2a876ca53', 'Assignee')}
              </span>
              <span>{translate('auto.components.TaskPage.f362667d55', 'Updated')}</span>
              <span />
            </div>

            <div
              className="min-h-0 flex-1 overflow-y-auto scrollbar-sleek"
              style={{ scrollbarGutter: 'stable' }}
            >
              {states}

              <div className="divide-y divide-border/50">
                {items.map((item) => (
                  <TaskPageCustomItemRow key={item.id} item={item} onStart={handleUseCustomItem} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
