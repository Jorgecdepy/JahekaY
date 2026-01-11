import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMap } from 'react-leaflet'
import { useEmpleado } from '../../contexts/EmpleadoAuthContext'
import { supabase } from '../../services/supabase'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import './MapaZonas.css'

// Fix para los iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Iconos personalizados para diferentes prioridades
const createIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

const iconos = {
  urgente: createIcon('#ef4444'),
  alta: createIcon('#f59e0b'),
  media: createIcon('#3b82f6'),
  baja: createIcon('#6b7280'),
  default: createIcon('#8b5cf6')
}

// Componente para centrar el mapa en las ubicaciones
function MapController({ bounds }) {
  const map = useMap()

  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [bounds, map])

  return null
}

export default function MapaZonas() {
  const { empleado: tecnico } = useEmpleado()
  const [reclamos, setReclamos] = useState([])
  const [zonas, setZonas] = useState([])
  const [canerias, setCanerias] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarReclamos, setMostrarReclamos] = useState(true)
  const [mostrarZonas, setMostrarZonas] = useState(true)
  const [mostrarCanerias, setMostrarCanerias] = useState(true)

  // Coordenadas por defecto (Paraguay - Asunción)
  const defaultCenter = [-25.2637, -57.5759]
  const [center, setCenter] = useState(defaultCenter)
  const [bounds, setBounds] = useState([])

  useEffect(() => {
    cargarDatos()
  }, [tecnico?.id])

  const cargarDatos = async () => {
    if (!tecnico?.id) return

    setLoading(true)
    try {
      // Cargar reclamos con coordenadas
      const { data: reclamosData, error: reclamosError } = await supabase.rpc('obtener_reclamos_tecnico', {
        p_tecnico_id: tecnico.id
      })

      if (reclamosError) throw reclamosError
      const reclamosConCoords = (reclamosData || []).filter(r => r.latitud && r.longitud)
      setReclamos(reclamosConCoords)

      // Cargar zonas de trabajo
      const { data: zonasData, error: zonasError } = await supabase.rpc('obtener_zonas_trabajo')
      if (zonasError) throw zonasError
      setZonas(zonasData || [])

      // Cargar cañerías
      const { data: caneriasData, error: caneriasError } = await supabase.rpc('obtener_canerias')
      if (caneriasError) throw caneriasError
      setCanerias(caneriasData || [])

      // Calcular bounds para centrar el mapa
      const allBounds = []
      reclamosConCoords.forEach(r => {
        if (r.latitud && r.longitud) {
          allBounds.push([r.latitud, r.longitud])
        }
      })

      if (allBounds.length > 0) {
        setBounds(allBounds)
        // Centrar en el primer reclamo
        setCenter([reclamosConCoords[0].latitud, reclamosConCoords[0].longitud])
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
    }
    setLoading(false)
  }

  const getPrioridadColor = (prioridad) => {
    const colores = {
      urgente: '#ef4444',
      alta: '#f59e0b',
      media: '#3b82f6',
      baja: '#6b7280'
    }
    return colores[prioridad] || '#6b7280'
  }

  if (loading) {
    return (
      <div className="mapa-loading">
        <div className="spinner"></div>
        <p>Cargando mapa...</p>
      </div>
    )
  }

  return (
    <div className="mapa-zonas">
      <div className="mapa-header">
        <div>
          <h1>Mapa de Zonas y Reclamos</h1>
          <p>Visualiza cañerías, zonas de trabajo y ubicación de reclamos</p>
        </div>
        <button className="btn-refresh" onClick={cargarDatos}>
          🔄 Actualizar
        </button>
      </div>

      <div className="mapa-controles">
        <label className="control-checkbox">
          <input
            type="checkbox"
            checked={mostrarReclamos}
            onChange={(e) => setMostrarReclamos(e.target.checked)}
          />
          <span>📍 Reclamos ({reclamos.length})</span>
        </label>
        <label className="control-checkbox">
          <input
            type="checkbox"
            checked={mostrarZonas}
            onChange={(e) => setMostrarZonas(e.target.checked)}
          />
          <span>🗺️ Zonas de Trabajo ({zonas.length})</span>
        </label>
        <label className="control-checkbox">
          <input
            type="checkbox"
            checked={mostrarCanerias}
            onChange={(e) => setMostrarCanerias(e.target.checked)}
          />
          <span>🔧 Cañerías ({canerias.length})</span>
        </label>
      </div>

      <div className="mapa-container">
        {reclamos.length === 0 && zonas.length === 0 && canerias.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🗺️</span>
            <p>No hay datos para mostrar en el mapa</p>
            <p className="empty-subtitle">Los reclamos con ubicación GPS aparecerán aquí</p>
          </div>
        ) : (
          <MapContainer
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%', borderRadius: '12px' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapController bounds={bounds} />

            {/* Reclamos */}
            {mostrarReclamos && reclamos.map((reclamo) => (
              <Marker
                key={reclamo.id}
                position={[reclamo.latitud, reclamo.longitud]}
                icon={iconos[reclamo.prioridad] || iconos.default}
              >
                <Popup>
                  <div className="popup-content">
                    <h3>
                      {reclamo.tipo_reclamo_icono} {reclamo.tipo_reclamo_nombre}
                    </h3>
                    <p><strong>#{reclamo.numero_reclamo}</strong></p>
                    <p><strong>Cliente:</strong> {reclamo.cliente_nombre}</p>
                    <p><strong>Dirección:</strong> {reclamo.cliente_direccion}</p>
                    <p><strong>Prioridad:</strong> <span style={{ color: getPrioridadColor(reclamo.prioridad) }}>{reclamo.prioridad.toUpperCase()}</span></p>
                    <p><strong>Estado:</strong> {reclamo.estado}</p>
                    {reclamo.descripcion && (
                      <p className="popup-descripcion"><strong>Descripción:</strong> {reclamo.descripcion}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Zonas de Trabajo */}
            {mostrarZonas && zonas.map((zona) => {
              if (!zona.coordenadas_poligono) return null
              const coords = JSON.parse(JSON.stringify(zona.coordenadas_poligono))
              if (!Array.isArray(coords) || coords.length === 0) return null

              const positions = coords.map(c => [c.lat, c.lng])

              return (
                <Polygon
                  key={zona.id}
                  positions={positions}
                  pathOptions={{
                    color: zona.color || '#3b82f6',
                    fillColor: zona.color || '#3b82f6',
                    fillOpacity: 0.2,
                    weight: 2
                  }}
                >
                  <Popup>
                    <div className="popup-content">
                      <h3>{zona.nombre}</h3>
                      {zona.descripcion && <p>{zona.descripcion}</p>}
                    </div>
                  </Popup>
                </Polygon>
              )
            })}

            {/* Cañerías */}
            {mostrarCanerias && canerias.map((caneria) => {
              if (!caneria.coordenadas_linea) return null
              const coords = JSON.parse(JSON.stringify(caneria.coordenadas_linea))
              if (!Array.isArray(coords) || coords.length === 0) return null

              const positions = coords.map(c => [c.lat, c.lng])

              const color = caneria.estado === 'operativa' ? '#10b981' :
                           caneria.estado === 'en_reparacion' ? '#f59e0b' : '#ef4444'

              return (
                <Polyline
                  key={caneria.id}
                  positions={positions}
                  pathOptions={{
                    color: color,
                    weight: 4,
                    opacity: 0.8
                  }}
                >
                  <Popup>
                    <div className="popup-content">
                      <h3>{caneria.nombre}</h3>
                      <p><strong>Tipo:</strong> {caneria.tipo}</p>
                      <p><strong>Diámetro:</strong> {caneria.diametro_pulgadas}"</p>
                      <p><strong>Material:</strong> {caneria.material}</p>
                      <p><strong>Estado:</strong> {caneria.estado}</p>
                    </div>
                  </Popup>
                </Polyline>
              )
            })}
          </MapContainer>
        )}
      </div>

      <div className="mapa-leyenda">
        <h3>Leyenda</h3>
        <div className="leyenda-items">
          <div className="leyenda-item">
            <div className="leyenda-color" style={{ backgroundColor: '#ef4444' }}></div>
            <span>Urgente</span>
          </div>
          <div className="leyenda-item">
            <div className="leyenda-color" style={{ backgroundColor: '#f59e0b' }}></div>
            <span>Alta</span>
          </div>
          <div className="leyenda-item">
            <div className="leyenda-color" style={{ backgroundColor: '#3b82f6' }}></div>
            <span>Media</span>
          </div>
          <div className="leyenda-item">
            <div className="leyenda-color" style={{ backgroundColor: '#6b7280' }}></div>
            <span>Baja</span>
          </div>
          <div className="leyenda-separator"></div>
          <div className="leyenda-item">
            <div className="leyenda-linea" style={{ backgroundColor: '#10b981' }}></div>
            <span>Cañería Operativa</span>
          </div>
          <div className="leyenda-item">
            <div className="leyenda-linea" style={{ backgroundColor: '#f59e0b' }}></div>
            <span>En Reparación</span>
          </div>
          <div className="leyenda-item">
            <div className="leyenda-linea" style={{ backgroundColor: '#ef4444' }}></div>
            <span>Fuera de Servicio</span>
          </div>
        </div>
      </div>
    </div>
  )
}
