import { useState } from 'react';
import Layout from '@/components/Layout';
import { Search, Plus, Phone, Mail, CalendarDays } from 'lucide-react';

// =============================================
// Clientes Page
// =============================================

const mockClientes = [
  { id: '1', nombre: 'Carlos Mendoza',  email: 'carlos@email.com', telefono: '3001234567', reservas: 12, monto: 480000, ultimaVisita: '2024-03-10' },
  { id: '2', nombre: 'Laura Torres',    email: 'laura@email.com',  telefono: '3009876543', reservas: 8,  monto: 320000, ultimaVisita: '2024-03-12' },
  { id: '3', nombre: 'Andrés Ruiz',     email: 'andres@email.com', telefono: '3012345678', reservas: 20, monto: 800000, ultimaVisita: '2024-03-14' },
  { id: '4', nombre: 'Sofía Castillo',  email: 'sofia@email.com',  telefono: '3151234567', reservas: 5,  monto: 200000, ultimaVisita: '2024-02-28' },
  { id: '5', nombre: 'Miguel Vargas',   email: 'miguel@email.com', telefono: '3201234567', reservas: 15, monto: 600000, ultimaVisita: '2024-03-13' },
  { id: '6', nombre: 'Valentina Gómez', email: 'vale@email.com',   telefono: '3101234567', reservas: 3,  monto: 120000, ultimaVisita: '2024-03-01' },
];

export default function ClientesPage() {
  const [search, setSearch] = useState('');

  const filtered = mockClientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout title="CLIENTES">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ position: 'relative', maxWidth: 300 }}>
          <Search size={14} style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--clr-text-dim)',
          }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            style={{ paddingLeft: 32 }}
          />
        </div>
        <button className="btn btn-primary">
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      {/* Stats summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        marginBottom: 24,
      }}>
        {[
          { label: 'Total clientes', value: mockClientes.length, color: 'var(--clr-neon)' },
          { label: 'Activos este mes', value: 4, color: 'var(--clr-info)' },
          { label: 'Ingresos generados', value: `$${(mockClientes.reduce((a, c) => a + c.monto, 0) / 1000).toFixed(0)}K`, color: 'var(--clr-accent)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {s.label}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: s.color, letterSpacing: '0.03em' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--clr-surface)' }}>
              {['Cliente', 'Contacto', 'Reservas', 'Total pagado', 'Última visita', 'Acciones'].map(h => (
                <th key={h} style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: 'var(--clr-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '1px solid var(--clr-border)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr
                key={c.id}
                style={{ borderTop: i > 0 ? '1px solid var(--clr-border)' : 'none', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--clr-surface)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36,
                      borderRadius: '50%',
                      background: `hsl(${(i * 60) % 360}, 40%, 25%)`,
                      border: `2px solid hsl(${(i * 60) % 360}, 60%, 45%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.875rem', fontWeight: 700,
                      color: `hsl(${(i * 60) % 360}, 80%, 70%)`,
                      flexShrink: 0,
                    }}>
                      {c.nombre[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.nombre}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--clr-text-muted)' }}>
                      <Mail size={11} /> {c.email}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--clr-text-muted)' }}>
                      <Phone size={11} /> {c.telefono}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.5rem',
                    color: c.reservas >= 15 ? 'var(--clr-neon)' : c.reservas >= 8 ? 'var(--clr-accent)' : 'var(--clr-text-muted)',
                  }}>
                    {c.reservas}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--clr-neon)' }}>
                  ${c.monto.toLocaleString()}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--clr-text-muted)' }}>
                    <CalendarDays size={12} />
                    {c.ultimaVisita}
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '0.75rem' }}>
                      Ver
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: '0.75rem' }}>
                      Editar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
