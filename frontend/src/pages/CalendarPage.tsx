import { useState, useEffect } from 'react'
import {
  IoChevronBackSharp as Prev,
  IoChevronForwardSharp as Next,
  IoAddSharp as Add,
  IoCloseCircleSharp as CloseCircle,
  IoTrashSharp as Trash,
  IoCheckmarkSharp as Check,
  IoTimeOutline as TimeIcon,
} from 'react-icons/io5'
import {
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '../services/supabase'
import CustomTimePicker from '../components/CustomTimePicker'
import { triggerHaptic } from '../services/capacitor'
import { toast } from 'sonner'
import type { CalendarEvent, CalendarEventType } from '../types'

// Colores según el tipo de evento especificado en el README
const eventTypeColors: Record<CalendarEventType, { badge: string; dot: string; text: string }> = {
  Evento: { badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300', dot: 'bg-blue-500', text: 'text-blue-600' },
  Recordatorio: { badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', dot: 'bg-amber-500', text: 'text-amber-600' },
  Tarea: { badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300', dot: 'bg-emerald-500', text: 'text-emerald-600' },
  Urgente: { badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300', dot: 'bg-rose-500', text: 'text-rose-600' },
  Importante: { badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300', dot: 'bg-purple-500', text: 'text-purple-600' },
  Meta: { badge: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300', dot: 'bg-teal-500', text: 'text-teal-600' },
  Idea: { badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300', dot: 'bg-indigo-500', text: 'text-indigo-600' },
}

const DAYS_NAMES = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export default function CalendarPage() {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()) // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Modal Crear Evento
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [eventType, setEventType] = useState<CalendarEventType>('Recordatorio')
  const [saving, setSaving] = useState(false)

  // Cargar eventos del mes
  const loadMonthEvents = async () => {
    setLoading(true)
    try {
      const firstDay = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`
      const lastDayNum = new Date(currentYear, currentMonth + 1, 0).getDate()
      const lastDay = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${lastDayNum.toString().padStart(2, '0')}`

      const data = await fetchCalendarEvents(firstDay, lastDay)
      setEvents(data || [])
    } catch {
      toast.error('Error al cargar eventos del calendario')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMonthEvents()
  }, [currentYear, currentMonth])

  // Navegación de mes
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const handleGoToday = () => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
    setSelectedDate(todayStr)
  }

  // Generación de la cuadrícula de días (estilo lunes a domingo como en la imagen)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  // getDay() retorna 0 para domingo, lo ajustamos para que 0 sea Lunes
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1
  if (startingDayOfWeek === -1) startingDayOfWeek = 6

  const daysGrid: (number | null)[] = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    daysGrid.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysGrid.push(d)
  }

  // Eventos de la fecha seleccionada
  const selectedDayEvents = events.filter((e) => e.event_date === selectedDate)

  // Guardar nuevo evento
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    try {
      await createCalendarEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        event_date: selectedDate,
        event_time: eventTime || undefined,
        event_type: eventType,
      })
      await triggerHaptic()
      toast.success('Evento agregado a la agenda')
      setIsModalOpen(false)
      setTitle('')
      setDescription('')
      setEventTime('')
      await loadMonthEvents()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // Toggle completar evento
  const handleToggleComplete = async (event: CalendarEvent) => {
    try {
      await triggerHaptic()
      const nextStatus = !event.is_completed
      await updateCalendarEvent(event.id, { is_completed: nextStatus })
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, is_completed: nextStatus } : e))
      )
    } catch {
      toast.error('Error al actualizar')
    }
  }

  // Eliminar evento
  const handleDeleteEvent = async (id: string) => {
    if (!confirm('¿Eliminar este evento de la agenda?')) return
    try {
      await deleteCalendarEvent(id)
      await triggerHaptic()
      toast.success('Evento eliminado')
      setEvents((prev) => prev.filter((e) => e.id !== id))
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Layout Principal inspirado fielmente en la imagen: Cuadrícula izquierda + Agenda Diaria derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ========================================================= */}
        {/* PANEL IZQUIERDO: Calendario Mensual                       */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          
          {/* Header del Calendario: Mes, Año y Controles */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              <p className="text-xs text-slate-400 font-medium">Gestiona tus eventos y notas diarias</p>
            </div>

            {/* Controles: < HOY > */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-800/80">
              <button
                onClick={handlePrevMonth}
                title="Mes anterior"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-white hover:text-slate-800 shadow-2xs transition dark:text-slate-400 dark:hover:bg-slate-700"
              >
                <Prev size={16} />
              </button>
              <button
                onClick={handleGoToday}
                className="rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-white shadow-2xs transition dark:text-slate-300 dark:hover:bg-slate-700"
              >
                HOY
              </button>
              <button
                onClick={handleNextMonth}
                title="Mes siguiente"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-white hover:text-slate-800 shadow-2xs transition dark:text-slate-400 dark:hover:bg-slate-700"
              >
                <Next size={16} />
              </button>
            </div>
          </div>

          {/* Días de la semana (LUN, MAR, MIÉ...) */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAYS_NAMES.map((name) => (
              <span
                key={name}
                className="py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400"
              >
                {name}
              </span>
            ))}
          </div>

          {/* Cuadrícula de fechas */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5 select-none">
              {daysGrid.map((dayNum, idx) => {
                if (dayNum === null) {
                  return <div key={`empty-${idx}`} className="aspect-square rounded-2xl" />
                }

                const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`
                const isSelected = selectedDate === dateStr
                const isCurrentToday = dateStr === todayStr
                const dayEvents = events.filter((e) => e.event_date === dateStr)
                const hasPending = dayEvents.some((e) => !e.is_completed)

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => {
                      setSelectedDate(dateStr)
                      triggerHaptic()
                    }}
                    className={`relative flex aspect-square flex-col justify-between p-2 rounded-2xl border transition-all text-left group ${
                      isSelected
                        ? 'border-[#0084ff] bg-[#0084ff]/10 ring-2 ring-[#0084ff] dark:border-[#0084ff]'
                        : 'border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-800/80 dark:bg-slate-800/40 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Número del día */}
                    <span
                      className={`text-xs font-bold leading-none ${
                        isSelected
                          ? 'text-[#0084ff]'
                          : isCurrentToday
                          ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {/* Indicadores en la esquina inferior */}
                    <div className="flex items-center gap-1 mt-auto">
                      {/* Punto verde si es HOY */}
                      {isCurrentToday && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-2xs" />
                      )}

                      {/* Punto amarillo o de color si tiene eventos pendientes */}
                      {hasPending && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-2xs" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* PANEL DERECHO: Agenda Diaria (Estilo de la referencia)     */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 sticky top-20">
          
          {/* Header de la Agenda Diaria */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Agenda Diaria
              </h3>
              <p className="text-xs text-slate-400 font-medium">{selectedDate}</p>
            </div>

            {/* Botón flotante (+) para agregar evento */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#0084ff] text-white shadow-xs transition hover:bg-blue-600 active:scale-95"
            >
              <Add size={20} />
            </button>
          </div>

          {/* Lista de Eventos del Día */}
          <div className="flex flex-col gap-2.5 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
            {selectedDayEvents.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No hay actividades ni recordatorios para este día.
              </div>
            ) : (
              selectedDayEvents.map((evt) => {
                const colorConfig = eventTypeColors[evt.event_type] || eventTypeColors.Recordatorio

                return (
                  <div
                    key={evt.id}
                    className={`group relative flex flex-col gap-1.5 rounded-2xl border p-3.5 transition-all ${
                      evt.is_completed
                        ? 'border-slate-100 bg-slate-50/60 opacity-60 dark:border-slate-800 dark:bg-slate-800/40'
                        : 'border-slate-200/80 bg-slate-50/40 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/60'
                    }`}
                  >
                    {/* Header del Evento: Tipo con punto de color + Check y Eliminar */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${colorConfig.dot}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${colorConfig.text}`}>
                          {evt.event_type}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Checkbox completar */}
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(evt)}
                          className={`flex h-6 w-6 items-center justify-center rounded-lg border transition ${
                            evt.is_completed
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-slate-300 hover:border-emerald-500 text-transparent hover:text-emerald-500 dark:border-slate-600'
                          }`}
                        >
                          <Check size={14} />
                        </button>

                        {/* Eliminar */}
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(evt.id)}
                          className="rounded-lg p-1 text-slate-300 hover:text-rose-500 transition opacity-80 group-hover:opacity-100"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Título y hora */}
                    <div>
                      <h4
                        className={`text-xs font-bold text-slate-900 dark:text-white ${
                          evt.is_completed ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {evt.title}
                      </h4>
                      {evt.description && (
                        <p className="mt-0.5 text-[11px] text-slate-400 leading-relaxed">
                          {evt.description}
                        </p>
                      )}
                    </div>

                    {evt.event_time && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                        <TimeIcon size={12} />
                        <span>{evt.event_time.slice(0, 5)}</span>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>

      {/* Modal Crear Evento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-sm my-auto max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 scrollbar-thin">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Nuevo Pendiente
                </h3>
                <p className="text-xs text-slate-400">{selectedDate}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <CloseCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="flex flex-col gap-3.5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Título
                </label>
                <input
                  type="text"
                  placeholder="Ej. Cita odontológica, Pagar factura..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-[#0084ff] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Tipo
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as CalendarEventType)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Recordatorio">Recordatorio</option>
                  <option value="Tarea">Tarea</option>
                  <option value="Evento">Evento</option>
                  <option value="Urgente">Urgente</option>
                  <option value="Importante">Importante</option>
                  <option value="Meta">Meta</option>
                  <option value="Idea">Idea</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Hora (Opcional)
                </label>
                <CustomTimePicker
                  value={eventTime}
                  onChange={(val) => setEventTime(val)}
                  placeholder="Selecciona una hora"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Descripción / Notas (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles adicionales..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold outline-none focus:border-[#0084ff] focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="flex-1 rounded-2xl bg-[#0084ff] py-3 text-xs font-bold text-white transition hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
