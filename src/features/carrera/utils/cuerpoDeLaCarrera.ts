import type { CuerpoDeLaCarrera, EstadoDeLaCarrera } from '../types/carrera.types';
import { activoMs, tramosDe } from './motorDeCarrera';
import { rutaParaEnviar } from './rutaCodificada';

/**
 * Arma el ÚNICO pedido de una carrera, `POST /api/v1/carreras` (FR-016, contracts/api.md §1). Se arma una sola vez, al tocar
 * «Terminar», y se guarda tal cual en la cola: los reintentos mandan exactamente los mismos bytes, así la huella del servidor no
 * cambia y un reintento nunca choca con su propio 409.
 *
 * Topes de entrada (FR-026): se respetan acá para no mandar algo que el servidor rechazaría con 400 y quedaría bloqueado.
 */

export function cuerpoDeLaCarrera(
  e: EstadoDeLaCarrera,
  terminadaEnMs: number,
  opciones: { guardarRuta: boolean; appVersion?: string | null },
): CuerpoDeLaCarrera {
  const activo = activoMs(e, terminadaEnMs);
  const tramos = tramosDe(e, terminadaEnMs)
    .filter(t => !t.parcial)
    .slice(0, 61)
    .map(t => ({ km: t.km, segundos: t.segundos }));
  const cuerpo: CuerpoDeLaCarrera = {
    carreraId: e.carreraId,
    iniciadaEn: new Date(e.iniciadaEnMs).toISOString(),
    terminadaEn: new Date(Math.max(terminadaEnMs, e.iniciadaEnMs + 1000)).toISOString(),
    duracionActivaSeg: Math.min(43_200, Math.max(1, Math.round(activo / 1000))),
    distanciaMetros: Math.round(Math.min(e.distanciaM, 100_000) * 10) / 10,
    tramos,
  };
  const subida = Math.round(e.subidaM);
  if (subida > 0) cuerpo.subidaMetros = Math.min(subida, 5000);
  if (e.conPasos && e.pasos > 0) cuerpo.pasos = Math.min(Math.round(e.pasos), 150_000);
  const kcal = Math.round(e.caloriasKcal);
  if (kcal > 0) cuerpo.caloriasAprox = Math.min(kcal, 6000);
  const sinGps = Math.round(e.metrosSinGps);
  if (sinGps > 0) cuerpo.metrosSinGps = Math.min(sinGps, Math.floor(cuerpo.distanciaMetros));
  if (opciones.guardarRuta) {
    const ruta = rutaParaEnviar(e.ruta);
    if (ruta) cuerpo.ruta = ruta;
  }
  if (opciones.appVersion) cuerpo.appVersion = opciones.appVersion.slice(0, 20);
  return cuerpo;
}
