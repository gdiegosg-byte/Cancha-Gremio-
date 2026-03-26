import { Link } from 'react-router-dom';

export default function LandingPage() {
    return (
        <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #07100d, #0f2116 45%, #03110a)', color: 'var(--clr-text)' }}>
            <section style={{ padding: '80px 24px 40px', maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 6vw, 4rem)', letterSpacing: '0.08em', color: 'var(--clr-neon)' }}>
                    Cancha Gremio
                </h1>
                <p style={{ margin: '20px auto 35px', maxWidth: 650, fontSize: '1.05rem', color: 'var(--clr-text-muted)', lineHeight: 1.6 }}>
                    Gestiona reservas, pagos y eventos de tu cancha sintética como un profesional. Control total de clientes, agenda y reportes en una sola plataforma moderna.
                </p>

                <div style={{ display: 'inline-flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Link to="/registro" className="btn btn-primary" style={{ minWidth: 170, justifyContent: 'center' }}>
                        Crear cuenta gratis
                    </Link>
                    <Link to="/login" className="btn btn-ghost" style={{ minWidth: 170, justifyContent: 'center' }}>
                        Iniciar sesión
                    </Link>
                </div>
            </section>

            <section style={{ maxWidth: 1120, margin: '60px auto 80px', padding: '0 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 18 }}>
                    {[
                        {
                            title: 'Reservas automáticas',
                            icon: '⏱',
                            text: 'Evita solapamientos. Clientes pueden reservar directo y ver disponibilidad en tiempo real.'
                        },
                        {
                            title: 'Control de clientes',
                            icon: '👥',
                            text: 'Registra información y estado de clientes, historial de reservas y contacto en un clic.'
                        },
                        {
                            title: 'Reportes inteligentes',
                            icon: '📊',
                            text: 'Analiza ocupación, ingresos y demanda para tomar decisiones de rentabilidad.'
                        },
                        {
                            title: 'Eventos & promoción',
                            icon: '🎉',
                            text: 'Crea torneos y eventos, difunde con notificaciones y gestiona participantes centralizadamente.'
                        }
                    ].map(card => (
                        <article key={card.title} className="glass" style={{ padding: 20, textAlign: 'left' }}>
                            <div style={{ fontSize: 28, marginBottom: 10 }}>{card.icon}</div>
                            <h3 style={{ marginBottom: 8, color: 'var(--clr-neon)' }}>{card.title}</h3>
                            <p style={{ color: 'var(--clr-text-muted)', lineHeight: 1.6 }}>{card.text}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section style={{ background: 'rgba(20, 35, 25, 0.8)', padding: '40px 20px 80px' }}>
                <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2rem', marginBottom: 14, fontFamily: 'var(--font-display)', color: 'var(--clr-neon)' }}>
                        ¡Lleva tu cancha al siguiente nivel!
                    </h2>
                    <p style={{ marginBottom: 24, color: 'var(--clr-text-muted)' }}>
                        Más control, menos fallos, más ventas. Regístrate hoy y empieza a gestionar tus reservas y eventos con eficiencia profesional.
                    </p>
                    <Link to="/registro" className="btn btn-primary" style={{ fontSize: '0.95rem' }}>
                        Comenzar ahora
                    </Link>
                </div>
            </section>
        </main>
    );
}
