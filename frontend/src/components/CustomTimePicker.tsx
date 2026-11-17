import { useState, useRef, useEffect } from 'react'
import { IoTimeOutline, IoChevronDown, IoCheckmark } from 'react-icons/io5'

interface TimePickerProps {
  value: string // Formato "HH:mm" (24h) ej. "14:30" o ""
  onChange: (value: string) => void
  placeholder?: string
}

export default function CustomTimePicker({
  value,
  onChange,
  placeholder = 'Elige una hora (ej. 08:30 AM)',
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Desglosar valor inicial en horas 12h, minutos, y periodo AM/PM
  const parseTime = (val: string) => {
    if (!val) {
      return { hour12: '08', minute: '00', period: 'AM' }
    }
    const [hStr, mStr] = val.split(':')
    const h = parseInt(hStr, 10) || 0
    const minute = mStr ? mStr.padStart(2, '0') : '00'
    const period = h >= 12 ? 'PM' : 'AM'
    let h12 = h % 12
    if (h12 === 0) h12 = 12
    const hour12 = h12.toString().padStart(2, '0')
    return { hour12, minute, period }
  }

  const current = parseTime(value)
  const [selectedHour, setSelectedHour] = useState(current.hour12)
  const [selectedMinute, setSelectedMinute] = useState(current.minute)
  const [selectedPeriod, setSelectedPeriod] = useState(current.period)

  useEffect(() => {
    if (value) {
      const parsed = parseTime(value)
      setSelectedHour(parsed.hour12)
      setSelectedMinute(parsed.minute)
      setSelectedPeriod(parsed.period)
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'))
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

  const handleApply = (h: string, m: string, p: string) => {
    let hourNum = parseInt(h, 10)
    if (p === 'PM' && hourNum < 12) hourNum += 12
    if (p === 'AM' && hourNum === 12) hourNum = 0
    const final24 = `${hourNum.toString().padStart(2, '0')}:${m}`
    onChange(final24)
  }

  const selectHour = (h: string) => {
    setSelectedHour(h)
    handleApply(h, selectedMinute, selectedPeriod)
  }

  const selectMinute = (m: string) => {
    setSelectedMinute(m)
    handleApply(selectedHour, m, selectedPeriod)
  }

  const selectPeriod = (p: string) => {
    setSelectedPeriod(p)
    handleApply(selectedHour, selectedMinute, p)
  }

  const displayTime = value
    ? `${selectedHour}:${selectedMinute} ${selectedPeriod}`
    : ''

  return (
    <div className="w-full" ref={containerRef}>
      {/* Botón trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
          isOpen
            ? 'border-[#0084ff] ring-4 ring-[#0084ff]/10 bg-white dark:bg-slate-900 dark:border-[#0084ff]'
            : 'border-slate-200/90 bg-slate-50/70 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/60'
        }`}
      >
        <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
          <IoTimeOutline
            size={18}
            className={isOpen ? 'text-[#0084ff]' : 'text-slate-400'}
          />
          {value ? (
            <span className="font-bold tracking-tight text-slate-900 dark:text-white">
              {displayTime}
            </span>
          ) : (
            <span className="text-slate-400 font-medium">{placeholder}</span>
          )}
        </div>
        <IoChevronDown
          size={16}
          className={`text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#0084ff]' : ''
          }`}
        />
      </button>

      {/* Selector integrado (inline expandible) para que no se corte ni se desborde del modal */}
      {isOpen && (
        <div className="mt-2.5 overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95">
          {/* Header con Píldora AM / PM */}
          <div className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {displayTime || '08:00 AM'}
            </span>
            <div className="flex items-center rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => selectPeriod('AM')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  selectedPeriod === 'AM'
                    ? 'bg-[#0084ff] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => selectPeriod('PM')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  selectedPeriod === 'PM'
                    ? 'bg-[#0084ff] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                PM
              </button>
            </div>
          </div>

          {/* Grid de Horas y Minutos con scroll contenido */}
          <div className="grid grid-cols-2 gap-2">
            {/* Horas */}
            <div>
              <p className="mb-1 text-center text-[10px] font-bold uppercase text-slate-400">
                Hora
              </p>
              <div className="flex max-h-36 flex-col gap-1 overflow-y-auto pr-1 select-none scrollbar-thin">
                {hours.map((h) => {
                  const isSelected = selectedHour === h
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => selectHour(h)}
                      className={`flex items-center justify-center rounded-xl py-1.5 text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-[#0084ff] text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {h}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Minutos */}
            <div>
              <p className="mb-1 text-center text-[10px] font-bold uppercase text-slate-400">
                Minuto
              </p>
              <div className="flex max-h-36 flex-col gap-1 overflow-y-auto pr-1 select-none scrollbar-thin">
                {minutes.map((m) => {
                  const isSelected = selectedMinute === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => selectMinute(m)}
                      className={`flex items-center justify-center rounded-xl py-1.5 text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-[#0084ff] text-white shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                onChange('')
                setIsOpen(false)
              }}
              className="text-[11px] font-semibold text-slate-400 hover:text-rose-500 transition"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1 rounded-xl bg-[#0084ff] px-3 py-1 text-xs font-bold text-white transition hover:bg-blue-600 shadow-xs active:scale-95"
            >
              <IoCheckmark size={14} />
              <span>Listo</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
