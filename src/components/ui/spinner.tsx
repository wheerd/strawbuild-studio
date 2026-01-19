import { cn } from '@/lib/utils'

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'base' | 'lg'
}

const sizeClasses = {
  sm: 'h-4 w-4',
  base: 'h-5 w-5',
  lg: 'h-6 w-6'
}

export function Spinner({ className, size = 'base', ...props }: SpinnerProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-current border-t-transparent',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}
