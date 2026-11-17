import { NavLink } from 'react-router-dom'
import {
  IoGridOutline,
  IoShirtOutline,
  IoCheckboxOutline,
  IoWalletOutline,
  IoFlameOutline,
} from 'react-icons/io5'
import type { TabId } from '../types'

const tabs: { id: TabId; label: string; path: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Inicio', path: '/', icon: <IoGridOutline size={18} /> },
  { id: 'closet', label: 'Armario', path: '/closet', icon: <IoShirtOutline size={18} /> },
  { id: 'routines', label: 'Rutinas', path: '/routines', icon: <IoCheckboxOutline size={18} /> },
  { id: 'finances', label: 'Finanzas', path: '/finances', icon: <IoWalletOutline size={18} /> },
  { id: 'habits', label: 'Hábitos', path: '/habits', icon: <IoFlameOutline size={18} /> },
]

export default function BottomTabBar() {
  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-[#eeece8] bg-white/90 backdrop-blur-xl dark:bg-[#18181b]/90 dark:border-[#222226]">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1.5">
        {tabs.map((tab) => (
          <NavLink
            key={tab.id}
            to={tab.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-bold transition-all rounded-xl ${
                isActive
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'
              }`
            }
          >
            {tab.icon}
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
