import { useEffect, useRef, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { reservasApi, ReservationResponse, ReservationUpdate } from '@/api/reservas';
import { fieldsApi, FieldResponse } from '@/api/campos';
import { eventosApi } from '@/api/eventos';
import { tarifasApi, TarifaCalculada } from '@/api/tarifas';
import { todayLocal } from '@/hooks';
import { getHoursInRange } from '@/utils/hours';
import { AlertCircle, Loader, Plus, Trophy, Users, Calendar, Clock, Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

type EventType = 'torneo' | 'liga' | 'evento_especial' | 'reserva';

interface Evento {
  id: string;
  titulo: string;
  tipo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  cupos: number;
  cuposOcupados: number;
  precio?: number;
  activo: boolean;
  descripcion: string;
  cancha_id?: number;
}

// ===== Datos de pago de la empresa (se muestran al tocar Pagar / Abonar en cada fila) =====
const DATOS_PAGO_EMPRESA = {
  titulo: '📲 Datos para realizar el pago',
  notas: 'Envía el pago a cualquiera de estas cuentas y luego regresa a marcar la reserva como pagada.',
  metodos: [
    { tipo: 'Nequi', dato: '301 567 8901', titular: 'Cancha Mixta Colombia S.A.S', etiqueta: 'Nequi' },
    { tipo: 'Bancolombia Ahorros', dato: '123 456 789 01', titular: 'Cancha Mixta Colombia S.A.S', etiqueta: 'Bancolombia' },
    { tipo: 'Efectivo', dato: 'En caja del complejo', titular: 'Cancha Mixta Colombia S.A.S', etiqueta: 'Efectivo' },
  ] as const,
  totalLabel: 'Valor a registrar',
};

const initialEventos: Evento[] = [
  {
    id: '1', titulo: 'Liga Nocturna — Septiembre',
    tipo: 'liga', fecha: '2026-09-10', horaInicio: '19:00', horaFin: '23:00',
    cupos: 12, cuposOcupados: 8, precio: 35000, activo: true,
    descripcion: 'Liga mensual nocturna de septiembre. Fase grupos y eliminatorias.',
  },
  {
    id: '2', titulo: 'Torneo Relámpago Semanal',
    tipo: 'torneo', fecha: '2026-09-12', horaInicio: '08:00', horaFin: '14:00',
    cupos: 8, cuposOcupados: 5, precio: 50000, activo: true,
    descripcion: 'Torneo de 8 equipos con formato eliminación directa.',
  },
  {
    id: '3', titulo: 'Día del Niño — Evento Especial',
    tipo: 'evento_especial', fecha: '2026-09-20', horaInicio: '10:00', horaFin: '16:00',
    cupos: 20, cuposOcupados: 8, precio: 0, activo: true,
    descripcion: 'Evento gratuito para niños con actividades lúdicas y mini partidos.',
  },
];

const tipoColors: Record<string, string> = {
  torneo: '#4ade80',
  liga: '#60a5fa',
  evento_especial: '#a78bfa',
  reserva: '#a0aec0',
};

const tipoLabels: Record<string, string> = {
  torneo: 'Torneo',
  liga: 'Liga',
  evento_especial: 'Evento Esp.',
  reserva: 'Reserva',
};

const tipoIcons: Record<string, React.ReactNode> = {
  torneo: <Trophy size={18} />,
  liga: <Calendar size={18} />,
  evento_especial: <Users size={18} />,
  reserva: <Clock size={18} />,
};

function detectEventType(res: ReservationResponse): EventType {
  const name = (res.client_name || '').toLowerCase();
  if (name.includes('torneo')) return 'torneo';
  if (name.includes('liga')) return 'liga';
  if (name.includes('evento') || name.includes('especial')) return 'evento_especial';
  return 'reserva';
}

function nextHour(slot: string): string {
  const h = Number.parseInt(slot.split(':')[0], 10) + 1;
  return `${h.toString().padStart(2, '0')}:00`;
}

function isSlotReserved(slot: string, dateStr: string, fieldId: number, reservations: ReservationResponse[]): boolean {
  const slotStart = new Date(`${dateStr}T${slot}`);
  const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
  return reservations.some(r => {
    if (r.field_id !== fieldId || r.status === 'cancelled') return false;
    const rStart = new Date(r.start_time);
    const rEnd = new Date(r.end_time);
    return rStart < slotEnd && rEnd > slotStart;
  });
}

export default function ReservasPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reservas, setReservas] = useState<ReservationResponse[]>([]);
  const [campos, setCampos] = useState<FieldResponse[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<EventType | 'all'>('all');

  // Create reservation modal
  const [showCreate, setShowCreate] = useState(false);
  // Panel de pago por fila: id de la reserva cuyo botón Pagar/Abonar está abierto + estado destino
  const [openPayRow, setOpenPayRow] = useState<number | null>(null);
  const [payTargetStatus, setPayTargetStatus] = useState<'paid' | 'partial'>('paid');
  const [creating, setCreating] = useState(false);
  // Fila recién creada: para hacerle scroll y resaltar su botón Pagar
  const rowRefs = useRef<Record<number, HTMLTableRowElement | null>>({});
  // Búsqueda, orden y paginación
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;
  // Fecha de la grilla de disponibilidad
  const [gridDate, setGridDate] = useState(todayLocal());

  const [newReserva, setNewReserva] = useState({
    client_name: user?.nombre || '',
    client_email: user?.email || '',
    client_phone: user?.telefono || '',
    field_id: 1,
    start_date: '',
    start_time: '08:00',
    end_time: '09:00',
    event_type: 'reserva' as EventType,
    payment_status: 'pending',
  });
  const [estimado, setEstimado] = useState<TarifaCalculada | null>(null);

  // Estimación en vivo del precio según la tarifa por franja horaria
  useEffect(() => {
    let alive = true;
    const startDate = newReserva.start_date;
    if (!startDate || !newReserva.start_time || !newReserva.end_time) {
      setEstimado(null);
      return;
    }
    const start = `${startDate}T${newReserva.start_time}:00`;
    const end = `${startDate}T${newReserva.end_time}:00`;
    tarifasApi.calcular({ start, end, field_id: newReserva.field_id })
      .then(res => { if (alive) setEstimado(res.data); })
      .catch(() => {
        if (!alive) return;
        const field = campos.find(c => c.id === newReserva.field_id);
        if (field) {
          const hours = Math.max((new Date(end).getTime() - new Date(start).getTime()) / 3600000, 1);
          setEstimado({
            tier: null, tier_name: null,
            price_per_hour: field.price_per_hour,
            hours: Math.round(hours * 100) / 100,
            total_price: field.price_per_hour * hours,
          });
        } else {
          setEstimado(null);
        }
      });
    return () => { alive = false; };
  }, [newReserva.start_date, newReserva.start_time, newReserva.end_time, newReserva.field_id, campos]);

  // Validación en tiempo real del horario
  const horarioError =
    newReserva.start_time && newReserva.end_time
      ? (newReserva.end_time <= newReserva.start_time ? 'La hora de fin debe ser posterior a la de inicio' : '')
      : '';

  // Validación de fecha: no puede ser pasada
  const todayStr = todayLocal();
  const fechaError = newReserva.start_date
    ? (newReserva.start_date < todayStr ? 'La fecha no puede ser anterior a hoy' : '')
    : '';

  // Validación de teléfono: 7–20 dígitos (y caracteres +, espacios ok)
  const phoneClean = newReserva.client_phone.replace(/[^0-9+]/g, '');
  const telefonoError = newReserva.client_phone
    ? (phoneClean.length < 7 || phoneClean.length > 20
        ? 'Ingresa un teléfono válido (mínimo 7 dígitos)'
        : '')
    : '';

  const formOk =
    newReserva.client_name.trim().length >= 3 &&
    newReserva.client_email.includes('@') &&
    phoneClean.length >= 7 &&
    newReserva.start_date >= todayStr &&
    newReserva.start_time &&
    newReserva.end_time &&
    newReserva.end_time > newReserva.start_time &&
    !fechaError &&
    !telefonoError;

  // --- Disponibilidad de canchas en el horario elegido ---
  const selectedSlot =
    newReserva.start_date && newReserva.start_time && newReserva.end_time
      ? {
          s: new Date(`${newReserva.start_date}T${newReserva.start_time}:00`),
          e: new Date(`${newReserva.start_date}T${newReserva.end_time}:00`),
        }
      : null;

  function overlaps(a: Date, b: Date): boolean {
    if (!selectedSlot) return false;
    return a < selectedSlot.e && b > selectedSlot.s;
  }

  function getConflict(field: FieldResponse): { ocupado: boolean; motivo: string; ocupadoPor: ReservationResponse | null; estado: string } {
    if (!selectedSlot || !!horarioError || !!fechaError) {
      return { ocupado: false, motivo: '', ocupadoPor: null, estado: '' };
    }
    const byReserva = reservas.find(r =>
      r.field_id === field.id &&
      r.status !== 'cancelled' &&
      overlaps(new Date(r.start_time), new Date(r.end_time))
    );
    if (byReserva) {
      const ini = new Date(byReserva.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const fin = new Date(byReserva.end_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      return { ocupado: true, motivo: `Reserva de ${byReserva.client_name} (${ini} - ${fin})`, ocupadoPor: byReserva, estado: byReserva.status };
    }
    const byEvento = eventos.find(ev =>
      Number(ev.cancha_id) === field.id &&
      ev.fecha === newReserva.start_date &&
      overlaps(
        new Date(`${ev.fecha}T${ev.horaInicio}:00`),
        new Date(`${ev.fecha}T${ev.horaFin}:00`)
      )
    );
    if (byEvento) {
      return { ocupado: true, motivo: `Ocupada por: ${byEvento.titulo}`, ocupadoPor: null, estado: '' };
    }
    return { ocupado: false, motivo: '', ocupadoPor: null, estado: '' };
  }

  const selectedField = campos.find(c => c.id === newReserva.field_id);
  const selectedConflict = selectedField ? getConflict(selectedField) : { ocupado: false, motivo: '' };
  const canchasDisponibles = campos.filter(c => c.is_active && !getConflict(c).ocupado);

  // Si la cancha seleccionada queda ocupada al cambiar fecha/hora, elegir la primera libre
  useEffect(() => {
    if (selectedSlot && selectedConflict.ocupado && canchasDisponibles.length > 0) {
      setNewReserva(prev => ({ ...prev, field_id: canchasDisponibles[0].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlot?.s?.getTime(), selectedSlot?.e?.getTime()]);

  useEffect(() => {
    const loadAll = async (silent: boolean) => {
      if (!silent) setLoading(true);
      try {
        const [reservasRes, camposRes] = await Promise.all([
          reservasApi.getAll(),
          fieldsApi.getAll(),
        ]);
        setReservas(reservasRes.data || []);
        setCampos(camposRes.data || []);

        try {
          const eventosRes = await eventosApi.getAll();
          if (eventosRes.data && Array.isArray(eventosRes.data) && eventosRes.data.length > 0) {
            setEventos(eventosRes.data);
          } else {
            setEventos(initialEventos);
          }
        } catch {
          setEventos(initialEventos);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };

    loadAll(false);

    // Refresca en silencio al volver a la pestaña, para ver los cambios que haga el admin
    const onFocus = () => loadAll(true);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const typeCounts: Record<string, number> = {
    torneo: eventos.filter(e => e.tipo === 'torneo').length,
    liga: eventos.filter(e => e.tipo === 'liga').length,
    evento_especial: eventos.filter(e => e.tipo === 'evento_especial').length,
    reserva: reservas.filter(r => detectEventType(r) === 'reserva').length,
  };

  const filteredReservas = activeType === 'all'
    ? reservas
    : reservas.filter(r => detectEventType(r) === activeType);

  const searchedReservas = filteredReservas.filter(r =>
    `${r.client_name} ${r.client_email} ${r.client_phone}`.toLowerCase().includes(search.toLowerCase())
  );

  const sortedReservas = [...searchedReservas].sort((a, b) => {
    const diffId = (b.id ?? 0) - (a.id ?? 0);
    return sortDir === 'asc' ? -diffId : diffId;
  });

  const totalPages = Math.max(1, Math.ceil(sortedReservas.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageReservas = sortedReservas.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const mapStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      confirmed: '#4ade80',
      pending: '#facc15',
      cancelled: '#ef4444',
    };
    return colors[status] || '#a0aec0';
  };

  const mapStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      confirmed: 'Activa',
      pending: 'Pendiente',
      cancelled: 'Cancelada',
    };
    return labels[status] || status;
  };

  const mapPaymentLabel = (status: string): string => {
    const labels: Record<string, string> = {
      partial: 'Abonado',
      paid: 'Pago completo',
      pending: 'Pendiente',
      cancelled: 'Cancelado',
      refunded: 'Reembolsado',
    };
    return labels[status] || status;
  };

  const mapPaymentColor = (status: string): string => {
    const colors: Record<string, string> = {
      partial: '#facc15',
      paid: '#4ade80',
      pending: '#a0aec0',
      cancelled: '#ef4444',
      refunded: '#a78bfa',
    };
    return colors[status] || '#a0aec0';
  };

  const isMyReservation = (res: ReservationResponse): boolean =>
    !!user && res.client_email.toLowerCase() === (user.email || '').toLowerCase();

  function occupantOf(field: FieldResponse, slot: string): ReservationResponse | null {
    const slotStart = new Date(`${gridDate}T${slot}`);
    if (Number.isNaN(slotStart.getTime())) return null;
    const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
    return reservas.find(r =>
      r.field_id === field.id &&
      r.status !== 'cancelled' &&
      new Date(r.start_time) < slotEnd &&
      new Date(r.end_time) > slotStart
    ) || null;
  }

  function handleSelectSlot(field: FieldResponse, slot: string) {
    setNewReserva(prev => ({
      ...prev,
      field_id: field.id,
      start_date: gridDate,
      start_time: slot,
      end_time: nextHour(slot),
      client_name: user?.nombre || prev.client_name,
      client_email: user?.email || prev.client_email,
      client_phone: user?.telefono || prev.client_phone,
    }));
    setShowCreate(true);
  }

  async function handleCancelReservation(id: number) {
    if (!window.confirm('¿Cancelar esta reserva? La cancha quedará disponible para otros usuarios.')) return;
    try {
      await reservasApi.cancel(id);
      toast('Reserva cancelada correctamente', 'success');
      const res = await reservasApi.getAll();
      setReservas(res.data || []);
    } catch (err: any) {
      toast(err?.response?.data?.detail || 'Error al cancelar la reserva', 'error');
    }
  }

  async function handleUpdatePayment(id: number, status: string) {
    try {
      await reservasApi.update(id, { payment_status: status } as ReservationUpdate);
      toast(status === 'paid' ? 'Pago registrado: Pago completo' : 'Pago registrado: Abono', 'success');
      const res = await reservasApi.getAll();
      setReservas(res.data || []);
    } catch (err: any) {
      toast(err?.response?.data?.detail || 'Error al actualizar el pago', 'error');
    }
  }

  async function handleCreateReserva(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const startDateTime = `${newReserva.start_date}T${newReserva.start_time}:00`;
      const endDateTime = `${newReserva.start_date}T${newReserva.end_time}:00`;
      const createdRes = await reservasApi.create({
        field_id: newReserva.field_id,
        client_name: newReserva.client_name,
        client_email: newReserva.client_email,
        client_phone: newReserva.client_phone,
        start_time: startDateTime,
        end_time: endDateTime,
        payment_status: newReserva.payment_status,
      });
      const pago = newReserva.payment_status === 'paid'
        ? 'Pago completo registrado.'
        : newReserva.payment_status === 'partial'
          ? 'Abono inicial registrado.'
          : 'Quedó pendiente de pago.';
      toast(`Reserva creada exitosamente. ${pago}`, 'success');
      const createdId = (createdRes?.data?.id ?? null) as number | null;
      setShowCreate(false);
      setOpenPayRow(createdId);
      setPayTargetStatus('paid');
      setActiveType('all');
      setSearch('');
      setPage(1);
      const res = await reservasApi.getAll();
      setReservas(res.data || []);
      const createdResId = createdRes?.data?.id ?? null;
      const row = rowRefs.current[createdResId];
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('flash-row');
        setTimeout(() => row.classList.remove('flash-row'), 2600);
      }
    } catch (err: any) {
      toast(err?.response?.data?.detail || 'Error al crear la reserva', 'error');
    } finally {
      setCreating(false);
    }
  }

  const typeCards: { key: EventType | 'all'; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'torneo', label: 'Torneos' },
    { key: 'liga', label: 'Ligas' },
    { key: 'evento_especial', label: 'Eventos' },
    { key: 'reserva', label: 'Reservas' },
  ];

  return (
    <Layout title="RESERVAS">
      {/* Type overview cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {typeCards.map(tc => {
          const isActive = activeType === tc.key;
          const count = tc.key === 'all' ? reservas.length : (typeCounts[tc.key] || 0);
          const color = tc.key === 'all' ? 'var(--clr-text)' : (tipoColors[tc.key] || '#a0aec0');
          return (
            <button
              key={tc.key}
              onClick={() => setActiveType(tc.key)}
              className="card"
              style={{
                padding: '14px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                border: isActive ? `2px solid ${color}` : '1px solid var(--clr-border)',
                background: isActive ? `${color}08` : 'var(--clr-bg-card)',
                transition: 'all 0.15s',
                width: '100%',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ color }}>{tc.key !== 'all' && tipoIcons[tc.key]}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--clr-text-muted)' }}>{tc.label}</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{count}</div>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', maxWidth: 260 }}>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Filtrar por nombre del cliente..."
              style={{ paddingLeft: 32, fontSize: '0.8rem' }}
            />
            <Search size={14} style={{
              position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--clr-text-dim)',
            }} />
          </div>
          <button
            onClick={() => { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); setPage(1); }}
            className="btn btn-ghost"
            style={{ padding: '8px 12px', fontSize: '0.75rem' }}
            title="Ordenar por fecha de inicio"
          >
            <ArrowUpDown size={14} />
            Fecha {sortDir === 'asc' ? '↑' : '↓'}
          </button>
          <div style={{ fontSize: '0.9rem', color: 'var(--clr-text-muted)' }}>
            {sortedReservas.length} resultado(s)
            {activeType !== 'all' && ` · ${tipoLabels[activeType] || activeType}`}
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ padding: '8px 16px' }}>
          <Plus size={16} /> Nueva reserva
        </button>
      </div>

      {/* Disponibilidad de canchas */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--clr-text)' }}>
            Disponibilidad de canchas
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.72rem', color: 'var(--clr-text-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: '#4ade8020', border: '1px solid #4ade8080', display: 'inline-block' }} /> Libre
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: '#ef444420', border: '1px solid #ef444480', display: 'inline-block' }} /> Ocupada
              </span>
            </div>
            <input
              type="date"
              value={gridDate}
              onChange={e => setGridDate(e.target.value)}
              min={todayStr}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--clr-border)', background: 'var(--clr-surface)', color: 'var(--clr-text)', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {campos.filter(c => c.is_active).length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-dim)', padding: '8px 12px', background: 'var(--clr-surface)', borderRadius: 6, border: '1px dashed var(--clr-border)' }}>
            No hay canchas registradas.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {campos.filter(c => c.is_active).map(campo => {
              const allHours = getHoursInRange(campo.available_hour_start, campo.available_hour_end);
              return (
                <div key={campo.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{campo.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--clr-text-dim)' }}>
                      ${campo.price_per_hour.toLocaleString('es-CO')}/h · {campo.available_hour_start} - {campo.available_hour_end}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {allHours.map(hour => {
                      const reserved = isSlotReserved(hour, gridDate, campo.id, reservas);
                      const ocupante = occupantOf(campo, hour);
                      const ini = ocupante ? new Date(ocupante.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
                      const fin = ocupante ? new Date(ocupante.end_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
                      return (
                        <button
                          key={hour}
                          type="button"
                          disabled={reserved}
                          onClick={() => handleSelectSlot(campo, hour)}
                          title={ocupante
                            ? `Ocupada: ${ocupante.client_name} (${ini} - ${fin}) · ${mapStatusLabel(ocupante.status)}`
                            : `Libre (${hour}). Haz clic para reservar.`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                            fontSize: '0.75rem', fontWeight: 600,
                            background: reserved ? '#ef444420' : '#4ade8020',
                            color: reserved ? '#ef4444' : '#4ade80',
                            border: `1px solid ${reserved ? '#ef444430' : '#4ade8030'}`,
                            cursor: reserved ? 'not-allowed' : 'pointer',
                            opacity: reserved ? 0.9 : 1,
                          }}
                        >
                          {reserved ? <AlertCircle size={11} /> : <Plus size={11} />}
                          {hour}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--clr-text-muted)' }}>
          <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
          Cargando reservas...
        </div>
      ) : error ? (
        <div className="card" style={{ background: 'rgba(239,68,68,0.1)', borderLeft: '4px solid #ef4444', padding: 20, display: 'flex', alignItems: 'center', gap: 12, color: '#ef4444' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      ) : filteredReservas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--clr-text-muted)' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: 8 }}>No hay reservas de este tipo</p>
          <p style={{ fontSize: '0.9rem' }}>Las reservas aparecerán aquí cuando se creen</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead style={{ background: 'var(--clr-bg-alt)' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--clr-text-muted)' }}>ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--clr-text-muted)' }}>Tipo</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--clr-text-muted)' }}>Cancha</th>
                  <th
                    onClick={() => { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); setPage(1); }}
                    style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--clr-text-muted)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                    title="Ordenar por fecha"
                  >
                    Inicio {sortDir === 'asc' ? '↑' : '↓'}
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--clr-text-muted)' }}>Fin</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--clr-text-muted)' }}>Precio</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--clr-text-muted)' }}>Pago</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--clr-text-muted)' }}>Estado</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--clr-text-muted)' }}>Cliente</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--clr-text-muted)' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {pageReservas.map((res) => {
                  const tipo = detectEventType(res);
                  return (
                    <tr
                      ref={el => { rowRefs.current[res.id] = el; }}
                      key={res.id} style={{ borderTop: '1px solid var(--clr-border)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--clr-bg-alt)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', color: 'var(--clr-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{res.id}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 600, color: tipoColors[tipo], background: `${tipoColors[tipo]}15` }}>
                          {tipoLabels[tipo]}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 600 }}>
                        {campos.find(c => c.id === res.field_id)?.name || `Cancha ${res.field_id}`}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                        {new Date(res.start_time).toLocaleString('es-ES', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                        {new Date(res.end_time).toLocaleString('es-ES', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#4ade80' }}>
                        ${res.total_price.toLocaleString('es-ES')}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, background: mapPaymentColor(res.payment_status) + '20', color: mapPaymentColor(res.payment_status) }}>
                          {mapPaymentLabel(res.payment_status)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, background: mapStatusColor(res.status) + '20', color: mapStatusColor(res.status) }}>
                          {mapStatusLabel(res.status)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>
                        {res.client_name}
                        {user?.rol === 'admin' && (
                          <div style={{ fontSize: '0.7rem' }}>{res.client_phone}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {res.status !== 'cancelled' ? (
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            onClick={() => { setOpenPayRow(prev => prev === res.id ? null : res.id); setPayTargetStatus('paid'); }}
                            style={{
                              padding: '4px 12px', fontSize: '0.68rem', fontWeight: 700,
                              border: '1px solid #4ade8040', borderRadius: 'var(--radius-sm)',
                              background: '#4ade8010', color: '#4ade80', cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            Pagar
                          </button>
                          <button
                            onClick={() => { setOpenPayRow(prev => prev === res.id ? null : res.id); setPayTargetStatus('partial'); }}
                            style={{
                              padding: '4px 10px', fontSize: '0.68rem', fontWeight: 700,
                              border: '1px solid #facc1540', borderRadius: 'var(--radius-sm)',
                              background: '#facc1510', color: '#facc15', cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            Abonar
                          </button>
                        {openPayRow === res.id && (
                          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 16, right: 16, zIndex: 20, borderRadius: 'var(--radius-sm)', border: '1px solid var(--clr-border)', background: 'var(--clr-surface)', boxShadow: '0 14px 40px rgba(0,0,0,0.5)', padding: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                              <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Datos de pago de la empresa</div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--clr-text-muted)' }}>
                                  Dispón el pago y confirma para registrar {payTargetStatus === 'paid' ? 'el pago completo' : 'el abono'}.
                                </div>
                              </div>
                              <button onClick={() => setOpenPayRow(null)} style={{ background: 'transparent', border: 'none', color: 'var(--clr-text-dim)', fontSize: '0.9rem', cursor: 'pointer' }}>✕</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                              {DATOS_PAGO_EMPRESA.metodos.map(m => (
                                <div key={m.tipo} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--clr-border)', background: 'var(--clr-bg-alt)' }}>
                                  <div style={{ minWidth: 110 }}>
                                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--clr-neon)' }}>{m.tipo}</div>
                                    <div style={{ fontSize: '0.62rem', color: 'var(--clr-text-muted)' }}>{m.etiqueta}</div>
                                  </div>
                                  <div style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 600 }}>{m.dato}</div>
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => { handleUpdatePayment(res.id, payTargetStatus); setOpenPayRow(null); }}
                              style={{
                                width: '100%', marginTop: 12, padding: '10px', fontSize: '0.78rem', fontWeight: 700,
                                border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                background: payTargetStatus === 'paid' ? '#4ade80' : '#facc15',
                                color: payTargetStatus === 'paid' ? '#06280f' : '#1a1400',
                              }}
                            >
                              {payTargetStatus === 'paid' ? 'Registrar cobro completo' : 'Registrar abono'}
                            </button>
                          </div>
                        )}
                            {(user?.rol === 'admin' || isMyReservation(res)) && (
                              <button
                                onClick={() => handleCancelReservation(res.id)}
                                style={{
                                  padding: '4px 10px', fontSize: '0.68rem', fontWeight: 600,
                                  border: '1px solid #ef444440', borderRadius: 'var(--radius-sm)',
                                  background: '#ef444410', color: '#ef4444', cursor: 'pointer',
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                }}
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'var(--clr-text-dim)' }}>
                            {res.status === 'cancelled' ? '—' : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--clr-border)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>
                Mostrando {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sortedReservas.length)} de {sortedReservas.length}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="btn btn-ghost"
                  style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                >
                  <ChevronLeft size={14} /> Anterior
                </button>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', padding: '6px 12px',
                  fontSize: '0.8rem', background: 'var(--clr-surface)', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--clr-border)', fontFamily: 'var(--font-mono)',
                }}>
                  {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="btn btn-ghost"
                  style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                >
                  Siguiente <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create reservation modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: '#070a0e', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 20,
        }}>
          <div className="card fade-up" style={{ width: '100%', maxWidth: 460, padding: 24, position: 'relative', maxHeight: '92vh', overflowY: 'auto' }}>
            <button onClick={() => setShowCreate(false)} style={{ position: 'absolute', top: 14, right: 14, background: 'transparent', border: 'none', color: 'var(--clr-text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', letterSpacing: '0.05em', marginBottom: 16, color: 'var(--clr-neon)' }}>
              NUEVA RESERVA
            </h2>

            <form onSubmit={handleCreateReserva} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="req" style={{ fontSize: '0.72rem', marginBottom: 4, display: 'block', color: 'var(--clr-text-muted)' }}>Cancha</label>
                <select
                  value={newReserva.field_id}
                  onChange={e => setNewReserva(prev => ({ ...prev, field_id: Number(e.target.value) }))}
                  style={{ width: '100%', background: 'var(--clr-surface)', border: '1px solid var(--clr-border)', borderRadius: 4, color: 'var(--clr-text)', padding: 9, fontSize: '0.85rem' }}
                >
                  {campos.filter(c => c.is_active).map(c => {
                    const conf = getConflict(c);
                    const libre = !conf.ocupado;
                    return (
                      <option key={c.id} value={c.id} disabled={!libre}>
                        {c.name} — {libre ? '✓ Libre' : '✗ Ocupada'} · ${c.price_per_hour.toLocaleString('es-CO')}/h
                      </option>
                    );
                  })}
                </select>
                {selectedConflict.ocupado && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--clr-danger)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '7px 10px', marginTop: 6 }}>
                    ⚠ {selectedConflict.motivo}. Elige otra cancha libre.
                  </div>
                )}
              </div>

              <div>
                <label className="req" style={{ fontSize: '0.72rem', marginBottom: 4, display: 'block', color: 'var(--clr-text-muted)' }}>Fecha</label>
                <input type="date" value={newReserva.start_date} min={todayStr} onChange={e => setNewReserva(prev => ({ ...prev, start_date: e.target.value }))} required style={{ width: '100%', fontSize: '0.85rem' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="req" style={{ fontSize: '0.72rem', marginBottom: 4, display: 'block', color: 'var(--clr-text-muted)' }}>Hora inicio</label>
                  <input type="time" value={newReserva.start_time} onChange={e => setNewReserva(prev => ({ ...prev, start_time: e.target.value }))} required style={{ width: '100%', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label className="req" style={{ fontSize: '0.72rem', marginBottom: 4, display: 'block', color: 'var(--clr-text-muted)' }}>Hora fin</label>
                  <input type="time" value={newReserva.end_time} onChange={e => setNewReserva(prev => ({ ...prev, end_time: e.target.value }))} required style={{ width: '100%', fontSize: '0.85rem' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', marginBottom: 6, display: 'block', color: 'var(--clr-text-muted)' }}>
                  Método de pago
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setNewReserva(prev => ({ ...prev, payment_status: 'paid' }))}
                    style={{
                      flex: 1, padding: '12px 10px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                      border: '2px solid #4ade80', borderRadius: 'var(--radius-sm)',
                      background: newReserva.payment_status === 'paid' ? '#4ade80' : '#4ade8010',
                      color: newReserva.payment_status === 'paid' ? '#04170a' : '#4ade80',
                    }}
                  >
                    Pago completo
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewReserva(prev => ({ ...prev, payment_status: 'partial' }))}
                    style={{
                      flex: 1, padding: '12px 10px', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                      border: '2px solid #facc15', borderRadius: 'var(--radius-sm)',
                      background: newReserva.payment_status === 'partial' ? '#facc15' : '#facc1510',
                      color: newReserva.payment_status === 'partial' ? '#1a1400' : '#facc15',
                    }}
                  >
                    Abono inicial
                  </button>
                </div>
              </div>

              {horarioError && (
                <div style={{ fontSize: '0.72rem', color: 'var(--clr-danger)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '7px 10px' }}>
                  {horarioError}
                </div>
              )}
              {fechaError && (
                <div style={{ fontSize: '0.72rem', color: 'var(--clr-danger)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '7px 10px' }}>
                  {fechaError}
                </div>
              )}
              {telefonoError && (
                <div style={{ fontSize: '0.72rem', color: 'var(--clr-danger)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '7px 10px' }}>
                  {telefonoError}
                </div>
              )}

              {estimado && (
                <div style={{
                  fontSize: '0.78rem', padding: '9px 11px', borderRadius: 8,
                  background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ color: 'var(--clr-text-muted)' }}>
                      {'📍 ' + (campos.find(c => c.id === newReserva.field_id)?.name || 'Cancha')}
                    </span>
                    <span style={{ color: 'var(--clr-neon)', fontWeight: 700 }}>
                      ${Math.round(estimado.price_per_hour).toLocaleString('es-CO')}/hora
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--clr-text-dim)' }}>{estimado.hours} hora(s)</span>
                    <span style={{ color: '#fff', fontWeight: 700 }}>
                      Total: ${Math.round(estimado.total_price).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="req" style={{ fontSize: '0.72rem', marginBottom: 4, display: 'block', color: 'var(--clr-text-muted)' }}>Nombre</label>
                  <input value={newReserva.client_name} onChange={e => setNewReserva(prev => ({ ...prev, client_name: e.target.value }))} required placeholder="Nombre del cliente" style={{ width: '100%', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label className="req" style={{ fontSize: '0.72rem', marginBottom: 4, display: 'block', color: 'var(--clr-text-muted)' }}>Teléfono</label>
                  <input value={newReserva.client_phone} onChange={e => setNewReserva(prev => ({ ...prev, client_phone: e.target.value }))} required placeholder="3001234567" style={{ width: '100%', fontSize: '0.85rem' }} />
                </div>
              </div>

              <div>
                <label className="req" style={{ fontSize: '0.72rem', marginBottom: 4, display: 'block', color: 'var(--clr-text-muted)' }}>Email</label>
                <input type="email" value={newReserva.client_email} onChange={e => setNewReserva(prev => ({ ...prev, client_email: e.target.value }))} required placeholder="cliente@email.com" style={{ width: '100%', fontSize: '0.85rem' }} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancelar</button>
                <button type="submit" disabled={creating || !!horarioError || !!fechaError || !!telefonoError || !formOk || selectedConflict.ocupado || (!!selectedSlot && canchasDisponibles.length === 0)} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  {creating ? <Loader size={16} /> : 'Crear reserva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
