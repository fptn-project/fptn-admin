import { ReactElement } from 'react'
import { Loader2 } from 'lucide-react'

export interface SpinnerProps {
  className?: string
}

const Spinner = ({ className = 'h-4 w-4' }: SpinnerProps): ReactElement => (
  <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />
)

export default Spinner
