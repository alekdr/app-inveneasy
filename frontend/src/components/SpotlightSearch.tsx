import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IoSearchOutline,
  IoCloseOutline,
  IoShirtOutline,
  IoWalletOutline,
  IoFlameOutline,
  IoCheckboxOutline,
  IoArrowForward,
} from 'react-icons/io5'
import { supabase } from '../services/supabase'

interface SearchResult {
  id: string
  title: string
  subtitle?: string
  section: 'armario' | 'finanzas' | 'habitos' | 'rutinas'
  path: string
}

const sectionConfig = {
  armario: { label: 'Armario', icon: <IoShirtOutline size={16} />, color: 'text-violet-600 dark:text-violet-400' },
  finanzas: { label: 'Finanzas', icon: <IoWalletOutline size={16} />, color: 'text-emerald-600 dark:text-emerald-400' },
  habitos: { label: 'Hábitos', icon: <IoFlameOutline size={16} />, color: 'text-amber-500' },
  rutinas: { label: 'Rutinas', icon: <IoCheckboxOutline size={16} />, color: 'text-sky-600 dark:text-sky-400' },
}

interface SpotlightSearchProps {
  isOpen: boolean
  onClose: () => void
}

export default function SpotlightSearch({ isOpen, onClose }: SpotlightSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      setQuery('')
      setResults([])
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const performSearch = useCallback(async (term: string) => {
    if (!term || term.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const searchTerm = `%${term}%`
      const allResults: SearchResult[] = []

      // 1. Buscar en closet_items (armario)
      const { data: items } = await supabase
        .from('closet_items')
        .select('id, name, brand')
        .eq('user_id', user.id)
        .or(`name.ilike.${searchTerm},brand.ilike.${searchTerm}`)
        .limit(5)

      if (items) {
        items.forEach((item: any) => {
          allResults.push({
            id: `item-${item.id}`,
            title: item.name,
            subtitle: item.brand || undefined,
            section: 'armario',
            path: '/closet',
          })
        })
      }

      // 2. Buscar en financial_transactions (finanzas)
      const { data: txs } = await supabase
        .from('financial_transactions')
        .select('id, description, category, amount, type')
        .eq('user_id', user.id)
        .or(`description.ilike.${searchTerm},category.ilike.${searchTerm}`)
        .limit(5)

      if (txs) {
        txs.forEach((tx: any) => {
          allResults.push({
            id: `tx-${tx.id}`,
            title: tx.description || tx.category,
            subtitle: `${tx.type === 'expense' ? 'Gasto' : 'Ingreso'} · ${tx.category}`,
            section: 'finanzas',
            path: '/finances',
          })
        })
      }

      // 3. Buscar en habits (hábitos)
      const { data: habits } = await supabase
        .from('habits')
        .select('id, name, category')
        .eq('user_id', user.id)
        .ilike('name', searchTerm)
        .limit(5)

      if (habits) {
        habits.forEach((h: any) => {
          allResults.push({
            id: `habit-${h.id}`,
            title: h.name,
            subtitle: h.category || undefined,
            section: 'habitos',
            path: '/habits',
          })
        })
      }

      // 4. Buscar en routines (rutinas)
      const { data: routines } = await supabase
        .from('routines')
        .select('id, title, category')
        .eq('user_id', user.id)
        .ilike('title', searchTerm)
        .limit(5)

      if (routines) {
        routines.forEach((r: any) => {
          allResults.push({
            id: `routine-${r.id}`,
            title: r.title,
            subtitle: r.category || undefined,
            section: 'rutinas',
            path: '/routines',
          })
        })
      }

      setResults(allResults)
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced search
  const handleQueryChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => performSearch(value), 300)
  }

  const handleResultClick = (result: SearchResult) => {
    navigate(result.path)
    onClose()
  }

  if (!isOpen) return null

  // Group results by section
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.section]) acc[r.section] = []
    acc[r.section].push(r)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 backdrop-blur-xs p-4 pt-16 sm:pt-24 animate-in fade-in" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <IoSearchOutline size={20} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Buscar prendas, gastos, hábitos, rutinas..."
            className="flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(''); setResults([]) }} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <IoCloseOutline size={18} />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center">
              <IoSearchOutline size={32} className="text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Sin resultados para "{query}"</p>
              <p className="text-[10px] text-slate-400 mt-1">Intenta con otra palabra clave</p>
            </div>
          )}

          {!loading && Object.entries(grouped).map(([section, items]) => {
            const config = sectionConfig[section as keyof typeof sectionConfig]
            return (
              <div key={section}>
                <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50/80 dark:bg-slate-800/40">
                  <span className={config.color}>{config.icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{config.label}</span>
                </div>
                {items.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => handleResultClick(result)}
                    className="flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-[10px] text-slate-400 font-medium truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <IoArrowForward size={14} className="text-slate-300 dark:text-slate-600 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            )
          })}

          {!loading && query.length < 2 && (
            <div className="flex flex-col items-center py-10 text-center">
              <IoSearchOutline size={32} className="text-slate-200 dark:text-slate-700 mb-2" />
              <p className="text-xs text-slate-400 font-medium">Escribe al menos 2 caracteres para buscar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
