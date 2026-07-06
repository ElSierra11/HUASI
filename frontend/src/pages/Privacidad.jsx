import React from 'react';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function Privacidad() {
  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px', lineHeight: '1.6', color: 'var(--text)' }}>
      <div className="card" style={{ padding: 40 }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Lock size={36} color="var(--accent)" /> Políticas de Privacidad
        </h1>
        <p style={{ color: 'var(--text-light)', marginBottom: 24, fontSize: '0.95rem' }}>Última actualización: 2 de junio de 2026</p>

        <section style={{ marginBottom: 24 }}>
          <p style={{ marginBottom: 16 }}>
            En HUASI UCC nos tomamos muy en serio la protección y privacidad de tus datos personales. De acuerdo con la Ley Estatutaria 1581 de 2012 de Protección de Datos de Colombia (Habeas Data), a continuación te informamos detalladamente cómo manejamos tus datos.
          </p>
        </section>

        <section style={{ marginBottom: 32 }} className="card" style={{ background: '#f8fafc', padding: 24, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Eye size={20} color="var(--success)" /> Datos Públicos y Visibles
          </h2>
          <p style={{ marginBottom: 12 }}>
            Esta información es de acceso general para todos los usuarios registrados y verificados dentro de la plataforma HUASI UCC:
          </p>
          <ul style={{ paddingLeft: 20, display: 'grid', gap: 8 }}>
            <li><strong>Tu nombre y apellido:</strong> Necesarios para identificarte en la comunidad.</li>
            <li><strong>Tu sede / campus:</strong> Muestra a qué sede de la Universidad Cooperativa de Colombia perteneces.</li>
            <li><strong>Foto de perfil:</strong> Ayuda a generar confianza mutua en la plataforma.</li>
            <li><strong>Estado de verificación:</strong> Una insignia que confirma que tu vinculación con la UCC ha sido validada administrativamente.</li>
            <li><strong>Tus calificaciones y comentarios:</strong> Evaluaciones sobre tus estadías como huésped o anfitrión.</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }} className="card" style={{ background: '#f8fafc', padding: 24, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <EyeOff size={20} color="var(--danger)" /> Datos Privados y Protegidos
          </h2>
          <p style={{ marginBottom: 12 }}>
            Esta información está estrictamente protegida y **no se revela al público general**, a menos que se concrete y apruebe una reserva entre ambas partes:
          </p>
          <ul style={{ paddingLeft: 20, display: 'grid', gap: 8, marginBottom: 12 }}>
            <li><strong>Correo institucional y teléfono celular:</strong> Se comparten únicamente con el anfitrión/huésped una vez que una solicitud de reserva ha sido **aprobada** oficialmente.</li>
            <li><strong>Documentos de verificación (carnet / cédula):</strong> Son estrictamente confidenciales y accesibles solo por el equipo administrativo del panel de HUASI para el proceso de validación. Nunca serán publicados en el portal.</li>
            <li><strong>Contraseña de acceso:</strong> Está cifrada en nuestra base de datos mediante algoritmos unidireccionales (bcrypt) de alta seguridad, haciéndola inaccesible inclusive para los administradores.</li>
          </ul>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 12 }}>3. Uso de la Información</h2>
          <p style={{ marginBottom: 12 }}>
            Utilizamos tus datos únicamente para garantizar la seguridad de la plataforma, contactarte en caso de reservas o actualizaciones críticas de soporte, y mantener el filtro de seguridad institucional UCC. Nunca comercializaremos tus datos ni los entregaremos a terceros ajenos a la universidad.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 12 }}>4. Tus Derechos (ARCO)</h2>
          <p style={{ marginBottom: 12 }}>
            Como titular de tus datos personales, tienes derecho a conocer, actualizar, rectificar y solicitar la supresión de tus datos de nuestras bases de datos en cualquier momento escribiendo a los canales de soporte autorizados por el equipo de administración de HUASI.
          </p>
        </section>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>HUASI UCC — La seguridad y confidencialidad de tus datos son nuestra prioridad.</p>
        </div>
      </div>
    </div>
  );
}
