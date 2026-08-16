import React, { ButtonHTMLAttributes, ReactElement, forwardRef } from 'react'

export type ButtonVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'ghost'
  | 'link'
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground hover:opacity-90',
  secondary: 'bg-secondary text-secondary-foreground hover:opacity-80',
  destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
  outline:
    'border border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
  ghost:
    'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
  link: 'bg-transparent text-primary underline-offset-4 hover:underline'
}

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-10 px-4 text-sm',
  sm: 'h-8 px-3 text-xs',
  lg: 'h-11 px-8 text-base',
  icon: 'h-10 w-10 p-0'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'default', size = 'default', className = '', ...props },
    ref
  ): ReactElement => (
    <button
      ref={ref}
      className={`inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  )
)

Button.displayName = 'Button'

export default Button
