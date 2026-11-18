import { create } from 'zustand'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

interface ConfirmState {
  isOpen: boolean
  options: ConfirmOptions
  resolve: ((value: boolean) => void) | null
  openConfirm: (options: ConfirmOptions | string) => Promise<boolean>
  confirm: () => void
  cancel: () => void
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  isOpen: false,
  options: {
    title: '¿Confirmar acción?',
    message: '',
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    danger: true,
  },
  resolve: null,

  openConfirm: (opts) => {
    return new Promise<boolean>((resolve) => {
      const normalizedOpts: ConfirmOptions =
        typeof opts === 'string'
          ? {
              title: '¿Estás seguro?',
              message: opts,
              confirmText: 'Aceptar',
              cancelText: 'Cancelar',
              danger: true,
            }
          : {
              title: opts.title || '¿Estás seguro?',
              message: opts.message,
              confirmText: opts.confirmText || 'Aceptar',
              cancelText: opts.cancelText || 'Cancelar',
              danger: opts.danger !== undefined ? opts.danger : true,
            }

      set({
        isOpen: true,
        options: normalizedOpts,
        resolve,
      })
    })
  },

  confirm: () => {
    const { resolve } = get()
    if (resolve) resolve(true)
    set({ isOpen: false, resolve: null })
  },

  cancel: () => {
    const { resolve } = get()
    if (resolve) resolve(false)
    set({ isOpen: false, resolve: null })
  },
}))

/**
 * Función global para invocar una confirmación estilizada con promesa
 * ej: const ok = await confirmDialog('¿Eliminar este elemento?')
 */
export function confirmDialog(options: ConfirmOptions | string): Promise<boolean> {
  return useConfirmStore.getState().openConfirm(options)
}
