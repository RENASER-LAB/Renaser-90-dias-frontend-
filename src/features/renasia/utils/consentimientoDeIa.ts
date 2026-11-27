/**
 * Consentimiento para que el acompañante de IA reciba datos de la persona (spec 060, FR-001 a FR-004).
 *
 * Apple 5.1.2(i) (patrón `APPLE-5.1.2-AI-NO-CONSENT-MODAL` del playbook app-store-compliance): antes de que
 * salgan datos personales hacia una IA de un tercero, la app tiene que mostrar un aviso que nombre al proveedor y
 * diga qué datos viajan. La política (sección 5) ya nombra a Google (Gemini API); este aviso lo dice dentro de la app.
 *
 * Se guarda **en el teléfono y por cuenta** (sin servidor nuevo): quien ya pasó el onboarding lo ve una vez, antes de
 * su primer mensaje o de su primera conversación por voz. Si cambia el texto de fondo, se sube `VERSION`.
 */
export const VERSION_DEL_CONSENTIMIENTO_DE_IA = 1;

export const CLAVE_DEL_CONSENTIMIENTO_DE_IA = 'renaser.ia.consentimiento.';

/** Quién recibe los datos. Es el mismo nombre que la política de privacidad. */
export const PROVEEDOR_DE_IA = 'Google (Gemini)';

export const TITULO_CONSENTIMIENTO_DE_IA = 'Antes de hablar con tu acompañante';

export const TEXTO_CONSENTIMIENTO_DE_IA =
  `Tu acompañante funciona con inteligencia artificial de ${PROVEEDOR_DE_IA}, un servicio de Google. ` +
  'Para responderte, enviamos a Google los mensajes que le escribes, tu voz cuando hablas con él en vivo y, si tu ' +
  'formación incluye un diagnóstico, tus respuestas del diagnóstico, junto con lo que necesita saber de tu programa ' +
  '(tus hábitos de hoy y tus objetivos). No le enviamos tus fotos ni tus pagos. ' +
  'Solo se envía cuando tú le escribes o le hablas. Puedes ver el detalle en la política de privacidad.';

export const ACEPTAR_CONSENTIMIENTO_DE_IA = 'Acepto y continuar';
export const RECHAZAR_CONSENTIMIENTO_DE_IA = 'Ahora no';

/** Lo que dice el onboarding junto a la casilla de datos (ver `ChapterConsentimiento`). */
export const TEXTO_DE_DATOS_EN_ONBOARDING =
  'Autorizo el uso responsable de mis datos para fines de seguimiento, mejora continua del proceso y envío de información ' +
  'relevante relacionada al acompañamiento dentro del ecosistema RENASER. Entiendo que mi acompañante funciona con ' +
  `inteligencia artificial de ${PROVEEDOR_DE_IA} y que, para responderme, se le envían mis mensajes, mi voz en la ` +
  'conversación en vivo y mis respuestas del diagnóstico.';

/** Lo guardado es válido solo si es de la versión vigente. Cualquier cosa rara cuenta como «sin aceptar». */
export function esConsentimientoVigente(crudo: string | null): boolean {
  if (!crudo) return false;
  try {
    const leido = JSON.parse(crudo) as { version?: unknown };
    return leido.version === VERSION_DEL_CONSENTIMIENTO_DE_IA;
  } catch {
    return false;
  }
}
