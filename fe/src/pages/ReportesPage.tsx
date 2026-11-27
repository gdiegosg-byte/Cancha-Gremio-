import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { useToast } from '@/context/ToastContext';
import { fieldsApi, FieldResponse } from '@/api/campos';
import {
  reportesApi,
  DashboardStats,
  ReporteParams,
  ReporteResponse,
  ReporteReserva,
} from '@/api/reportes';
import { AlertCircle, Download, Loader } from 'lucide-react';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const money = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function formatMoney(value: number): string {
  return money.format(value || 0);
}

function buildDailyIncome(reservas: ReporteReserva[]): number[] {
  const daily = new Array<number>(32).fill(0);
  for (const reserva of reservas) {
    if (reserva.estado !== 'confirmed') continue;
    const day = new Date(reserva.inicio).getDate();
    if (day >= 1 && day <= 31) daily[day] += reserva.precio;
  }
  return daily;
}

function buildTopClientes(reservas: ReporteReserva[]) {
  const clientes = new Map<string, { nombre: string; reservas: number; monto: number }>();
  for (const reserva of reservas) {
    const actual = clientes.get(reserva.email) ?? {
      nombre: reserva.cliente,
      reservas: 0,
      monto: 0,
    };
    actual.reservas += 1;
    if (reserva.estado === 'confirmed') actual.monto += reserva.precio;
    clientes.set(reserva.email, actual);
  }
  return [...clientes.values()]
    .sort((a, b) => b.monto - a.monto || b.reservas - a.reservas)
    .slice(0, 5);
}

