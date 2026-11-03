import { apiFetch } from '../../../services/http/apiClient';
import { leerDiagnostico, leerLecturaDelDiagnostico } from '../../diagnostico/api/diagnosticoSchemas';
import type { DiagnosticoParaLaPersona, LecturaDelDiagnostico } from '../../diagnostico/types/diagnostico.types';
import type {
  BorradorDelDiagnostico,
  FichaDeIngreso,
  ModoDeImportacion,
  PreguntaAdmin,
  PreguntaRequest,
  ResultadoDeAsignar,
  ResultadoDeImportacion,
  ResultadoDePublicar,
  ResultadoDeQuitar,
  SeccionAdmin,
  VersionDelDiagnostico,
  VistaPreviaDeImportacion,
} from '../types/diagnosticoAdmin.types';
import {
  leerBorrador,
  leerPreguntaAdmin,
  leerResultadoDeAsignar,
  leerResultadoDeImportacion,
  leerResultadoDePublicar,
  leerResultadoDeQuitar,
  leerSeccionSola,
  leerVersiones,
  leerVistaPreviaDeImportacion,
} from './diagnosticoAdminSchemas';

/**
 * Administración del diagnóstico contra el servidor (spec 026, contrato §5). Solo ADMIN y ALQUIMISTA; cualquier otro rol o una cuenta
 * suspendida recibe 403, que quien llama dice con palabras. Todo lo que cambia el contenido toca el BORRADOR: las personas ven solo lo
 * publicado (`publicarDiagnostico`). Aquí vive el «cómo se llama»; qué hacer con cada respuesta es de los hooks y las pantallas.
 */
export const BASE_DIAGNOSTICO_ADMIN = '/api/v1/admin/diagnostico';
const BASE = BASE_DIAGNOSTICO_ADMIN;

/** Los dos archivos de texto (CSV con BOM). Los baja `descargarConSesion` con la sesión: `apiFetch` solo entiende JSON. */
export const RUTA_DE_LA_PLANTILLA = `${BASE}/plantilla.csv`;
export const RUTA_DE_LA_EXPORTACION = `${BASE}/exportar.csv`;

/** `GET /`: el borrador completo. `null` si lo que llegó no es un borrador. */
export async function leerBorradorDelDiagnostico(): Promise<BorradorDelDiagnostico | null> {
  return leerBorrador(await apiFetch<unknown>(BASE, { timeoutMs: 20_000 }));
}

/** `GET /vista-previa`: lo mismo que ve la persona, armado desde el borrador. Sin parámetros: todas las preguntas y 90 días. */
export async function leerVistaPreviaDelDiagnostico(
  opciones: { formacion?: string | null; duracionDias?: number | null } = {},
): Promise<DiagnosticoParaLaPersona | null> {
  const params = new URLSearchParams();
  if (opciones.formacion) params.set('formacion', opciones.formacion);
  if (opciones.duracionDias) params.set('duracionDias', String(opciones.duracionDias));
  const consulta = params.toString();
  return leerDiagnostico(await apiFetch<unknown>(`${BASE}/vista-previa${consulta ? `?${consulta}` : ''}`, { timeoutMs: 20_000 }));
}

// ── Secciones ───────────────────────────────────────────────────────────────

export async function crearSeccion(cuerpo: { titulo: string; descripcion?: string | null }): Promise<SeccionAdmin | null> {
  return leerSeccionSola(await apiFetch<unknown>(`${BASE}/secciones`, { method: 'POST', body: cuerpo }));
}

export async function editarSeccion(id: number, cuerpo: { titulo: string; descripcion?: string | null }): Promise<SeccionAdmin | null> {
  return leerSeccionSola(await apiFetch<unknown>(`${BASE}/secciones/${id}`, { method: 'PUT', body: cuerpo }));
}

/** Quita sus preguntas con las reglas de «quitar» (se eliminan o se retiran). */
export async function borrarSeccion(id: number): Promise<ResultadoDeQuitar> {
  return leerResultadoDeQuitar(await apiFetch<unknown>(`${BASE}/secciones/${id}`, { method: 'DELETE' }));
}

/** `PUT /secciones/orden`: TODAS las secciones, en el orden nuevo. */
export async function ordenarSecciones(ids: number[]): Promise<void> {
  await apiFetch<unknown>(`${BASE}/secciones/orden`, { method: 'PUT', body: { ids } });
}

// ── Preguntas ───────────────────────────────────────────────────────────────

