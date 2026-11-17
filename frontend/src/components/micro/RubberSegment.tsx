import React from 'react'
import { motion } from 'motion/react'

interface RubberSegmentOption<T extends string> {
  id: T
  label: string
  icon?: React.ReactNode
}

interface RubberSegmentProps<T extends string> {
  options: RubberSegmentOption<T>[]
  selected: T
  onChange: (id: T) => void
}

export function RubberSegment<T extends string>({
  options,
  selected,
  onChange,
}: RubberSegmentProps<T>) {
  return (
    <div className="relative flex rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1.5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
      {options.map((option) => {
        const isSelected = selected === option.id
        return (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-colors select-none ${
              isSelected
                ? 'text-violet-600 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="rubber-pill"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                className="absolute inset-0 rounded-xl bg-white shadow-sm dark:bg-slate-800"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {option.icon}
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
