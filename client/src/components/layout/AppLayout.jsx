import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import DemoNotice from '../DemoNotice/DemoNotice'
import Header from './Header'
import Footer from './Footer'
import styles from './AppLayout.module.css'

const isDemoBuild = import.meta.env.VITE_DATA_MODE === 'browser'

export default function AppLayout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>
      {isDemoBuild && <DemoNotice />}
      <Header />
      <main id="main" className={styles.main}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
