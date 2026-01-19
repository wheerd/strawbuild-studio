import { cn } from '@/lib/utils'

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: '1' | '2' | '3' | 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  '1': 'h-4 w-4',
  '2': 'h-5 w-5',
  '3': 'h-6 w-6',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6'
}

export function Spinner({ className, size = '2', ...props }: SpinnerProps) {
  return (
    <div
      className={cn('animate-spin rounded-full border-2 border-current border-t-transparent', sizeClasses[size], className)}
      {...props}
    />
  )
}
