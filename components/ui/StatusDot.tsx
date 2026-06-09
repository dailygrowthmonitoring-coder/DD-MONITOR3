import type { DeviceStatus } from '@/types/dashboard'

interface StatusDotProps {
  status: DeviceStatus
  size?: 'sm' | 'md'
}

const COLOR: Record<DeviceStatus, string> = {
  healthy:  '#00C853',
  warning:  '#F5A623',
  critical: '#FF4444',
  unknown:  '#6B6B80',
}

export function StatusDot({ status, size = 'md' }: StatusDotProps) {
  const dim = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'
  return (
    <span
      className={`${dim} rounded-full flex-shrink-0 inline-block`}
      style={{ backgroundColor: COLOR[status] }}
      aria-label={`Status: ${status}`}
      role="img"
    />
  )
}
