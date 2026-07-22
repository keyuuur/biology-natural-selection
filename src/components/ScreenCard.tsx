import type { ReactNode } from 'react'

type ScreenCardProps = {
  eyebrow: string
  title: string
  children: ReactNode
  footer?: ReactNode
  className?: string
  headingId?: string
  stageHeading?: boolean
}

export function ScreenCard({
  eyebrow,
  title,
  children,
  footer,
  className = '',
  headingId,
  stageHeading = true,
}: ScreenCardProps) {
  return (
    <section className={`screen-card ${className}`.trim()}>
      <header className="screen-card__header">
        <p className="eyebrow">{eyebrow}</p>
        <h2
          data-stage-heading={stageHeading ? '' : undefined}
          id={headingId}
          tabIndex={stageHeading ? -1 : undefined}
        >
          {title}
        </h2>
      </header>
      <div className="screen-card__body">{children}</div>
      {footer && <footer className="screen-card__footer">{footer}</footer>}
    </section>
  )
}
