import { CircleAlert, CircleCheck, X } from 'lucide-react'
import styles from './ToastViewport.module.css'

export function ToastViewport({ toasts, onDismiss }) {
  return (
    <div className={styles.viewport} role="status" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = toast.tone === 'error' ? CircleAlert : CircleCheck
        return (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.tone]}`}>
            <Icon aria-hidden="true" className={styles.icon} />
            <p>{toast.message}</p>
            <button type="button" className={styles.close} onClick={() => onDismiss(toast.id)} aria-label="Dismiss">
              <X aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
