import { cn } from "@/lib/utils"

/**
 * Base Skeleton Component
 * 
 * A simple pulsing placeholder for loading states.
 * Used as the foundation for all skeleton loader patterns.
 * 
 * @see https://ui.shadcn.com/docs/components/skeleton
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
