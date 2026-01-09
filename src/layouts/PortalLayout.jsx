import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useCliente } from '../contexts/ClienteAuthContext'
import './PortalLayout.css'

export default function PortalLayout() {
  const { cliente, logout } = useCliente()
  const navigate = useNavigate()
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false)

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro que deseas cerrar sesión?')) {
      logout()
      navigate('/portal-cliente/login')
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
      path: '/portal-cliente/dashboard',
      icon: '🏠',
      label: 'Inicio'
    },
    {
      path: '/portal-cliente/reclamos',
      icon: '📋',
      label: 'Reclamos'
    },
    {
      path: '/portal-cliente/estado-cuenta',
      icon: '📄',
      label: 'Estado de Cuenta'
    },
    {
      path: '/portal-cliente/historial-pagos',
      icon: '💳',
      label: 'Pagos'
    },
    {
      path: '/portal-cliente/mi-consumo',
      icon: '📊',
      label: 'Consumo'
    }
  ]

  return (
    <div className="portal-layout">
      {/* Header Superior */}
      <header className="portal-header">
        <div className="header-left">
          <button className="menu-toggle" onClick={toggleMenuMovil}>
            ☰
          </button>
          <div className="logo">
            <span className="logo-icon">💧</span>
            <span className="logo-text">JahekaY</span>
          </div>
        </div>

        <div className="header-right">
          <div className="user-info">
            <span className="user-icon">👤</span>
            <div className="user-details">
              <span className="user-name">{cliente?.nombre_completo || 'Cliente'}</span>
              <span className="user-medidor">Medidor: {cliente?.numero_medidor || 'N/A'}</span>
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
      <main className="portal-main">
        <Outlet />
      </main>

      {/* Bottom Navigation (Móvil) */}
      <nav className="bottom-nav">
        {menuItems.map((item) => (
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
