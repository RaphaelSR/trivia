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
  primary: 'bg-[var(--color-primary)] text-[var(--color-background)] hover:bg-[color-mix(in_srgb,var(--color-primary)_90%,var(--color-background)_10%)] focus-visible:ring-[var(--color-primary)] shadow-lg hover:shadow-xl hover:shadow-[var(--color-primary)]/25',
  secondary: 'bg-[var(--color-secondary)] text-[var(--color-text)] hover:bg-[color-mix(in_srgb,var(--color-secondary)_88%,var(--color-background)_12%)] focus-visible:ring-[var(--color-secondary)] shadow-md hover:shadow-lg hover:shadow-[var(--color-secondary)]/25',
  outline: 'border border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:ring-[var(--color-primary)] hover:bg-[var(--color-primary)]/5',
  ghost: 'text-[var(--color-muted)] hover:bg-[var(--color-surface)] focus-visible:ring-[var(--color-primary)] hover:text-[var(--color-text)]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-7 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-5 text-sm',
  icon: 'h-9 w-9 p-0 text-sm',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', disabled, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-200 active:scale-[0.97] relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={twMerge(clsx(baseClasses, variantClasses[variant], sizeClasses[size], className))}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'
