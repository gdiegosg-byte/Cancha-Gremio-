import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Search, Plus, Phone, Mail, CalendarDays, X, Loader2, UserCheck, UserX } from 'lucide-react';
import { usersApi } from '@/api/auth';
import { useToast } from '@/context/ToastContext';

interface Cliente {
  id_usuario: number;
  nombre: string;
  correo: string;
  telefono: string;
  estado: string;
  fecha_registro: string;
  total_reservas: number;
}

export default function ClientesPage() {
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    correo: '',
    telefono: '',
  });

  async function fetchClientes() {
    try {
      setLoading(true);
      const res = await usersApi.getAll();
      setClientes(res.data);
    } catch (error) {
      toast('Error al cargar la lista de clientes', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClientes();
  }, []);

  const filtered = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.correo.toLowerCase().includes(search.toLowerCase())
  );

  function handleOpenView(cliente: Cliente) {
    setSelectedCliente(cliente);
    setIsEditMode(false);
  }

  function handleOpenEdit(cliente: Cliente) {
    setSelectedCliente(cliente);
    setIsEditMode(true);
    setForm({
      nombre: cliente.nombre,
      correo: cliente.correo,
      telefono: cliente.telefono || '',
    });
  }

  function handleCloseModal() {
    setSelectedCliente(null);
    setIsEditMode(false);
  }

  async function handleToggleStatus(cliente: Cliente) {
    const nuevoEstado = cliente.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      await usersApi.toggleEstado(cliente.id_usuario, nuevoEstado);
      toast(`Cliente ${nuevoEstado === 'activo' ? 'activado' : 'desactivado'} correctamente`, 'success');
      
      // Update local state
      setClientes(prev =>
        prev.map(c =>
          c.id_usuario === cliente.id_usuario ? { ...c, estado: nuevoEstado } : c
        )
      );
      if (selectedCliente && selectedCliente.id_usuario === cliente.id_usuario) {
        setSelectedCliente(prev => prev ? { ...prev, estado: nuevoEstado } : null);
      }
    } catch (error) {
      toast('Error al cambiar el estado del cliente', 'error');
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCliente) return;
    setSaving(true);
    try {
      await usersApi.update(selectedCliente.id_usuario, form);
      toast('Cliente actualizado exitosamente', 'success');
      handleCloseModal();
      fetchClientes();
    } catch (error: any) {
      const msg = error.response?.data?.detail || 'Error al actualizar el cliente';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="CLIENTES">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
          <Search size={14} style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--clr-text-dim)',
          }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            style={{ paddingLeft: 32, width: '100%' }}
          />
        </div>
      </div>

      {/* Stats summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        marginBottom: 24,
      }}>
        {[
          { label: 'Total clientes', value: clientes.length, color: 'var(--clr-neon)' },
          { label: 'Clientes activos', value: clientes.filter(c => c.estado === 'activo').length, color: 'var(--clr-info)' },
          { label: 'Clientes inactivos', value: clientes.filter(c => c.estado === 'inactivo').length, color: 'var(--clr-accent)' },
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
      <div className="card" style={{ padding: 0, overflow: 'hidden', minHeight: 200, display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 }}>
            <Loader2 className="animate-spin" size={32} style={{ color: 'var(--clr-neon)' }} />
            <span style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem' }}>Cargando clientes...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--clr-text-muted)' }}>
            No se encontraron clientes.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--clr-surface)' }}>
                {['Cliente', 'Contacto', 'Estado', 'Fecha Registro', 'Acciones'].map(h => (
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
                  key={c.id_usuario}
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
                        <Mail size={11} /> {c.correo}
                      </div>
                      {c.telefono && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--clr-text-muted)' }}>
                          <Phone size={11} /> {c.telefono}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      background: c.estado === 'activo' ? 'rgba(0, 224, 150, 0.1)' : 'rgba(255, 75, 75, 0.1)',
                      color: c.estado === 'activo' ? 'var(--clr-neon)' : 'var(--clr-accent)',
                      border: `1px solid ${c.estado === 'activo' ? 'rgba(0, 224, 150, 0.2)' : 'rgba(255, 75, 75, 0.2)'}`,
                    }}>
                      {c.estado}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--clr-text-muted)' }}>
                      <CalendarDays size={12} />
                      {c.fecha_registro || 'N/A'}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button 
                        onClick={() => handleOpenView(c)}
                        className="btn btn-ghost" 
                        style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                      >
                        Ver
                      </button>
                      <button 
                        onClick={() => handleOpenEdit(c)}
                        className="btn btn-ghost" 
                        style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Ver / Editar */}
      {selectedCliente && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20,
        }}>
          <div className="card fade-up" style={{
            width: '100%',
            maxWidth: 480,
            padding: 28,
            position: 'relative',
            border: '1px solid var(--clr-border)',
          }}>
            {/* Close Button */}
            <button 
              onClick={handleCloseModal}
              style={{
                position: 'absolute',
                top: 16, right: 16,
                background: 'transparent',
                border: 'none',
                color: 'var(--clr-text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            {/* Modal Title */}
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.4rem',
              letterSpacing: '0.05em',
              marginBottom: 20,
              color: 'var(--clr-neon)',
            }}>
              {isEditMode ? 'EDITAR CLIENTE' : 'DETALLE DEL CLIENTE'}
            </h2>

            {isEditMode ? (
              /* Edit Form */
              <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', marginBottom: 6, display: 'block', color: 'var(--clr-text-muted)' }}>
                    Nombre Completo
                  </label>
                  <input
                    value={form.nombre}
                    onChange={e => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', marginBottom: 6, display: 'block', color: 'var(--clr-text-muted)' }}>
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={form.correo}
                    onChange={e => setForm(prev => ({ ...prev, correo: e.target.value }))}
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', marginBottom: 6, display: 'block', color: 'var(--clr-text-muted)' }}>
                    Teléfono
                  </label>
                  <input
                    value={form.telefono}
                    onChange={e => setForm(prev => ({ ...prev, telefono: e.target.value }))}
                    placeholder="3001234567"
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn btn-ghost"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            ) : (
              /* View Details */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 16, borderBottom: '1px solid var(--clr-border)' }}>
                  <div style={{
                    width: 48, height: 48,
                    borderRadius: '50%',
                    background: 'rgba(0, 224, 150, 0.1)',
                    border: '2px solid var(--clr-neon)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem', fontWeight: 700,
                    color: 'var(--clr-neon)',
                  }}>
                    {selectedCliente.nombre[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedCliente.nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>
                      ID Usuario: #{selectedCliente.id_usuario}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--clr-text-muted)' }}>Correo:</span>
                    <span style={{ color: 'var(--clr-text)' }}>{selectedCliente.correo}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--clr-text-muted)' }}>Teléfono:</span>
                    <span style={{ color: 'var(--clr-text)' }}>{selectedCliente.telefono || 'No registrado'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--clr-text-muted)' }}>Fecha Registro:</span>
                    <span style={{ color: 'var(--clr-text)' }}>{selectedCliente.fecha_registro || 'No disponible'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', alignItems: 'center' }}>
                    <span style={{ color: 'var(--clr-text-muted)' }}>Estado:</span>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      background: selectedCliente.estado === 'activo' ? 'rgba(0, 224, 150, 0.1)' : 'rgba(255, 75, 75, 0.1)',
                      color: selectedCliente.estado === 'activo' ? 'var(--clr-neon)' : 'var(--clr-accent)',
                      border: `1px solid ${selectedCliente.estado === 'activo' ? 'rgba(0, 224, 150, 0.2)' : 'rgba(255, 75, 75, 0.2)'}`,
                    }}>{selectedCliente.estado}</span>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  marginTop: 14,
                  paddingTop: 16,
                  borderTop: '1px solid var(--clr-border)',
                }}>
                  <button
                    onClick={() => handleToggleStatus(selectedCliente)}
                    className={`btn ${selectedCliente.estado === 'activo' ? 'btn-ghost' : 'btn-primary'}`}
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      color: selectedCliente.estado === 'activo' ? 'var(--clr-accent)' : 'var(--clr-neon)',
                      borderColor: selectedCliente.estado === 'activo' ? 'rgba(255, 75, 75, 0.2)' : 'rgba(0, 224, 150, 0.2)',
                    }}
                  >
                    {selectedCliente.estado === 'activo' ? (
                      <><UserX size={14} style={{ marginRight: 6 }} /> Desactivar Cliente</>
                    ) : (
                      <><UserCheck size={14} style={{ marginRight: 6 }} /> Activar Cliente</>
                    )}
                  </button>

                  <button
                    onClick={() => setIsEditMode(true)}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Editar Información
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
