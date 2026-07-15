import type { ReactNode } from 'react'

type ScreenCardProps = {
  eyebrow: string
  title: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function ScreenCard({
  eyebrow,
  title,
  children,
  footer,
  className = '',
}: ScreenCardProps) {
  return (
    <section className={`screen-card ${className}`.trim()}>
      <header className="screen-card__header">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </header>
      <div className="screen-card__body">{children}</div>
      {footer && <footer className="screen-card__footer">{footer}</footer>}
    </section>
  )
}
