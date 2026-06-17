import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { reservasApi, ReservationResponse } from '@/api/reservas';
import { fieldsApi, FieldResponse } from '@/api/campos';
import StatCard from '@/components/StatCard';
import { AlertCircle, Loader } from 'lucide-react';

// =============================================
// Dashboard — Resumen de Datos
// =============================================

export default function DashboardPage() {
  const [reservas, setReservas] = useState<ReservationResponse[]>([]);
  const [campos, setCampos] = useState<FieldResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [reservasRes, camposRes] = await Promise.all([
          reservasApi.getAll(),
          fieldsApi.getAll(),
        ]);
        setReservas(reservasRes.data || []);
        setCampos(camposRes.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = {
    totalReservas: reservas.length,
    confirmadas: reservas.filter(r => r.status === 'confirmed').length,
    pendientes: reservas.filter(r => r.status === 'pending').length,
    ingresoTotal: reservas.reduce((sum, r) => sum + r.total_price, 0),
    camposDisponibles: campos.filter(c => c.is_active).length,
  };

  const ultimasReservas = reservas.slice(-5).reverse();

  return (
    <Layout title="DASHBOARD">
      {loading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 300,
          gap: 12,
          color: 'var(--clr-text-muted)',
        }}>
          <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
          Cargando datos...
        </div>
      ) : error ? (
        <div className="card" style={{
          background: 'rgba(239,68,68,0.1)',
          borderLeft: '4px solid #ef4444',
          padding: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          color: '#ef4444',
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 32,
          }}>
            <StatCard
              label="Total Reservas"
              value={stats.totalReservas}
              icon={<span>📅</span>}
            />
            <StatCard
              label="Confirmadas"
              value={stats.confirmadas}
              icon={<span>✅</span>}
            />
            <StatCard
              label="Pendientes"
              value={stats.pendientes}
              icon={<span>⏳</span>}
              accent="var(--clr-warn)"
            />
            <StatCard
              label="Ingresos"
              value={`$${stats.ingresoTotal.toLocaleString('es-ES')}`}
              icon={<span>💰</span>}
              accent="var(--clr-info)"
            />
            <StatCard
              label="Canchas Activas"
              value={stats.camposDisponibles}
              icon={<span>⚽</span>}
              accent="var(--clr-accent)"
            />
          </div>

          {/* Últimas reservas */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              marginBottom: 16,
              color: 'var(--clr-text)',
            }}>
              Últimas Reservas
            </h2>

            {ultimasReservas.length === 0 ? (
              <div className="card" style={{
                textAlign: 'center',
                padding: 40,
                color: 'var(--clr-text-muted)',
              }}>
                <p>No hay reservas aún</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 16,
              }}>
                {ultimasReservas.map(res => (
                  <div
                    key={res.id}
                    className="card"
                    style={{
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                    }}>
                      <div>
                        <div style={{
                          fontSize: '0.85rem',
                          color: 'var(--clr-text-muted)',
                        }}>
                          ID #{res.id}
                        </div>
                        <div style={{
                          fontWeight: 600,
                          fontSize: '1rem',
                          marginTop: 4,
                        }}>
                          {res.client_name}
                        </div>
                      </div>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: res.status === 'confirmed' ? '#4ade8020' : '#facc1520',
                        color: res.status === 'confirmed' ? '#4ade80' : '#facc15',
                      }}>
                        {res.status === 'confirmed' ? 'Confirmada' : res.status === 'pending' ? 'Pendiente' : 'Cancelada'}
                      </span>
                    </div>

                    <div style={{
                      fontSize: '0.85rem',
                      color: 'var(--clr-text-muted)',
                      display: 'grid',
                      gap: 6,
                    }}>
                      <div>📧 {res.client_email}</div>
                      <div>📱 {res.client_phone}</div>
                    </div>

                    <div style={{
                      paddingTop: 12,
                      borderTop: '1px solid var(--clr-border)',
                      display: 'grid',
                      gap: 6,
                      fontSize: '0.85rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--clr-text-muted)' }}>Inicio:</span>
                        <span>{new Date(res.start_time).toLocaleString('es-ES', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--clr-text-muted)' }}>Fin:</span>
                        <span>{new Date(res.end_time).toLocaleString('es-ES', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}</span>
                      </div>
                    </div>

                    <div style={{
                      paddingTop: 12,
                      borderTop: '1px solid var(--clr-border)',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      color: '#4ade80',
                      textAlign: 'right',
                    }}>
                      ${res.total_price.toLocaleString('es-ES')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Canchas disponibles */}
          <div>
            <h2 style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              marginBottom: 16,
              color: 'var(--clr-text)',
            }}>
              Canchas Disponibles
            </h2>

            {campos.length === 0 ? (
              <div className="card" style={{
                textAlign: 'center',
                padding: 40,
                color: 'var(--clr-text-muted)',
              }}>
                <p>No hay canchas registradas</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 16,
              }}>
                {campos.map(campo => (
                  <div
                    key={campo.id}
                    className="card"
                    style={{
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      opacity: campo.is_active ? 1 : 0.6,
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                    }}>
                      <div>
                        <div style={{
                          fontSize: '0.85rem',
                          color: 'var(--clr-text-muted)',
                        }}>
                          Cancha #{campo.id}
                        </div>
                        <div style={{
                          fontWeight: 600,
                          fontSize: '1.1rem',
                          marginTop: 4,
                        }}>
                          {campo.name}
                        </div>
                      </div>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: campo.is_active ? '#4ade8020' : '#ef444420',
                        color: campo.is_active ? '#4ade80' : '#ef4444',
                      }}>
                        {campo.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>

                    {campo.description && (
                      <p style={{
                        fontSize: '0.85rem',
                        color: 'var(--clr-text-muted)',
                      }}>
                        {campo.description}
                      </p>
                    )}

                    <div style={{
                      paddingTop: 12,
                      borderTop: '1px solid var(--clr-border)',
                      display: 'grid',
                      gap: 6,
                      fontSize: '0.85rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--clr-text-muted)' }}>Superficie:</span>
                        <span>{campo.surface_type}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--clr-text-muted)' }}>Dimensiones:</span>
                        <span>{campo.length_meters}m x {campo.width_meters}m</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--clr-text-muted)' }}>Capacidad:</span>
                        <span>{campo.capacity} jugadores</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--clr-text-muted)' }}>Horario:</span>
                        <span>{campo.available_hour_start} - {campo.available_hour_end}</span>
                      </div>
                    </div>

                    <div style={{
                      paddingTop: 12,
                      borderTop: '1px solid var(--clr-border)',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      color: '#60a5fa',
                      textAlign: 'right',
                    }}>
                      ${campo.price_per_hour.toLocaleString('es-ES')}/hora
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}
