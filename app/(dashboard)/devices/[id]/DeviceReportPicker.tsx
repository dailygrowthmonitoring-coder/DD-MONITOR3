'use client';

import { useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';

interface Props {
  readonly deviceId:   string;
  readonly currentDate: string;
}

export function DeviceReportPicker({ deviceId, currentDate }: Props) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const date = e.target.value;
    if (date) router.push(`/devices/${deviceId}?date=${date}`);
  }

  return (
    <label style={{
      display:     'flex',
      alignItems:  'center',
      gap:         6,
      cursor:      'pointer',
      background:  'var(--bg3)',
      border:      '1px solid var(--line)',
      borderRadius:'var(--r)',
      padding:     '5px 10px',
    }}>
      <CalendarDays size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
      <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11.5, color: 'var(--sub)' }}>
        Report:
      </span>
      <input
        type="date"
        value={currentDate}
        onChange={handleChange}
        style={{
          background:  'transparent',
          border:      'none',
          outline:     'none',
          color:       'var(--text2)',
          fontFamily:  'var(--font-geist-mono)',
          fontSize:    12,
          cursor:      'pointer',
        }}
      />
    </label>
  );
}
