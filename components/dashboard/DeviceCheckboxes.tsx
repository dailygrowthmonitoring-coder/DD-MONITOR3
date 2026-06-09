'use client'

import type { DeviceOverviewItem } from '@/types/dashboard'
import { StatusDot } from '@/components/ui/StatusDot'

interface Props {
  devices: DeviceOverviewItem[]
  selected: string[]
  onChange: (ids: string[]) => void
  max?: number
}

export default function DeviceCheckboxes({ devices, selected, onChange, max = 5 }: Props) {
  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id))
    } else if (selected.length < max) {
      onChange([...selected, id])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {devices.map(device => {
        const checked = selected.includes(device.id)
        const disabled = !checked && selected.length >= max
        return (
          <button
            key={device.id}
            onClick={() => toggle(device.id)}
            disabled={disabled}
            className={[
              'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
              checked
                ? 'border-accent bg-accent/10 text-txt-primary'
                : 'border-app-border bg-app-card text-txt-muted hover:border-accent/50',
              disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            <StatusDot status={device.device_status} />
            <span className="font-mono">{device.hostname}</span>
            {device.location && (
              <span className="text-txt-muted text-xs">({device.location})</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
