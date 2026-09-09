import { apiFetch } from '../../../services/http/apiClient';
import { mapaServidorSchema, validarRespuesta, type MapaServidor } from './mapaSchemas';

/**
 * El estado del Mapa de Renacimiento en el SERVIDOR.
 *
 * Hasta ahora el mapa solo existia en `AsyncStorage` del dispositivo. Eso bastaba para reanudar
 * en el paso donde quedo, pero no para saber si la persona ya lo termino: al reinstalar, al
 * cambiar de telefono o al limpiar datos, el mapa volvia a aparecer vacio y se podia recorrer
 * otra vez — y `activar()` volvia a crear las rocas maestras y los habitos, duplicandolos.
 */
export async function consultarMapa(): Promise<MapaServidor> {
  const r = await apiFetch<unknown>('/api/v1/mapa-renacimiento');
  return validarRespuesta(mapaServidorSchema, r, 'GET /api/v1/mapa-renacimiento');
}

/**
 * `POST /api/v1/mapa-renacimiento/completar` — marca la etapa como terminada (204, sin cuerpo).
 *
 * Marca la ETAPA, no activa el mapa: activar crea los habitos y eso ya lo hace `activar()` en el
 * hook contra sus propios endpoints. Este aviso es lo que hace que el "ya esta hecho" sobreviva
 * al dispositivo.
 */
export async function completarEtapaMapa(): Promise<void> {
  await apiFetch<void>('/api/v1/mapa-renacimiento/completar', { method: 'POST' });
}
