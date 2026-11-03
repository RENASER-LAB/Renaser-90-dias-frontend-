import type { DecisionDelWhatsapp } from './whatsappDelPerfil';

/**
 * El orden de «Guardar cambios» en Editar perfil: primero el perfil de siempre (nombre, foto, departamento) y, si hay un número nuevo, el
 * WhatsApp. Si el perfil falla, la excepción sale tal cual (la pantalla ya la sabe decir) y el número no se toca. Si el perfil se guardó y el
 * número no, vuelve `whatsapp-fallo`: la pantalla lo dice sin dar el guardado por completo, y al reintentar se vuelve a mandar todo (los dos
 * pedidos son upsert: repetirlos no duplica nada).
 */
export async function guardarElPerfil(args: {
  decision: DecisionDelWhatsapp;
  guardarPerfil: () => Promise<void>;
  guardarWhatsapp: (numero: string) => Promise<void>;
}): Promise<'guardado' | 'whatsapp-fallo'> {
  await args.guardarPerfil();
  if (args.decision.tipo !== 'guardar') return 'guardado';
  try {
    await args.guardarWhatsapp(args.decision.valor);
  } catch {
    return 'whatsapp-fallo';
  }
  return 'guardado';
}
