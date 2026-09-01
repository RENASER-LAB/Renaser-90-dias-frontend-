/**
 * Traduce un timestamp ISO del backend (`createdAt`) a la forma "Hace X" que el diseño del Muro
 * ya usaba con datos fijos (ej. "Hace 2 horas"). El diseño no cambia: lo único que cambia es que
 * el texto sale de la fecha real de la publicación en vez de un string fijo del mock.
 */
export function tiempoRelativo(iso: string): string {
  const fecha = new Date(iso).getTime();
  if (Number.isNaN(fecha)) {
    return 'Hace un momento';
  }

  const segundos = Math.max(0, Math.floor((Date.now() - fecha) / 1000));
  if (segundos < 60) {
    return 'Hace un momento';
  }

  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) {
    return `Hace ${minutos} minuto${minutos === 1 ? '' : 's'}`;
  }

  const horas = Math.floor(minutos / 60);
  if (horas < 24) {
    return `Hace ${horas} hora${horas === 1 ? '' : 's'}`;
  }

  const dias = Math.floor(horas / 24);
  if (dias < 30) {
    return `Hace ${dias} día${dias === 1 ? '' : 's'}`;
  }

  const meses = Math.floor(dias / 30);
  if (meses < 12) {
    return `Hace ${meses} mes${meses === 1 ? '' : 'es'}`;
  }

  const anios = Math.floor(meses / 12);
  return `Hace ${anios} año${anios === 1 ? '' : 's'}`;
}
