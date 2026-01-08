import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Clientes from './Clientes'
import Lecturas from './Lecturas'
import Facturas from './Facturas'
import Tarifas from './Tarifas'
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
    // Total de clientes
    const { count: clientesCount } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })

    // Facturas pendientes
    const { count: facturasPendientesCount } = await supabase
      .from('facturas')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'pendiente')

    // Lecturas del mes actual
    const mesActual = new Date().getMonth() + 1
    const anioActual = new Date().getFullYear()
    
    const { count: lecturasDelMesCount } = await supabase
      .from('lecturas')
      .select('*', { count: 'exact', head: true })
      .eq('mes', mesActual)
      .eq('anio', anioActual)

    // Ingresos del mes (facturas pagadas)
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
    switch(activeSection) {
      case 'dashboard':
        return (
          <div className="dashboard-content">
            <div className="dashboard-header">
              <h2>Panel de Control</h2>
              <p className="dashboard-subtitle">Resumen general del sistema</p>
            </div>

            <div className="dashboard-cards">
              <div className="card card-clientes" onClick={() => setActiveSection('clientes')}>
                <div className="card-icon">👥</div>
                <h3>Clientes</h3>
                <p className="card-number">{stats.totalClientes}</p>
                <p className="card-footer">Total registrados</p>
              </div>
              
              <div className="card card-facturas" onClick={() => setActiveSection('facturas')}>
                <div className="card-icon">📄</div>
                <h3>Facturas Pendientes</h3>
                <p className="card-number">{stats.facturasPendientes}</p>
                <p className="card-footer">Por cobrar</p>
              </div>
              
              <div className="card card-lecturas" onClick={() => setActiveSection('lecturas')}>
                <div className="card-icon">📏</div>
                <h3>Lecturas del Mes</h3>
                <p className="card-number">{stats.lecturasDelMes}</p>
                <p className="card-footer">Registradas este mes</p>
              </div>
              
              <div className="card card-ingresos">
                <div className="card-icon">💰</div>
                <h3>Ingresos del Mes</h3>
                <p className="card-number card-money">{formatMonto(stats.ingresosDelMes)}</p>
                <p className="card-footer">Facturas pagadas</p>
              </div>
            </div>

            <div className="dashboard-actions">
              <h3>Acciones Rápidas</h3>
              <div className="action-buttons">
                <button className="action-btn" onClick={() => setActiveSection('clientes')}>
                  <span className="action-icon">➕</span>
                  <div>
                    <strong>Nuevo Cliente</strong>
                    <p>Registrar un nuevo cliente</p>
                  </div>
                </button>
                
                <button className="action-btn" onClick={() => setActiveSection('lecturas')}>
                  <span className="action-icon">📏</span>
                  <div>
                    <strong>Nueva Lectura</strong>
                    <p>Registrar lectura de medidor</p>
                  </div>
                </button>
                
                <button className="action-btn" onClick={() => setActiveSection('facturas')}>
                  <span className="action-icon">📄</span>
                  <div>
                    <strong>Generar Factura</strong>
                    <p>Crear factura de consumo</p>
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
      default:
        return <div className="dashboard-content"><h2>Panel de Control</h2></div>
    }
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>JahekaY</h1>
          <p>Sistema de Gestión</p>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={activeSection === 'dashboard' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveSection('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={activeSection === 'clientes' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveSection('clientes')}
          >
            👥 Clientes
          </button>
          <button 
            className={activeSection === 'lecturas' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveSection('lecturas')}
          >
            📏 Lecturas
          </button>
          <button 
            className={activeSection === 'facturas' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveSection('facturas')}
          >
            📄 Facturas
          </button>
          <button 
            className={activeSection === 'tarifas' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActiveSection('tarifas')}
          >
            💰 Tarifas
          </button>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} disabled={loading} className="logout-btn">
            {loading ? 'Saliendo...' : '🚪 Cerrar Sesión'}
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