import { useState } from 'react';
import Layout from '@/components/Layout';
import { Plus, Wrench, Calendar, Clock, Trash2 } from 'lucide-react';

// =============================================
// Mantenimiento Page
// =============================================

const mockMant = [
  { id: '1', cancha: 1, fecha: '2024-03-18', horaInicio: '06:00', horaFin: '08:00', descripcion: 'Mantenimiento de césped artificial — recorte y limpieza', proveedor: 'CéspedPro SAS' },
  { id: '2', cancha: 2, fecha: '2024-03-20', horaInicio: '07:00', horaFin: '09:00', descripcion: 'Revisión iluminación LED — reemplazo de 3 focos', proveedor: 'ElectroSport' },
  { id: '3', cancha: 3, fecha: '2024-03-25', horaInicio: '08:00', horaFin: '10:00', descripcion: 'Pintura de líneas y reparación de portería', proveedor: 'DeportesFix' },
];

export default function MantenimientoPage() {
  const [items, setItems] = useState(mockMant);

  return (
    <Layout title="MANTENIMIENTO">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem' }}>
          Programa y controla el mantenimiento de las canchas
        </p>
        <button className="btn btn-primary">
          <Plus size={16} /> Programar mantenimiento
        </button>
      </div>

      {/* Canchas overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[1, 2, 3].map(c => {
          const mantCancha = items.filter(m => m.cancha === c);
          return (
            <div key={c} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 36, height: 36,
                  background: 'rgba(74,222,128,0.1)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--clr-neon)',
                }}>
                  <Wrench size={16} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.05em', fontSize: '1rem' }}>
                    CANCHA {c}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--clr-text-muted)' }}>
                    {mantCancha.length} mantenimiento{mantCancha.length !== 1 ? 's' : ''} prog.
                  </div>
                </div>
              </div>
              <div style={{
                fontSize: '0.75rem',
                padding: '6px 10px',
                background: mantCancha.length > 0 ? 'rgba(251,146,60,0.1)' : 'rgba(74,222,128,0.08)',
                color: mantCancha.length > 0 ? 'var(--clr-warn)' : 'var(--clr-neon)',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'center',
                fontWeight: 600,
              }}>
                {mantCancha.length > 0 ? `Próx: ${mantCancha[0].fecha}` : 'Sin programar'}
              </div>
            </div>
          );
        })}
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(m => (
          <div
            key={m.id}
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--clr-warn)'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--clr-border)'}
          >
            <div style={{
              width: 48, height: 48,
              background: 'rgba(251,146,60,0.1)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--clr-warn)',
              flexShrink: 0,
            }}>
              <Wrench size={20} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                Cancha {m.cancha} — {m.descripcion}
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--clr-text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={11} /> {m.fecha}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} /> {m.horaInicio} – {m.horaFin}
                </span>
                {m.proveedor && (
                  <span style={{ color: 'var(--clr-info)' }}>🏢 {m.proveedor}</span>
                )}
              </div>
            </div>

            <button
              onClick={() => setItems(prev => prev.filter(i => i.id !== m.id))}
              className="btn btn-danger"
              style={{ padding: '6px 10px', flexShrink: 0 }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </Layout>
  );
}
