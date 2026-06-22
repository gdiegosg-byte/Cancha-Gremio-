import { Link } from 'react-router-dom';
import { Shield, Sparkles, Zap, Star, Trophy, Users, Calendar } from 'lucide-react';

export default function LandingPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top left, #0b2216, #060a07 70%)',
      color: '#e8f5ec',
      fontFamily: 'var(--font-sans)',
      overflowX: 'hidden',
    }}>
      {/* Premium Navbar */}
      <header style={{
        padding: '20px 24px',
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(74, 222, 128, 0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: 'var(--clr-neon)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 15px rgba(74, 222, 128, 0.4)',
          }}>
            <span style={{ fontSize: '1.2rem' }}>⚽</span>
          </div>
          <div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              letterSpacing: '0.05em',
              color: 'var(--clr-neon)',
              textShadow: '0 0 10px rgba(74, 222, 128, 0.2)',
            }}>
              CANCHA GREMIO
            </span>
          </div>
        </div>
        <div>
          <Link to="/login" className="btn btn-ghost" style={{ fontSize: '0.9rem', padding: '8px 16px' }}>
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        padding: '100px 24px 60px',
        maxWidth: 1000,
        margin: '0 auto',
        textAlign: 'center',
        position: 'relative',
      }}>
        {/* Glow decoration */}
        <div style={{
          position: 'absolute',
          top: '10%', left: '50%',
          transform: 'translateX(-50%)',
          width: 300, height: 300,
          background: 'var(--clr-neon)',
          filter: 'blur(150px)',
          opacity: 0.12,
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(74, 222, 128, 0.08)',
            border: '1px solid rgba(74, 222, 128, 0.2)',
            padding: '6px 14px',
            borderRadius: 99,
            fontSize: '0.75rem',
            color: 'var(--clr-neon)',
            fontWeight: 600,
            letterSpacing: '0.05em',
            marginBottom: 24,
            textTransform: 'uppercase',
          }}>
            <Sparkles size={12} /> Gestión Deportiva de Alto Nivel
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.8rem, 7vw, 4.5rem)',
            letterSpacing: '0.05em',
            lineHeight: 1.05,
            marginBottom: 20,
            textTransform: 'uppercase',
          }}>
            RESERVA TU CANCHA <br />
            <span style={{
              color: 'transparent',
              WebkitTextStroke: '1px var(--clr-neon)',
              textShadow: '0 0 20px rgba(74, 222, 128, 0.1)',
            }}>
              JUEGA COMO PRO
            </span>
          </h1>

          <p style={{
            margin: '0 auto 35px',
            maxWidth: 680,
            fontSize: '1.1rem',
            color: 'var(--clr-text-muted)',
            lineHeight: 1.6,
          }}>
            La plataforma líder para reservar canchas sintéticas, unirse a los mejores torneos locales y coordinar partidos con tus amigos de la forma más rápida y moderna.
          </p>

          <div style={{ display: 'inline-flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/registro" className="btn btn-primary" style={{
              minWidth: 190,
              justifyContent: 'center',
              padding: '14px 28px',
              fontSize: '0.95rem',
              boxShadow: '0 0 20px rgba(74, 222, 128, 0.25)',
            }}>
              Regístrate Gratis
            </Link>
            <Link to="/login" className="btn btn-ghost" style={{
              minWidth: 190,
              justifyContent: 'center',
              padding: '14px 28px',
              fontSize: '0.95rem',
            }}>
              Ver Horarios Disponibles
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Stats Grid */}
      <section style={{
        maxWidth: 1200,
        margin: '20px auto 80px',
        padding: '0 24px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          background: 'rgba(13, 20, 16, 0.5)',
          border: '1px solid rgba(74, 222, 128, 0.1)',
          padding: '24px 20px',
          borderRadius: 16,
          backdropFilter: 'blur(8px)',
        }}>
          {[
            { label: 'Canchas Activas', value: '3 Campos', desc: 'Sintética, Cemento y Natural', color: 'var(--clr-neon)' },
            { label: 'Horario Flexible', value: '06:00 - 22:00', desc: 'Todos los días de la semana', color: 'var(--clr-info)' },
            { label: 'Comunidad', value: '+100 Jugadores', desc: 'Organiza partidos y torneos', color: 'var(--clr-accent)' },
          ].map((s, i) => (
            <div key={i} style={{
              textAlign: 'center',
              borderRight: i < 2 ? '1px solid rgba(74, 222, 128, 0.1)' : 'none',
              padding: '10px 20px',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                {s.label}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: s.color, letterSpacing: '0.02em', marginBottom: 2 }}>
                {s.value}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--clr-text-dim)' }}>
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Visual Cards Section */}
      <section style={{
        maxWidth: 1200,
        margin: '0 auto 80px',
        padding: '0 24px',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2rem',
          textAlign: 'center',
          letterSpacing: '0.05em',
          marginBottom: 32,
          color: 'var(--clr-neon)',
        }}>
          ¿POR QUÉ ELEGIR CANCHA GREMIO?
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 20,
        }}>
          {[
            {
              title: 'Reservas en un clic',
              icon: <Zap size={24} style={{ color: 'var(--clr-neon)' }} />,
              text: 'Consulta la agenda en tiempo real desde tu móvil y asegura tu horario de juego de forma instantánea.'
            },
            {
              title: 'Torneos y Ligas',
              icon: <Trophy size={24} style={{ color: 'var(--clr-info)' }} />,
              text: 'Inscríbete a los torneos semanales, sigue la tabla de clasificación y demuestra el nivel de tu equipo.'
            },
            {
              title: 'Perfil de Jugador',
              icon: <Users size={24} style={{ color: 'var(--clr-accent)' }} />,
              text: 'Mantén un historial completo de tus reservas y eventos, y actualiza tus datos de contacto con facilidad.'
            },
            {
              title: 'Instalaciones Top',
              icon: <Shield size={24} style={{ color: 'var(--clr-warn)' }} />,
              text: 'Disfruta de canchas en perfecto estado. Monitoreamos constantemente el mantenimiento de los campos.'
            }
          ].map((feat, i) => (
            <article key={i} className="glass" style={{
              padding: 24,
              borderRadius: 12,
              border: '1px solid rgba(74, 222, 128, 0.08)',
              background: 'rgba(13, 20, 16, 0.4)',
              transition: 'all 0.2s ease',
            }}>
              <div style={{
                width: 48, height: 48,
                borderRadius: 8,
                background: 'rgba(74, 222, 128, 0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
              }}>
                {feat.icon}
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 8 }}>{feat.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)', lineHeight: 1.6 }}>{feat.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Courts Preview Section */}
      <section style={{
        maxWidth: 1200,
        margin: '0 auto 80px',
        padding: '0 24px',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2rem',
          textAlign: 'center',
          letterSpacing: '0.05em',
          marginBottom: 32,
          color: 'var(--clr-neon)',
        }}>
          NUESTROS CAMPOS DEPORTIVOS
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
        }}>
          {[
            {
              name: 'Cancha Premium',
              type: 'Sintética (Fútbol 5/6)',
              dim: '40m x 20m',
              price: '$50.000 / hora',
              desc: 'Grama sintética de calidad profesional con excelente iluminación LED para partidos nocturnos.',
              badge: 'La favorita'
            },
            {
              name: 'Cancha Clásica',
              type: 'Cemento (Multifuncional)',
              dim: '35m x 18m',
              price: '$30.000 / hora',
              desc: 'Cancha tradicional de concreto ideal para fustal rápido, baloncesto y actividades mixtas.',
              badge: 'Fustal rápido'
            },
            {
              name: 'Cancha Natural',
              type: 'Césped Natural (Fútbol 6)',
              dim: '40m x 20m',
              price: '$40.000 / hora',
              desc: 'Campo de césped natural bien cuidado para quienes prefieren la sensación de juego tradicional.',
              badge: 'Pasto Real'
            }
          ].map((cancha, i) => (
            <div key={i} className="card" style={{
              background: 'rgba(13, 20, 16, 0.4)',
              border: '1px solid rgba(74, 222, 128, 0.08)',
              padding: 24,
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 280,
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700,
                    color: 'var(--clr-neon)',
                    background: 'rgba(74, 222, 128, 0.1)',
                    padding: '3px 8px', borderRadius: 99,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {cancha.badge}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {cancha.dim}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4 }}>{cancha.name}</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--clr-neon)', fontWeight: 600, marginBottom: 12 }}>
                  {cancha.type}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
                  {cancha.desc}
                </p>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 16,
                borderTop: '1px solid rgba(74, 222, 128, 0.08)',
              }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--clr-neon)' }}>
                  {cancha.price}
                </span>
                <Link to="/login" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
                  Reservar
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modern Call to Action (CTA) */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(11, 34, 22, 0.8), rgba(6, 10, 7, 0.9))',
        borderTop: '1px solid rgba(74, 222, 128, 0.1)',
        borderBottom: '1px solid rgba(74, 222, 128, 0.1)',
        padding: '80px 24px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
            fontFamily: 'var(--font-display)',
            color: 'var(--clr-neon)',
            letterSpacing: '0.05em',
            marginBottom: 14,
            textTransform: 'uppercase',
          }}>
            ¿LISTO PARA JUGAR?
          </h2>
          <p style={{
            fontSize: '1rem',
            color: 'var(--clr-text-muted)',
            marginBottom: 28,
            maxWidth: 600,
            margin: '0 auto 28px',
            lineHeight: 1.6,
          }}>
            Regístrate hoy, asocia tu número telefónico para confirmaciones instantáneas y empieza a disfrutar del deporte con tus amigos con una gestión impecable.
          </p>
          <Link to="/registro" className="btn btn-primary" style={{
            padding: '12px 28px',
            fontSize: '0.9rem',
            boxShadow: '0 0 20px rgba(74, 222, 128, 0.2)',
          }}>
            Crear Cuenta Gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '30px 24px',
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.8rem',
        color: 'var(--clr-text-muted)',
        gap: 16,
      }}>
        <div>
          &copy; {new Date().getFullYear()} Cancha Gremio. Todos los derechos reservados.
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <span style={{ cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--clr-neon)'} onMouseLeave={e => e.currentTarget.style.color = 'inherit'}>Términos de servicio</span>
          <span style={{ cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--clr-neon)'} onMouseLeave={e => e.currentTarget.style.color = 'inherit'}>Política de privacidad</span>
        </div>
      </footer>
    </main>
  );
}
