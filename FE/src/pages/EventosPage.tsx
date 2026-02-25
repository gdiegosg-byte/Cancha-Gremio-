import { useState } from 'react';
import Layout from '@/components/Layout';
import { Plus, Trophy, Users, Calendar, Clock } from 'lucide-react';

// =============================================
// Eventos Page
// =============================================

const mockEventos = [
  {
    id: '1', titulo: 'Torneo Relámpago Semanal',
    tipo: 'torneo', fecha: '2024-03-20', horaInicio: '08:00', horaFin: '18:00',
    cupos: 8, cuposOcupados: 6, precio: 50000, activo: true,
    descripcion: 'Torneo de 8 equipos con formato eliminación directa. Incluye hidratación.',
  },
  {
    id: '2', titulo: 'Liga Nocturna — Marzo',
    tipo: 'liga', fecha: '2024-03-15', horaInicio: '19:00', horaFin: '23:00',
    cupos: 12, cuposOcupados: 12, precio: 35000, activo: true,
    descripcion: 'Liga mensual nocturna. Fase grupos y eliminatorias.',
  },
  {
    id: '3', titulo: 'Día del Niño — Evento Especial',
    tipo: 'evento_especial', fecha: '2024-04-30', horaInicio: '10:00', horaFin: '16:00',
    cupos: 20, cuposOcupados: 8, precio: 0, activo: true,
    descripcion: 'Evento gratuito para niños con actividades lúdicas y mini partidos.',
  },
];

const tipoColors: Record<string, string> = {
  torneo: 'var(--clr-neon)',
  liga: 'var(--clr-info)',
  evento_especial: 'var(--clr-accent)',
  mantenimiento: 'var(--clr-warn)',
};

const tipoLabels: Record<string, string> = {
  torneo: '🏆 Torneo',
  liga: '⚽ Liga',
  evento_especial: '🎉 Evento',
  mantenimiento: '🔧 Mant.',
};

export default function EventosPage() {
  const [tab, setTab] = useState<'proximos' | 'pasados'>('proximos');

  return (
    <Layout title="EVENTOS">
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['proximos', 'pasados'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'}`}
              style={{ textTransform: 'capitalize' }}
            >
              {t === 'proximos' ? 'Próximos' : 'Pasados'}
            </button>
          ))}
        </div>
        <button className="btn btn-primary">
          <Plus size={16} /> Crear evento
        </button>
      </div>

      {/* Events grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {mockEventos.map(ev => {
          const porcentaje = Math.round((ev.cuposOcupados / ev.cupos) * 100);
          const lleno = ev.cuposOcupados >= ev.cupos;
          return (
            <div
              key={ev.id}
              className="card"
              style={{
                transition: 'transform 0.2s, border-color 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLDivElement).style.borderColor = tipoColors[ev.tipo];
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--clr-border)';
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: tipoColors[ev.tipo],
                  background: `${tipoColors[ev.tipo]}15`,
                  padding: '3px 8px',
                  borderRadius: 99,
                }}>
                  {tipoLabels[ev.tipo]}
                </span>
                {lleno ? (
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700,
                    color: 'var(--clr-danger)',
                    background: 'rgba(248,113,113,0.1)',
                    padding: '3px 8px', borderRadius: 99,
                  }}>
                    LLENO
                  </span>
                ) : (
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 600,
                    color: 'var(--clr-neon)',
                    background: 'rgba(74,222,128,0.1)',
                    padding: '3px 8px', borderRadius: 99,
                  }}>
                    ABIERTO
                  </span>
                )}
              </div>

              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>{ev.titulo}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                {ev.descripcion}
              </p>

              {/* Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>
                  <Calendar size={13} /> {ev.fecha}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>
                  <Clock size={13} /> {ev.horaInicio} – {ev.horaFin}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>
                  <Users size={13} /> {ev.cuposOcupados}/{ev.cupos} cupos
                </div>
              </div>

              {/* Progress */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ height: 4, background: 'var(--clr-surface)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${porcentaje}%`,
                    background: lleno ? 'var(--clr-danger)' : tipoColors[ev.tipo],
                    borderRadius: 99,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--clr-neon)' }}>
                  {ev.precio === 0 ? 'GRATIS' : `$${ev.precio.toLocaleString()}`}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                    Editar
                  </button>
                  <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} disabled={lleno}>
                    <Trophy size={12} /> {lleno ? 'Lleno' : 'Inscribir'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