export default function ReportesPage() {
  const { toast } = useToast();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [estado, setEstado] = useState('');
  const [fieldId, setFieldId] = useState('');
  const [campos, setCampos] = useState<FieldResponse[]>([]);
  const [reporte, setReporte] = useState<ReporteResponse | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params: ReporteParams = useMemo(() => ({
    year,
    month,
    ...(estado ? { estado } : {}),
    ...(fieldId ? { field_id: Number(fieldId) } : {}),
  }), [year, month, estado, fieldId]);

  useEffect(() => {
    reportesApi.getStats()
      .then(res => setStats(res.data))
      .catch(() => setStats(null));
    fieldsApi.getAll()
      .then(res => setCampos(res.data || []))
      .catch(() => setCampos([]));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    reportesApi.getReporte(params)
      .then(res => {
        if (active) setReporte(res.data);
      })
      .catch(err => {
        if (active) {
          setReporte(null);
          setError(err instanceof Error ? err.message : 'Error al cargar el reporte');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [params]);

  async function handleExport() {
    setExporting(true);
    try {
      await reportesApi.exportCsv(params);
      toast('Reporte CSV descargado correctamente', 'success');
    } catch {
      toast('No se pudo descargar el reporte', 'error');
    } finally {
      setExporting(false);
    }
  }

  const resumen = reporte?.resumen;
  const reservas = useMemo(() => reporte?.reservas ?? [], [reporte]);
  const total = resumen?.total_reservas ?? 0;
  const ingresos = resumen?.ingresos_confirmados ?? 0;
  const cancelRate = total ? (resumen?.canceladas ?? 0) / total * 100 : 0;
  const ticket = resumen?.confirmadas ? ingresos / resumen.confirmadas : 0;
  const dias = useMemo(() => buildDailyIncome(reservas), [reservas]);
  const diasDelMes = new Date(year, month, 0).getDate();
  const maxDia = Math.max(1, ...dias.slice(1, diasDelMes + 1));
  const topClientes = useMemo(() => buildTopClientes(reservas), [reservas]);

  const kpis = [
    { label: 'Ingresos confirmados', value: formatMoney(ingresos), detail: reporte?.periodo.mes ?? 'Periodo actual' },
    { label: 'Reservas totales', value: total.toLocaleString('es-CO'), detail: `${resumen?.confirmadas ?? 0} confirmadas` },
    { label: 'Tasa de cancelación', value: `${cancelRate.toFixed(1)}%`, detail: `${resumen?.canceladas ?? 0} canceladas` },
    { label: 'Ticket promedio', value: formatMoney(ticket), detail: 'Por reserva confirmada' },
  ];

  return (
    <Layout title="REPORTES">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))} aria-label="Año del reporte">
            {Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} aria-label="Mes del reporte">
            {MESES.map((nombre, index) => (
              <option key={nombre} value={index + 1}>{nombre}</option>
            ))}
          </select>
          <select value={estado} onChange={e => setEstado(e.target.value)} aria-label="Estado de la reserva">
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="confirmed">Confirmada</option>
            <option value="cancelled">Cancelada</option>
          </select>
          <select value={fieldId} onChange={e => setFieldId(e.target.value)} aria-label="Cancha">
            <option value="">Todas las canchas</option>
            {campos.map(campo => (
              <option key={campo.id} value={campo.id}>{campo.name}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-ghost" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={15} />}
          {exporting ? 'Descargando...' : 'Exportar CSV'}
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', color: '#ef4444', padding: 16, marginBottom: 20, display: 'flex', gap: 10 }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--clr-text-muted)' }}>
          <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Cargando reporte...
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            {kpis.map(kpi => (
              <div key={kpi.label} className="card">
                <div style={{ fontSize: '0.72rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  {kpi.label}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', marginBottom: 4 }}>
                  {kpi.value}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>
                  {kpi.detail}
                </div>
              </div>
            ))}
          </div>

          {stats && (
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 24, fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>
              <span>Clientes registrados: <strong style={{ color: 'var(--clr-text)' }}>{stats.clientesRegistrados}</strong></span>
              <span>Ocupación hoy: <strong style={{ color: 'var(--clr-text)' }}>{stats.ocupacionPromedio}%</strong></span>
              <span>Reservas pendientes: <strong style={{ color: 'var(--clr-text)' }}>{stats.reservasPendientes}</strong></span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 20 }}>
            <div className="card" style={{ overflowX: 'auto' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 4 }}>
                Ingresos por día — {reporte?.periodo.mes ?? MESES[month - 1]} {year}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', marginBottom: 24 }}>Reservas confirmadas del periodo</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 200, minWidth: 620 }}>
                {Array.from({ length: diasDelMes }, (_, i) => {
                  const dia = i + 1;
                  const valor = dias[dia];
                  const altura = valor > 0 ? Math.max((valor / maxDia) * 140, 4) : 0;
                  return (
                    <div key={dia} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }} title={`${dia}: ${formatMoney(valor)}`}>
                      <div style={{ width: '100%', height: 140, display: 'flex', alignItems: 'flex-end' }}>
                        <div style={{
                          width: '100%',
                          height: `${altura}px`,
                          background: valor > 0 ? 'var(--clr-neon)' : 'var(--clr-surface)',
                          borderRadius: '4px 4px 0 0',
                        }} />
                      </div>
                      <span style={{ fontSize: '0.6rem', color: 'var(--clr-text-dim)', fontFamily: 'var(--font-mono)' }}>{dia}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 20 }}>Top Clientes</h3>
              {topClientes.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>Sin datos en el periodo seleccionado</p>
              ) : (
                topClientes.map((cliente, index) => {
                  const pct = topClientes[0].monto > 0 ? cliente.monto / topClientes[0].monto * 100 : 0;
                  return (
                    <div key={cliente.nombre + index} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem' }}>
                        <span>{index + 1}. {cliente.nombre}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--clr-neon)' }}>{formatMoney(cliente.monto)}</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--clr-surface)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--clr-neon)', borderRadius: 99 }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop: 20, padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--clr-border)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 14px' }}>Cliente</th>
                    <th style={{ textAlign: 'left', padding: '12px 14px' }}>Inicio</th>
                    <th style={{ textAlign: 'center', padding: '12px 14px' }}>Estado</th>
                    <th style={{ textAlign: 'center', padding: '12px 14px' }}>Pago</th>
                    <th style={{ textAlign: 'right', padding: '12px 14px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {reservas.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--clr-text-muted)' }}>Sin reservas en el periodo</td></tr>
                  ) : (
                    reservas.map(reserva => (
                      <tr key={reserva.id} style={{ borderBottom: '1px solid var(--clr-border)' }}>
                        <td style={{ padding: '10px 14px' }}>{reserva.cliente}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--clr-text-muted)' }}>
                          {new Date(reserva.inicio).toLocaleString('es-CO')}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>{reserva.estado}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>{reserva.pago}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>{formatMoney(reserva.precio)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
