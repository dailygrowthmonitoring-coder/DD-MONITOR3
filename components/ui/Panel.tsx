/**
 * Panel — surface container with an optional header row.
 */

interface PanelProps {
  readonly title?: string;
  readonly meta?: React.ReactNode;
  readonly actions?: React.ReactNode;
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly noPadding?: boolean;
  readonly style?: React.CSSProperties;
}

/** Renders a .panel surface with optional header. */
export function Panel({
  title,
  meta,
  actions,
  children,
  className,
  noPadding = false,
  style,
}: PanelProps) {
  return (
    <div className={`panel${className ? ` ${className}` : ''}`} style={style}>
      {(title !== undefined || meta !== undefined || actions !== undefined) && (
        <div className="panel-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {title && <span className="panel-title">{title}</span>}
            {meta && <span className="panel-meta">{meta}</span>}
          </div>
          {actions && <div style={{ display: 'flex', gap: 6 }}>{actions}</div>}
        </div>
      )}
      {noPadding ? children : <div className="panel-body">{children}</div>}
    </div>
  );
}
