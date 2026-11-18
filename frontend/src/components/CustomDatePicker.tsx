import { useState } from 'react'
import {
  IoCalendarOutline,
  IoChevronBackSharp,
  IoChevronForwardSharp,
  IoCloseOutline,
} from 'react-icons/io5'
import { triggerHaptic } from '../services/capacitor'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface CustomDatePickerProps {
  value: string // 'YYYY-MM-DD'
  onChange: (date: string) => void
  label?: string
}

export default function CustomDatePicker({ value, onChange, label }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Parse current value
  const parseDate = (valStr: string) => {
    if (!valStr) {
      const now = new Date()
      return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() }
    }
    const [y, m, d] = valStr.split('-').map(Number)
    return { y: y || 2026, m: (m || 1) - 1, d: d || 1 }
  }

  const initial = parseDate(value)
  const [viewYear, setViewYear] = useState(initial.y)
  const [viewMonth, setViewMonth] = useState(initial.m)

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const handleOpen = async () => {
    await triggerHaptic()
    const parsed = parseDate(value)
    setViewYear(parsed.y)
    setViewMonth(parsed.m)
    setIsOpen(true)
  }

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(v => v - 1)
    } else {
      setViewMonth(v => v - 1)
    }
  }

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(v => v + 1)
    } else {
      setViewMonth(v => v + 1)
    }
  }

  const handleSelectDay = async (dayNum: number) => {
    await triggerHaptic()
    const selected = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
    onChange(selected)
    setIsOpen(false)
  }

  const handleSelectToday = async () => {
    await triggerHaptic()
    onChange(todayStr)
    setIsOpen(false)
  }

  // Format label for display
  const formatDisplay = (valStr: string) => {
    if (!valStr) return 'Seleccionar fecha'
    const [y, m, d] = valStr.split('-').map(Number)
    if (!y || !m || !d) return valStr
    const monthName = MONTH_NAMES[m - 1] || ''
    const shortMonth = monthName.slice(0, 3)
    return `${d} ${shortMonth} ${y}`
  }

  // Grid calculation (Monday-first)
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1
  if (startingDayOfWeek === -1) startingDayOfWeek = 6

  const daysGrid: (number | null)[] = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    daysGrid.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysGrid.push(d)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-white active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        <IoCalendarOutline size={15} className="text-violet-600 dark:text-violet-400 shrink-0" />
        <span>{formatDisplay(value)}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-xs rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Calendario */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {label || 'Seleccionar fecha'}
                </p>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <IoChevronBackSharp size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <IoChevronForwardSharp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 ml-1"
                >
                  <IoCloseOutline size={18} />
                </button>
              </div>
            </div>

            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-1 text-center py-2">
              {DAYS_SHORT.map((d) => (
                <span
                  key={d}
                  className="text-[10px] font-bold uppercase tracking-wider text-slate-400"
                >
                  {d}
                </span>
              ))}
            </div>

            {/* Cuadrícula de días */}
            <div className="grid grid-cols-7 gap-1">
              {daysGrid.map((dayNum, idx) => {
                if (dayNum === null) {
                  return <div key={`empty-${idx}`} className="h-8 w-8" />
                }

                const currentStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                const isSelected = value === currentStr
                const isToday = todayStr === currentStr

                return (
                  <button
                    key={currentStr}
                    type="button"
                    onClick={() => handleSelectDay(dayNum)}
                    className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition active:scale-90 ${
                      isSelected
                        ? 'bg-violet-600 text-white shadow-xs'
                        : isToday
                        ? 'border border-violet-500 text-violet-600 dark:text-violet-400 font-extrabold bg-violet-50/50 dark:bg-violet-950/30'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {dayNum}
                  </button>
                )
              })}
            </div>

            {/* Footer con botón Hoy */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <button
                type="button"
                onClick={handleSelectToday}
                className="text-xs font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400"
              >
                Ir a Hoy
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
