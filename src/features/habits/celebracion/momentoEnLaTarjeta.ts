/**
 * Lo que le pasa a UNA tarjeta de hábito entre el toque y la confirmación del servidor (2026-10-07, segunda vuelta del
 * pedido del dueño: «No veo nada, mejora esos aspectos. Lo quiero lo más fluido posible»).
 *
 * El primer intento esperaba la respuesta del servidor (~1–2 s en el emulador) sin mover nada y recién ahí animaba
 * todo junto. Ahora la tarjeta responde en el mismo instante del toque y la confirmación completa lo que ya empezó:
 *
 * - `registrando`: la pantalla lo anuncia ANTES de llamar al servidor (`cerrarConRespuestaInmediata`). El check
 *   empieza a llenarse y respira suave mientras espera. No marca nada como cumplido: el estado verdadero de la tarjeta
 *   (`done`) sigue llegando solo con la respuesta, como pide V-2 (no mostrar lo que el servidor no confirmó).
 * - `fallo`: el servidor dijo que no. El check se vacía con un fundido corto y la pantalla muestra su error de siempre.
 * - `celebrar`: lo anuncia el check UNA vez, cuando la tarjeta pasa a cumplida; el brillo del borde y el tachado del
 *   título lo escuchan para arrancar juntos y con el mismo retraso (`demoraMs`).
 *
 * Son avisos dentro de la app, por registro, sin estado de React: quien escucha mueve valores compartidos de
 * Reanimated, así que la lista de Training no se vuelve a dibujar por nada de esto.
 */
export type EventoDeLaTarjeta =
  | { tipo: 'registrando' }
  | { tipo: 'fallo' }
  | { tipo: 'celebrar'; demoraMs: number };

type Oyente = (evento: EventoDeLaTarjeta) => void;

const oyentes = new Map<string, Set<Oyente>>();
/** Los registros que se están cerrando desde la tarjeta (el check ya respondió y espera la confirmación). */
const registrando = new Set<string>();

export function escucharLaTarjeta(registroId: string, oyente: Oyente): () => void {
  const deEste = oyentes.get(registroId) ?? new Set<Oyente>();
  deEste.add(oyente);
  oyentes.set(registroId, deEste);
  return () => {
    deEste.delete(oyente);
    if (deEste.size === 0) oyentes.delete(registroId);
  };
}

export function anunciarALaTarjeta(registroId: string, evento: EventoDeLaTarjeta): void {
  if (evento.tipo === 'registrando') registrando.add(registroId);
  else registrando.delete(registroId);
  for (const oyente of [...(oyentes.get(registroId) ?? [])]) {
    try {
      oyente(evento);
    } catch {
      /* una animación rota no puede romper el cierre del hábito */
    }
  }
}

/** Si el check de ese registro ya respondió al toque y espera al servidor (lo lee el check al confirmarse). */
export function estaRegistrando(registroId: string): boolean {
  return registrando.has(registroId);
}

/**
 * Cierra un registro desde la tarjeta con respuesta inmediata: anuncia `registrando` en el mismo tick del toque, espera
 * al servidor y, si falla, anuncia `fallo` (el check vuelve atrás) y deja pasar el error para que la pantalla lo
 * muestre como siempre. Si sale bien no anuncia nada: la tarjeta pasa a cumplida con la respuesta y el check celebra.
 */
export async function cerrarConRespuestaInmediata<T>(registroId: string, cerrar: () => Promise<T>): Promise<T> {
  anunciarALaTarjeta(registroId, { tipo: 'registrando' });
  try {
    return await cerrar();
  } catch (e) {
    anunciarALaTarjeta(registroId, { tipo: 'fallo' });
    throw e;
  }
}
