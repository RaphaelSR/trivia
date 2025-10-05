import { useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { Button } from './Button'

type MultiSelectOption = {
  id: string
  label: string
  subtitle?: string
  badge?: string
  badgeColor?: string
  selected: boolean
}

type MultiSelectFieldProps = {
  title: string
  description: string
  options: MultiSelectOption[]
  onSelectionChange: (selectedIds: string[]) => void
  onSelectAll: () => void
  onSelectNone: () => void
  searchPlaceholder?: string
  emptyMessage?: string
  maxHeight?: string
}

export function MultiSelectField({
  title,
  description,
  options,
  onSelectionChange,
  onSelectAll,
  onSelectNone,
  searchPlaceholder = "Buscar...",
  emptyMessage = "Nenhum item encontrado",
  maxHeight = "max-h-80"
}: MultiSelectFieldProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    option.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedCount = options.filter(option => option.selected).length

  const handleToggleOption = (optionId: string) => {
    const newSelectedIds = options
      .filter(option => option.id === optionId ? !option.selected : option.selected)
      .map(option => option.id)
    onSelectionChange(newSelectedIds)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text)]">{title}</h3>
          <p className="text-sm text-[var(--color-muted)]">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-muted)]">
            {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-border)] transition-colors"
          >
            <ChevronDown 
              size={16} 
              className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] text-sm text-[var(--color-text)]"
              />
            </div>
            <Button variant="outline" size="sm" onClick={onSelectAll}>
              Todos
            </Button>
            <Button variant="outline" size="sm" onClick={onSelectNone}>
              Nenhum
            </Button>
          </div>

          <div className={`${maxHeight} overflow-y-auto space-y-2 border border-[var(--color-border)] rounded-xl p-3 bg-[var(--color-background)]`}>
            {filteredOptions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-[var(--color-muted)]">{emptyMessage}</p>
              </div>
            ) : (
              filteredOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-surface)] cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={option.selected}
                    onChange={() => handleToggleOption(option.id)}
                    className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--color-text)]">
                        {option.label}
                      </span>
                      {option.badge && (
                        <span 
                          className="text-xs px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: option.badgeColor || '#6B7280' }}
                        >
                          {option.badge}
                        </span>
                      )}
                    </div>
                    {option.subtitle && (
                      <p className="text-xs text-[var(--color-muted)] mt-1">
                        {option.subtitle}
                      </p>
                    )}
                  </div>
                  {option.selected && (
                    <Check size={16} className="text-[var(--color-primary)]" />
                  )}
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
