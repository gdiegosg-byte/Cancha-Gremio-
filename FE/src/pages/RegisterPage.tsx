import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/context/ToastContext';
import { authApi } from '@/api/auth';
import { Loader2 } from 'lucide-react';

// =============================================
// Register Page
// =============================================

export default function RegisterPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: '', apellido: '', email: '',
    telefono: '', password: '', confirmPassword: '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast('Las contraseñas no coinciden', 'error');
      return;
    }
    setLoading(true);
    try {
      await authApi.register({
        nombre: form.nombre,
        apellido: form.apellido,
        correo: form.email,
        contraseña: form.password,
        telefono: form.telefono,
      });
      toast('Cuenta creada exitosamente', 'success');
      navigate('/login');
    } catch (error) {
      toast('Error al crear la cuenta', 'error');
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { name: 'nombre', label: 'Nombre', placeholder: 'Juan', type: 'text' },
    { name: 'apellido', label: 'Apellido', placeholder: 'García', type: 'text' },
    { name: 'email', label: 'Correo electrónico', placeholder: 'juan@email.com', type: 'email' },
    { name: 'telefono', label: 'Teléfono', placeholder: '3001234567', type: 'tel' },
    { name: 'password', label: 'Contraseña', placeholder: '••••••••', type: 'password' },
    { name: 'confirmPassword', label: 'Confirmar contraseña', placeholder: '••••••••', type: 'password' },
  ] as const;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--clr-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div className="fade-up" style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/" style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            color: 'var(--clr-neon)',
            letterSpacing: '0.1em',
          }}>
            ⚽ CANCHA GREMIO
          </Link>
          <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Crea tu cuenta para empezar a reservar
          </p>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.6rem',
            letterSpacing: '0.05em',
            marginBottom: 24,
          }}>
            CREAR CUENTA
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
              marginBottom: 14,
            }}>
              {fields.slice(0, 2).map(f => (
                <div key={f.name}>
                  <label>{f.label}</label>
                  <input
                    name={f.name}
                    type={f.type}
                    value={form[f.name]}
                    onChange={handleChange}
                    placeholder={f.placeholder}
                    required
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              {fields.slice(2).map(f => (
                <div key={f.name}>
                  <label>{f.label}</label>
                  <input
                    name={f.name}
                    type={f.type}
                    value={form[f.name]}
                    onChange={handleChange}
                    placeholder={f.placeholder}
                    required
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: 12 }}
            >
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Creando...</> : 'CREAR CUENTA'}
            </button>
          </form>

          <div style={{
            marginTop: 20,
            paddingTop: 20,
            borderTop: '1px solid var(--clr-border)',
            textAlign: 'center',
            fontSize: '0.8rem',
            color: 'var(--clr-text-muted)',
          }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: 'var(--clr-neon)', fontWeight: 600 }}>
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
