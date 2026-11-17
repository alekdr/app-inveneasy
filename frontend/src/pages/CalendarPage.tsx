import EmptyState from '../components/EmptyState'
import { IoCalendarSharp as Calendar } from 'react-icons/io5'

export default function CalendarPage() {
  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-slate-800 dark:text-slate-100">
        Calendario
      </h2>
      <p className="mb-4 text-sm text-slate-500">Eventos, tareas y recordatorios</p>
      <EmptyState
        message="Próximamente: calendario con eventos y notificaciones"
        icon={<Calendar size={48} />}
      />
    </div>
  )
}
