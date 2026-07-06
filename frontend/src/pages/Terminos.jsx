import React from 'react';
import { Shield, Info, AlertTriangle } from 'lucide-react';

export default function Terminos() {
  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px', lineHeight: '1.6', color: 'var(--text)' }}>
      <div className="card" style={{ padding: 40 }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={36} color="var(--accent)" /> Términos y Condiciones
        </h1>
        <p style={{ color: 'var(--text-light)', marginBottom: 24, fontSize: '0.95rem' }}>Última actualización: 2 de junio de 2026</p>

        <div className="alert" style={{ background: '#eff6ff', color: '#1e40af', padding: 16, borderRadius: 8, display: 'flex', gap: 12, marginBottom: 24 }}>
          <Info style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Acuerdo de Solidaridad Estudiantil:</strong> HUASI es una plataforma 100% solidaria y sin ánimo de lucro diseñada exclusivamente para la comunidad estudiantil de la Universidad Cooperativa de Colombia (UCC). No se permiten transacciones monetarias de ningún tipo.
          </div>
        </div>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 12 }}>1. Aceptación de los Términos</h2>
          <p style={{ marginBottom: 12 }}>
            Al registrarse y hacer uso de HUASI, usted acepta obligarse bajo estos Términos y Condiciones. Si no está de acuerdo con alguna parte, no deberá acceder ni utilizar los servicios de la plataforma.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 12 }}>2. Elegibilidad y Verificación</h2>
          <p style={{ marginBottom: 12 }}>
            La plataforma está reservada única y exclusivamente para estudiantes, docentes y personal administrativo activo de la Universidad Cooperativa de Colombia (UCC). Para participar, los usuarios deben:
          </p>
          <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
            <li>Registrarse con su correo institucional UCC (<code>@campusucc.edu.co</code> o <code>@ucc.edu.co</code>).</li>
            <li>Verificar su vinculación subiendo una foto clara de su carnet universitario o documento institucional vigente.</li>
          </ul>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 12 }}>3. Naturaleza Solidaria</h2>
          <p style={{ marginBottom: 12 }}>
            HUASI actúa como un intermediario solidario. Queda estrictamente prohibido solicitar, exigir u ofrecer cualquier tipo de pago, remuneración económica, alquiler o compensación material a cambio del alojamiento. Cualquier reporte de solicitud de dinero resultará en el bloqueo permanente inmediato de la cuenta de usuario.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 12 }}>4. Descargo de Responsabilidad</h2>
          <div className="alert" style={{ background: '#fff5f5', color: '#c53030', padding: 16, borderRadius: 8, display: 'flex', gap: 12, marginBottom: 16 }}>
            <AlertTriangle style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Exención de Responsabilidad Civil y Penal:</strong> HUASI es una herramienta tecnológica facilitadora de contacto. La plataforma y sus administradores NO asumen responsabilidad alguna por pérdidas, daños, robos, agresiones, altercados o percances de cualquier índole que puedan ocurrir dentro de los alojamientos o durante las estadías. Cada usuario asume la responsabilidad plena de su comportamiento, su seguridad y el resguardo de sus pertenencias.
            </div>
          </div>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 12 }}>5. Normas de Convivencia y Respeto</h2>
          <p style={{ marginBottom: 12 }}>
            Tanto los anfitriones como los huéspedes se comprometen a mantener normas básicas de convivencia, higiene, seguridad y respeto mutuo. Los anfitriones deben proveer un espacio seguro y en condiciones dignas, mientras que los huéspedes deben respetar las reglas específicas indicadas por el anfitrión en su publicación (horarios, uso de áreas comunes, etc.).
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 12 }}>6. Botón de Pánico y Seguridad</h2>
          <p style={{ marginBottom: 12 }}>
            La plataforma incluye un Botón de Pánico flotante visible en todas las páginas. En caso de experimentar una situación de amenaza o peligro, haga uso del botón inmediatamente para contactar a las autoridades correspondientes (Policía Nacional: 123) o el personal de seguridad de la UCC.
          </p>
        </section>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>HUASI UCC — Al servicio solidario de nuestra comunidad estudiantil.</p>
        </div>
      </div>
    </div>
  );
}
