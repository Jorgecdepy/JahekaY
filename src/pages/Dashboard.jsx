import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Clientes from './Clientes'
import Lecturas from './Lecturas'
import Facturas from './Facturas'
import Tarifas from './Tarifas'
import CajaDiaria from './CajaDiaria'
import Configuracion from './Configuracion'
import './Dashboard.css'

function Dashboard() {
  const [loading, setLoading] = useState(false)
  const [activeSection, setActiveSection] = useState('dashboard')
  const [stats, setStats] = useState({
    totalClientes: 0,
    facturasPendientes: 0,
    lecturasDelMes: 0,
    ingresosDelMes: 0
  })

  useEffect(() => {
    if (activeSection === 'dashboard') {
      cargarEstadisticas()
    }
  }, [activeSection])

  const cargarEstadisticas = async () => {
    const { count: clientesCount } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })

    const { count: facturasPendientesCount } = await supabase
      .from('facturas')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'pendiente')

    const mesActual = new Date().getMonth() + 1
    const anioActual = new Date().getFullYear()

    const { count: lecturasDelMesCount } = await supabase
      .from('lecturas')
      .select('*', { count: 'exact', head: true })
      .eq('mes', mesActual)
      .eq('anio', anioActual)

    const { data: facturasPagadas } = await supabase
      .from('facturas')
      .select('total')
      .eq('estado', 'pagada')
      .gte('fecha_pago', `${anioActual}-${String(mesActual).padStart(2, '0')}-01`)

    const ingresos = facturasPagadas?.reduce((sum, f) => sum + parseFloat(f.total), 0) || 0

    setStats({
      totalClientes: clientesCount || 0,
      facturasPendientes: facturasPendientesCount || 0,
      lecturasDelMes: lecturasDelMesCount || 0,
      ingresosDelMes: ingresos
    })
  }

  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setLoading(false)
  }

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0
    }).format(monto)
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="dashboard-content animate-fade-in">
            <div className="page-header">
              <div>
                <h2>Panel de Control</h2>
                <p className="page-subtitle">Resumen general del sistema</p>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card stat-primary" onClick={() => setActiveSection('clientes')}>
                <div className="stat-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <div className="stat-content">
                  <span className="stat-label">Clientes</span>
                  <span className="stat-value">{stats.totalClientes}</span>
                  <span className="stat-description">Total registrados</span>
                </div>
              </div>

              <div className="stat-card stat-warning" onClick={() => setActiveSection('facturas')}>
                <div className="stat-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                </div>
                <div className="stat-content">
                  <span className="stat-label">Facturas Pendientes</span>
                  <span className="stat-value">{stats.facturasPendientes}</span>
                  <span className="stat-description">Por cobrar</span>
                </div>
              </div>

              <div className="stat-card stat-success" onClick={() => setActiveSection('lecturas')}>
                <div className="stat-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                  </svg>
                </div>
                <div className="stat-content">
                  <span className="stat-label">Lecturas del Mes</span>
                  <span className="stat-value">{stats.lecturasDelMes}</span>
                  <span className="stat-description">Registradas este mes</span>
                </div>
              </div>

              <div className="stat-card stat-danger">
                <div className="stat-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <div className="stat-content">
                  <span className="stat-label">Ingresos del Mes</span>
                  <span className="stat-value stat-value-money">{formatMonto(stats.ingresosDelMes)}</span>
                  <span className="stat-description">Facturas pagadas</span>
                </div>
              </div>
            </div>

            <div className="quick-actions">
              <h3>Acciones Rapidas</h3>
              <div className="actions-grid">
                <button className="action-card" onClick={() => setActiveSection('clientes')}>
                  <div className="action-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="8.5" cy="7" r="4"></circle>
                      <line x1="20" y1="8" x2="20" y2="14"></line>
                      <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                  </div>
                  <div className="action-text">
                    <strong>Nuevo Cliente</strong>
                    <p>Registrar un nuevo cliente</p>
                  </div>
                </button>

                <button className="action-card" onClick={() => setActiveSection('lecturas')}>
                  <div className="action-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                    </svg>
                  </div>
                  <div className="action-text">
                    <strong>Nueva Lectura</strong>
                    <p>Registrar lectura de medidor</p>
                  </div>
                </button>

                <button className="action-card" onClick={() => setActiveSection('facturas')}>
                  <div className="action-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="12" y1="18" x2="12" y2="12"></line>
                      <line x1="9" y1="15" x2="15" y2="15"></line>
                    </svg>
                  </div>
                  <div className="action-text">
                    <strong>Generar Factura</strong>
                    <p>Crear factura de consumo</p>
                  </div>
                </button>

                <button className="action-card" onClick={() => setActiveSection('tarifas')}>
                  <div className="action-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </div>
                  <div className="action-text">
                    <strong>Configurar Tarifas</strong>
                    <p>Gestionar precios y rangos</p>
                  </div>
                </button>

                <button className="action-card" onClick={() => setActiveSection('caja')}>
                  <div className="action-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                  </div>
                  <div className="action-text">
                    <strong>Caja Diaria</strong>
                    <p>Gestionar ingresos y gastos</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )
      case 'clientes':
        return <Clientes />
      case 'lecturas':
        return <Lecturas />
      case 'facturas':
        return <Facturas />
      case 'tarifas':
        return <Tarifas />
      case 'caja':
        return <CajaDiaria />
      case 'configuracion':
        return <Configuracion />
      default:
        return <div className="dashboard-content"><h2>Panel de Control</h2></div>
    }
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
            </svg>
          </div>
          <div>
            <h1>JahekaY</h1>
            <p>Sistema de Gestion</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={activeSection === 'dashboard' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveSection('dashboard')}
          >
            <span className="nav-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </span>
            Dashboard
          </button>
          <button
            className={activeSection === 'clientes' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveSection('clientes')}
          >
            <span className="nav-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </span>
            Clientes
          </button>
          <button
            className={activeSection === 'lecturas' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveSection('lecturas')}
          >
            <span className="nav-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
              </svg>
            </span>
            Lecturas
          </button>
          <button
            className={activeSection === 'facturas' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveSection('facturas')}
          >
            <span className="nav-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </span>
            Facturas
          </button>
          <button
            className={activeSection === 'caja' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveSection('caja')}
          >
            <span className="nav-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
            </span>
            Caja Diaria
          </button>
          <button
            className={activeSection === 'tarifas' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveSection('tarifas')}
          >
            <span className="nav-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </span>
            Tarifas
          </button>
          <button
            className={activeSection === 'configuracion' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveSection('configuracion')}
          >
            <span className="nav-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 1v6m0 6v6m5.66-13.66l-4.24 4.24m-2.83 2.83l-4.24 4.24m16.97-2.83l-4.24-4.24m-2.83-2.83l-4.24-4.24"></path>
              </svg>
            </span>
            Configuración
          </button>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} disabled={loading} className="logout-btn">
            {loading ? (
              <>
                <span className="spinner"></span>
                Saliendo...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Cerrar Sesion
              </>
            )}
          </button>
        </div>
      </aside>

      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  )
}

export default Dashboard
