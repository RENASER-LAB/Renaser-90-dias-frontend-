/**
 * El pedido «abre la carrera» (spec 042): lo emite la fila de «Kilómetros diarios» de Training y lo atiende el anfitrión que vive
 * sobre el navegador (`AnfitrionDeLaCarrera`). Así Training no monta la pantalla de la carrera ni cambia de forma.
 */

export type PedidoDeLaCarrera = { tipo: 'empezar'; registroId: string | null } | { tipo: 'volver' };

type Oyente = (pedido: PedidoDeLaCarrera) => void;
const oyentes = new Set<Oyente>();

export function escucharPedidosDeLaCarrera(oyente: Oyente): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function pedirLaCarrera(pedido: PedidoDeLaCarrera): void {
  oyentes.forEach(o => o(pedido));
}
