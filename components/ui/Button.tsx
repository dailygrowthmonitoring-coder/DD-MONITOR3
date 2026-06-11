/**
 * Button — styled action button with primary, default, and ghost variants.
 */

import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: 'default' | 'primary' | 'ghost';
  readonly size?: 'sm' | 'md';
  readonly children: React.ReactNode;
}

/** Renders a styled button. variant: default | primary | ghost. */
export function Button({
  variant = 'default',
  size,
  children,
  className,
  ...props
}: ButtonProps) {
  const variantClass = variant === 'primary' ? 'p' : variant === 'ghost' ? 'ghost' : '';
  const sizeStyle = size === 'sm' ? { fontSize: '11px', padding: '3px 8px' } : undefined;

  return (
    <button
      className={`btn${variantClass ? ` ${variantClass}` : ''}${className ? ` ${className}` : ''}`}
      style={sizeStyle}
      {...props}
    >
      {children}
    </button>
  );
}
