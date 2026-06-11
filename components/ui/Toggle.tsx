'use client';

/**
 * Toggle — on/off switch component.
 */

interface ToggleProps {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
  readonly label?: string;
}

/** Renders a pill-shaped on/off toggle. */
export function Toggle({ checked, onChange, disabled, label }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`tog${checked ? ' on' : ''}`}
      style={{ border: 'none', outline: 'none', padding: 0 }}
    >
      <div className="tog-track" />
      <div className="tog-thumb" />
    </button>
  );
}
