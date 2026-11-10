/**
 * Spec 048 (D4): lo que dice el globo del ícono de conexión. «Sin conexión desde las 10:42 · 3 cosas por enviar».
 * Con señal y cosas pendientes: «Enviando 2 cosas…». Hora en 24 h, como el resto de la app.
 */
export function textoDelGlobo(sinConexionDesde: number | null, pendientes: number, ahora: Date = new Date()): string {
  const cosas = pendientes === 1 ? '1 cosa' : `${pendientes} cosas`;
  if (sinConexionDesde === null) return pendientes > 0 ? `Enviando ${cosas}…` : 'Con conexión';
  const d = new Date(sinConexionDesde);
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const mismoDia = d.toDateString() === ahora.toDateString();
  const desde = mismoDia ? `desde las ${hora}` : `desde el ${d.getDate()}/${d.getMonth() + 1} a las ${hora}`;
  return pendientes > 0 ? `Sin conexión ${desde} · ${cosas} por enviar` : `Sin conexión ${desde}`;
}
