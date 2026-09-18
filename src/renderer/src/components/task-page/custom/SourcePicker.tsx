import type { TaskPageComposerActionsModel } from '../../use-task-page-composer-actions'
import { translate } from '@/i18n/i18n'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

export function TaskPageCustomSourcePicker({
  model
}: {
  model: TaskPageComposerActionsModel
}): React.JSX.Element | null {
  const { customTaskSources, selectedCustomTaskSource, setSelectedCustomTaskSourceId } =
    model.customTaskSourceState
  // Why: like the Jira site picker, a single source needs no picker; the header already names it.
  if (!customTaskSources || customTaskSources.length < 2) {
    return null
  }
  return (
    <Select value={selectedCustomTaskSource?.id} onValueChange={setSelectedCustomTaskSourceId}>
      <SelectTrigger
        size="sm"
        aria-label={translate('auto.components.TaskPage.customSourcePicker', 'Task source')}
        className="w-[220px]"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {customTaskSources.map((source) => (
          <SelectItem key={source.id} value={source.id}>
            {source.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
