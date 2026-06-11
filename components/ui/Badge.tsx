/**
 * Badge — colored status/severity label.
 * Uses the .bd CSS class with ok | wa | cr | in | gr | ac variants.
 */

export type BadgeVariant = 'ok' | 'wa' | 'cr' | 'in' | 'gr' | 'ac';

interface BadgeProps {
  readonly variant: BadgeVariant;
  readonly children: React.ReactNode;
  readonly className?: string;
}

/** Renders a color-coded status badge. */
export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span className={`bd ${variant}${className ? ` ${className}` : ''}`}>
      {children}
    </span>
  );
}
