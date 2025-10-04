import clsx from 'clsx'
import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--color-primary)] text-white hover:bg-[color-mix(in_srgb,var(--color-primary)_90%,white_10%)] focus-visible:ring-[var(--color-primary)]',
  secondary: 'bg-[var(--color-secondary)] text-slate-900 hover:bg-[color-mix(in_srgb,var(--color-secondary)_88%,white_12%)] focus-visible:ring-[var(--color-secondary)]',
  outline: 'border border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:ring-[var(--color-primary)]',
  ghost: 'text-[var(--color-muted)] hover:bg-[var(--color-surface)] focus-visible:ring-[var(--color-primary)]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-11 w-11 p-0 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-colors duration-200'
    return (
      <button
        ref={ref}
        type={type}
        className={twMerge(clsx(baseClasses, variantClasses[variant], sizeClasses[size], className))}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'
