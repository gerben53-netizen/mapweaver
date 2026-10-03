import { useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import styles from './Modal.module.css'
export function Modal({ title, busy = false, onClose, children, wide = false, preview = false }: { title: string; busy?: boolean; onClose: () => void; children: ReactNode; wide?: boolean; preview?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => { const dialog = ref.current!, trigger = document.activeElement; dialog.showModal(); dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus(); return () => { dialog.close(); if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus() } }, [])
  return <dialog ref={ref} className={`${styles.dialog} ${wide ? styles.wide : ""} ${preview ? styles.preview : ""}`} aria-label={title} aria-busy={busy} onCancel={(e) => { e.preventDefault(); if (!busy) onClose() }} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); if (!busy) onClose() } }}>
    <h2>{title}</h2>{children}
  </dialog>
}
