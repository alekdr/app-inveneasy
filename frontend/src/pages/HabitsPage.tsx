import EmptyState from '../components/EmptyState'
import { IoCheckboxSharp as CheckSquare } from 'react-icons/io5'

export default function HabitsPage() {
  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-slate-800 dark:text-slate-100">
        Hábitos
      </h2>
      <p className="mb-4 text-sm text-slate-500">Crea hábitos y mide tu racha</p>
      <EmptyState
        message="Próximamente: crea hábitos, márcalos y ve tu progreso"
        icon={<CheckSquare size={48} />}
      />
    </div>
  )
}
