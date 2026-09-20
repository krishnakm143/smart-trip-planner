import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Button from '../ui/Button'
import styles from './Header.module.css'

const navLinkClass = ({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  function handleLogout() {
    closeMenu()
    navigate('/')
    logout()
  }

  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        <Link to="/" className={styles.brand} onClick={closeMenu}>
          <svg viewBox="0 0 32 32" aria-hidden="true" className={styles.mark}>
            <path d="M6 24c5-1 6-11 10-11s4 7 10-5" />
            <circle cx="6" cy="24" r="3" />
            <circle cx="26" cy="8" r="3" />
          </svg>
          Smart Trip Planner
        </Link>

        <button
          type="button"
          className={styles.menuToggle}
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          <span className="visually-hidden">Menu</span>
        </button>

        <nav id="site-nav" aria-label="Main" className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}>
          <ul className={styles.links}>
            <li>
              <NavLink to="/destinations" className={navLinkClass} onClick={closeMenu}>
                Destinations
              </NavLink>
            </li>
            <li>
              <NavLink to="/plan" className={navLinkClass} onClick={closeMenu}>
                Plan a trip
              </NavLink>
            </li>
            {user && (
              <li>
                <NavLink to="/trips" className={navLinkClass} onClick={closeMenu}>
                  My trips
                </NavLink>
              </li>
            )}
          </ul>

          <div className={styles.account}>
            {user ? (
              <>
                <span className={styles.userName}>{user.name}</span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut aria-hidden="true" />
                  Log out
                </Button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass} onClick={closeMenu}>
                  Log in
                </NavLink>
                <Button to="/register" size="sm" onClick={closeMenu}>
                  Create account
                </Button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
