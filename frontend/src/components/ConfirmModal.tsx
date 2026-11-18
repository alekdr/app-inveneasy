import { IoAlertCircleOutline, IoTrashOutline } from 'react-icons/io5'
import { useConfirmStore } from '../stores/confirmStore'
import { triggerHaptic } from '../services/capacitor'

export default function ConfirmModal() {
  const { isOpen, options, confirm, cancel } = useConfirmStore()

  if (!isOpen) return null

  const handleConfirm = async () => {
    await triggerHaptic()
    confirm()
  }

  const handleCancel = async () => {
    await triggerHaptic()
    cancel()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
      onClick={handleCancel}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon & Title */}
        <div className="flex flex-col items-center text-center">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl mb-3 shadow-xs ${
              options.danger
                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                : 'bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400'
            }`}
          >
            {options.danger ? <IoTrashOutline size={26} /> : <IoAlertCircleOutline size={26} />}
          </div>

          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {options.title}
          </h3>

          <p className="mt-2 text-xs text-slate-500 font-medium leading-relaxed dark:text-slate-400">
            {options.message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {options.cancelText || 'Cancelar'}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className={`flex-1 rounded-2xl py-3 text-xs font-bold text-white shadow-xs transition active:scale-95 ${
              options.danger
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900'
            }`}
          >
            {options.confirmText || 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  )
}
