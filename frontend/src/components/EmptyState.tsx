interface EmptyStateProps {
  message?: string
  icon?: React.ReactNode
}

export default function EmptyState({
  message = 'No tienes elementos aún',
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-slate-300 dark:text-slate-600">{icon}</div>}
      <p className="text-sm text-slate-400 dark:text-slate-500">{message}</p>
    </div>
  )
}
