import { useNavigate } from 'react-router-dom'
import {
  IoShirtOutline,
  IoCheckboxOutline,
  IoWalletOutline,
  IoFlameOutline,
  IoCalendarOutline,
  IoHeartOutline,
  IoArrowForward,
} from 'react-icons/io5'

const spaces = [
  {
    name: 'Armario',
    description: 'Prendas, calzado, aseo y accesorios organizados',
    path: '/closet',
    tag: 'Colección',
    icon: <IoShirtOutline size={22} />,
    badgeColor: 'bg-[#e9e5f5] text-[#5a48ab]',
  },
  {
    name: 'Rutinas',
    description: 'Seguimiento por día con porcentaje de cumplimiento',
    path: '/routines',
    tag: 'Diario',
    icon: <IoCheckboxOutline size={22} />,
    badgeColor: 'bg-[#e2f4ec] text-[#2b7a5a]',
  },
  {
    name: 'Finanzas',
    description: 'Ingresos, gastos, compras y metas de ahorro',
    path: '/finances',
    tag: 'Orden',
    icon: <IoWalletOutline size={22} />,
    badgeColor: 'bg-[#fae8df] text-[#9c5936]',
  },
  {
    name: 'Hábitos',
    description: 'Rachas consecutivas y progreso personal medible',
    path: '/habits',
    tag: 'Enfoque',
    icon: <IoFlameOutline size={22} />,
    badgeColor: 'bg-[#e3edf7] text-[#38628b]',
  },
  {
    name: 'Calendario',
    description: 'Eventos, recordatorios y tareas por fecha',
    path: '/calendar',
    tag: 'Agenda',
    icon: <IoCalendarOutline size={22} />,
    badgeColor: 'bg-[#f5f2eb] text-[#615949]',
  },
  {
    name: 'Deseos',
    description: 'Lista de compras futuras con fotos y presupuesto',
    path: '/wishlist',
    tag: 'Wishlist',
    icon: <IoHeartOutline size={22} />,
    badgeColor: 'bg-[#fae8f3] text-[#8e3871]',
  },
]

export default function DashboardPage() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-7">
      {/* Editorial Welcome Header - InvenEasy Clean Dashboard */}
      <div className="rounded-3xl border border-[#eeece8] bg-white p-6 md:p-8 shadow-xs dark:border-[#222226] dark:bg-[#18181b]">
        <div className="flex flex-col gap-2 max-w-xl">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            InvenEasy
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Hola de nuevo
          </h2>
          <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed dark:text-slate-400">
            Tu centro de orden personal. Gestiona tu inventario, planifica tus días y mantén tus cuentas al día.
          </p>
        </div>
      </div>

      {/* Grid de Secciones */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Espacios
          </h3>
          <span className="text-xs font-semibold text-slate-400">
            {spaces.length} módulos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {spaces.map((space) => (
            <div
              key={space.name}
              onClick={() => navigate(space.path)}
              className="group flex flex-col justify-between rounded-3xl border border-slate-200/70 bg-white p-5 shadow-xs transition-all hover:border-slate-300 hover:shadow-md active:scale-[0.98] cursor-pointer dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${space.badgeColor}`}
                  >
                    {space.icon}
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {space.tag}
                  </span>
                </div>

                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  {space.name}
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed dark:text-slate-400">
                  {space.description}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-bold text-slate-700 dark:border-slate-800 dark:text-slate-300">
                <span>Entrar</span>
                <div className="transition-transform group-hover:translate-x-1">
                  <IoArrowForward size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