export async function crearPregunta(cuerpo: PreguntaRequest): Promise<PreguntaAdmin | null> {
  return leerPreguntaAdmin(await apiFetch<unknown>(`${BASE}/preguntas`, { method: 'POST', body: cuerpo }), cuerpo.seccionId);
}

export async function editarPregunta(id: number, cuerpo: PreguntaRequest): Promise<PreguntaAdmin | null> {
  return leerPreguntaAdmin(await apiFetch<unknown>(`${BASE}/preguntas/${id}`, { method: 'PUT', body: cuerpo }), cuerpo.seccionId);
}

/** `PUT /preguntas/{id}/mover`: la sección y la posición final (0 = la primera) dentro de ella. */
export async function moverPregunta(id: number, destino: { seccionId: number; posicion: number }): Promise<void> {
  await apiFetch<unknown>(`${BASE}/preguntas/${id}/mover`, { method: 'PUT', body: destino });
}

export async function duplicarPregunta(id: number): Promise<PreguntaAdmin | null> {
  return leerPreguntaAdmin(await apiFetch<unknown>(`${BASE}/preguntas/${id}/duplicar`, { method: 'POST' }));
}

/** Un 409 `TIENE_DEPENDIENTES` trae `dependientes: number[]` en el cuerpo del `ApiError`; se repite con `quitarDependientes`. */
export async function quitarPreguntas(ids: number[], quitarDependientes = false): Promise<ResultadoDeQuitar> {
  return leerResultadoDeQuitar(
    await apiFetch<unknown>(`${BASE}/preguntas/quitar`, { method: 'POST', body: { ids, quitarDependientes } }),
  );
}

/** 409 si otra pregunta activa ya tiene su «alimenta». */
export async function restaurarPregunta(id: number): Promise<PreguntaAdmin | null> {
  return leerPreguntaAdmin(await apiFetch<unknown>(`${BASE}/preguntas/${id}/restaurar`, { method: 'POST' }));
}

// ── Publicar y versiones ────────────────────────────────────────────────────

/**
 * `POST /publicar` con la versión publicada que la pantalla cargó. 409 `OTRA_PERSONA_PUBLICO` (trae `versionVigente`) si alguien
 * publicó después; 400 `NO_SE_PUEDE_PUBLICAR` (trae `motivos`).
 */
export async function publicarDiagnostico(versionBase: number): Promise<ResultadoDePublicar | null> {
  return leerResultadoDePublicar(await apiFetch<unknown>(`${BASE}/publicar`, { method: 'POST', body: { versionBase } }));
}

export async function leerVersionesDelDiagnostico(): Promise<VersionDelDiagnostico[]> {
  return leerVersiones(await apiFetch<unknown>(`${BASE}/versiones`));
}

// ── Importar ────────────────────────────────────────────────────────────────

export async function revisarImportacion(texto: string): Promise<VistaPreviaDeImportacion | null> {
  return leerVistaPreviaDeImportacion(
    await apiFetch<unknown>(`${BASE}/importacion/vista-previa`, { method: 'POST', body: { texto }, timeoutMs: 30_000 }),
  );
}

/** Con errores el servidor responde 400 con la lista y no guarda nada. Lo importado queda en borrador. */
export async function confirmarImportacion(texto: string, modo: ModoDeImportacion): Promise<ResultadoDeImportacion> {
  return leerResultadoDeImportacion(
    await apiFetch<unknown>(`${BASE}/importacion`, { method: 'POST', body: { texto, modo }, timeoutMs: 60_000 }),
  );
}

// ── Asignar la ficha a quienes ya existen (026-9) ───────────────────────────

/** `GET /personas/{id}`: la lectura de esa persona; de ahí salen su `ficha` y su `estado`. */
export async function leerFichaDeLaPersona(personaId: string): Promise<LecturaDelDiagnostico> {
  return leerLecturaDelDiagnostico(await apiFetch<unknown>(`${BASE}/personas/${encodeURIComponent(personaId)}`, { timeoutMs: 15_000 }));
}

/** `POST /personas/ficha`: cambia la ficha de ingreso de varias personas; las que no se pueden quedan en `omitidas` con su motivo. */
export async function asignarFicha(ids: string[], ficha: FichaDeIngreso): Promise<ResultadoDeAsignar> {
  return leerResultadoDeAsignar(await apiFetch<unknown>(`${BASE}/personas/ficha`, { method: 'POST', body: { ids, ficha } }));
}
