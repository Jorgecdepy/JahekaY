import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useEmpleado } from '../contexts/EmpleadoAuthContext'
import './LectoristaLayout.css'

export default function LectoristaLayout() {
  const { empleado, logout } = useEmpleado()
  const navigate = useNavigate()
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false)

  const handleLogout = async () => {
    if (window.confirm('¿Estás seguro que deseas cerrar sesión?')) {
      await logout()
      navigate('/lectorista/login')
    }
  }

  const toggleMenuMovil = () => {
    setMenuMovilAbierto(!menuMovilAbierto)
  }

  const cerrarMenuMovil = () => {
    setMenuMovilAbierto(false)
  }

  const menuItems = [
    {
      path: '/lectorista/dashboard',
      icon: '🏠',
      label: 'Inicio'
    },
    {
      path: '/lectorista/cargar',
      icon: '📝',
      label: 'Cargar Lectura'
    },
    {
      path: '/lectorista/mis-lecturas',
      icon: '📋',
      label: 'Mis Lecturas'
    },
    {
      path: '/lectorista/buscar-cliente',
      icon: '🔍',
      label: 'Buscar Cliente'
    }
  ]

  return (
    <div className="lectorista-layout">
      {/* Header Superior */}
      <header className="lectorista-header">
        <div className="header-left">
          <button className="menu-toggle" onClick={toggleMenuMovil}>
            ☰
          </button>
          <div className="logo">
            <span className="logo-icon">💧</span>
            <span className="logo-text">JahekaY</span>
            <span className="logo-badge">Lectorista</span>
          </div>
        </div>

        <div className="header-right">
          <div className="user-info">
            <span className="user-icon">👷</span>
            <div className="user-details">
              <span className="user-name">{empleado?.nombre_completo || 'Lectorista'}</span>
              <span className="user-rol">{empleado?.rol_nombre || 'Lectorista'}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Cerrar sesión">
            🚪
          </button>
        </div>
      </header>

      {/* Sidebar Desktop */}
      <aside className={`sidebar ${menuMovilAbierto ? 'sidebar-abierto' : ''}`}>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={cerrarMenuMovil}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sync-status">
            <span className="sync-icon">🟢</span>
            <span className="sync-text">Conectado</span>
          </div>
          <button className="btn-logout-sidebar" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            <span className="nav-label">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Overlay para cerrar menú móvil */}
      {menuMovilAbierto && (
        <div className="overlay" onClick={cerrarMenuMovil}></div>
      )}

      {/* Contenido Principal */}
      <main className="lectorista-main">
        <Outlet />
      </main>

      {/* Bottom Navigation (Móvil) */}
      <nav className="bottom-nav">
        {menuItems.slice(0, 4).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
