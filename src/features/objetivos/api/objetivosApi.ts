import { apiFetch } from '../../../services/http/apiClient';
import type { DefinicionRocaMaestra, EjeObjetivo, RocaMaestraApi } from '../types/objetivos.types';
import { objetivosSchemas, validarRespuesta } from './objetivosSchemas';

/**
 * Endpoints del objetivo de 90 días (Roca Maestra). Acá vive solo el "cómo se llama": qué hacer
 * con la respuesta es de `hooks/`, mismo criterio que `features/habits/api/habitsApi.ts`.
 */

/** `GET /api/v1/rocks/master` — las (0 a 3) rocas maestras del propio aprendiz, una por eje. */
export async function obtenerRocasMaestras(): Promise<RocaMaestraApi[]> {
  const r = await apiFetch<unknown>('/api/v1/rocks/master');
  return validarRespuesta(objetivosSchemas.rocasMaestras, r, 'GET /api/v1/rocks/master');
}

/**
 * `PUT /api/v1/rocks/master/{eje}` — define el objetivo de ese eje, o corrige el que ya estaba.
 *
 * Es una sola operación y no un "crear" más un "editar" porque por eje hay exactamente una roca
 * maestra o ninguna: el backend hace el upsert. Mandar dos veces lo mismo deja lo mismo, así que
 * reintentar tras un fallo de red es seguro.
 *
 * `meta`, `avance` y `unidad` van los tres o ninguno. Media meta da 400: un avance sin meta no
 * dibuja barra y un número sin unidad no se puede ni escribir en pantalla.
 */
export async function definirRocaMaestra(
  eje: EjeObjetivo,
  definicion: DefinicionRocaMaestra
): Promise<RocaMaestraApi> {
  const r = await apiFetch<unknown>(`/api/v1/rocks/master/${eje}`, { method: 'PUT', body: definicion });
  return validarRespuesta(objetivosSchemas.rocaMaestra, r, `PUT /api/v1/rocks/master/${eje}`);
}
