import React, { ReactElement } from 'react'
import { useLocation } from 'react-router-dom'
import { Construction } from 'lucide-react'

const ComingSoon = (): ReactElement => {
  const { pathname } = useLocation()

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
      <Construction className="h-8 w-8 text-muted-foreground" />
      <h1 className="text-lg font-semibold text-foreground">
        Page not built yet
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        <code className="rounded bg-muted px-1.5 py-0.5">{pathname}</code> is
        wired up in the sidebar but has no content yet — this is where
        you&apos;d add it.
      </p>
    </div>
  )
}

export default ComingSoon
