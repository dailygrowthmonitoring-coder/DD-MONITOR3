/**
 * Spinner — loading indicator.
 */

interface SpinnerProps {
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
}

/** Animated loading spinner. */
export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      className={`spinner${size === 'sm' ? ' sm' : size === 'lg' ? ' lg' : ''}${className ? ` ${className}` : ''}`}
      aria-label="Loading"
    />
  );
}
