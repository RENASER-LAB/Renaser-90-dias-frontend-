/**
 * Traduce un timestamp ISO (`createdAt`) a la forma corta que el diseño del chat ya usaba con
 * datos fijos (ej. "07:30 AM", "Ayer"). El diseño no cambia: solo cambia de dónde sale el texto.
 * No se reutiliza `community/utils/tiempoRelativo.ts` a propósito — un chat necesita la hora
 * puntual del mensaje, no un "hace X minutos" (AGENTS.md: cada feature dueña de lo suyo).
 */
export function horaChat(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) {
    return '';
  }

  const ahora = new Date();
  const esHoy = fecha.toDateString() === ahora.toDateString();
  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  const esAyer = fecha.toDateString() === ayer.toDateString();

  const horas12 = fecha.getHours() % 12 || 12;
  const minutos = fecha.getMinutes().toString().padStart(2, '0');
  const meridiano = fecha.getHours() < 12 ? 'AM' : 'PM';
  const horaPuntual = `${horas12}:${minutos} ${meridiano}`;

  if (esHoy) return horaPuntual;
  if (esAyer) return 'Ayer';
  return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}
