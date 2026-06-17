import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { reservasApi, ReservationResponse } from '@/api/reservas';
import { fieldsApi, FieldResponse } from '@/api/campos';
import { AlertCircle, Loader } from 'lucide-react';

// =============================================
// Reservas Page — Conectado a API Real
// =============================================

export default function ReservasPage() {
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

  const mapStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      confirmed: '#4ade80', // verde
      pending: '#facc15',    // amarillo
      cancelled: '#ef4444',  // rojo
    };
    return colors[status] || '#a0aec0';
  };

  const mapStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      confirmed: 'Confirmada',
      pending: 'Pendiente',
      cancelled: 'Cancelada',
    };
    return labels[status] || status;
  };

  return (
    <Layout title="RESERVAS">
      {/* Encabezado */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--clr-text-muted)', marginBottom: 8 }}>
          Total de reservas: <span style={{ fontWeight: 600, color: 'var(--clr-text)' }}>{reservas.length}</span>
        </div>
      </div>

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
          Cargando reservas...
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
      ) : reservas.length === 0 ? (
        <div className="card" style={{
          textAlign: 'center',
          padding: 40,
          color: 'var(--clr-text-muted)',
        }}>
          <p style={{ fontSize: '1.1rem', marginBottom: 8 }}>No hay reservas</p>
          <p style={{ fontSize: '0.9rem' }}>Las reservas aparecerán aquí cuando se creen</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            overflowX: 'auto',
            borderTop: '1px solid var(--clr-border)',
            borderBottom: '1px solid var(--clr-border)',
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.9rem',
            }}>
              <thead style={{ background: 'var(--clr-bg-alt)' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--clr-text-muted)' }}>ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--clr-text-muted)' }}>Cliente</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--clr-text-muted)' }}>Email</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--clr-text-muted)' }}>Teléfono</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--clr-text-muted)' }}>Inicio</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--clr-text-muted)' }}>Fin</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--clr-text-muted)' }}>Precio</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--clr-text-muted)' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((res) => (
                  <tr
                    key={res.id}
                    style={{
                      borderTop: '1px solid var(--clr-border)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--clr-bg-alt)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--clr-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{res.id}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{res.client_name}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--clr-text-muted)', fontSize: '0.85rem' }}>{res.client_email}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{res.client_phone}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                      {new Date(res.start_time).toLocaleString('es-ES', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                      {new Date(res.end_time).toLocaleString('es-ES', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#4ade80',
                    }}>
                      ${res.total_price.toLocaleString('es-ES')}
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                    }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: mapStatusColor(res.status) + '20',
                        color: mapStatusColor(res.status),
                      }}>
                        {mapStatusLabel(res.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
