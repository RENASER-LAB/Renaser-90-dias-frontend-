import { ApiError, apiFetch } from '../../../services/http/apiClient';
import { validarRespuesta } from '../../mentor/api/mentorSchemas';
import { abrirConsola, cerrarConsola, renovarConsola, tokenDeConsola } from '../estado/sesionDeConsola';
import {
  circuitoSchema,
  listaDeRolesSchema,
  reemplazoSchema,
  rolPersonalizadoConsolaSchema,
  despliegueSchema,
  listaDePersonasSchema,
  desbloqueoSchema,
  funcionalidadConsolaSchema,
  listaDeFuncionalidadesSchema,
  paginaDeAuditoriaSchema,
  type CambioDeDespliegue,
  type CambioDeRol,
  type RolNuevo,
  type RolPersonalizadoConsola,
  type CambioDeFuncionalidad,
  type DespliegueApi,
  type PersonaBuscada,
  type DesbloqueoApi,
  type FuncionalidadConsola,
  type PaginaDeAuditoria,
  type ParaQueSeDesbloquea,
  type ParteDelCircuito,
} from './soporteTiSchemas';

/**
 * La consola Soporte TI (spec 002, contrato §6). Solo `IT_SUPPORT`; cualquier otro rol recibe 403 del servidor, que
 * es quien autoriza (la app solo esconde la entrada). Todos los pedidos van con `X-Consola-Token`; el cambio crítico,
 * además, con `X-Reautenticacion` (un token de un solo uso que se pide con la contraseña).
 */
export const BASE_SOPORTE_TI = '/api/v1/soporte-ti';

export const CODIGO_CONSOLA_BLOQUEADA = 'CONSOLA_BLOQUEADA';
export const CODIGO_REAUTENTICACION_REQUERIDA = 'REAUTENTICACION_REQUERIDA';

/** El error que se lanza sin salir a la red cuando el token ya venció en el teléfono: el mismo que un 423. */
function consolaBloqueada(): ApiError {
  return new ApiError(423, 'La consola se bloqueó. Vuelve a escribir tu contraseña.', { codigo: CODIGO_CONSOLA_BLOQUEADA });
}

async function enLaConsola<T>(ruta: string, opciones: Parameters<typeof apiFetch>[1] = {}, extra?: Record<string, string>): Promise<T> {
  const token = tokenDeConsola();
  if (!token) throw consolaBloqueada();
  try {
    const respuesta = await apiFetch<T>(`${BASE_SOPORTE_TI}${ruta}`, {
      ...opciones,
      cabeceras: { 'X-Consola-Token': token, ...(extra ?? {}) },
    });
    renovarConsola();
    return respuesta;
  } catch (error) {
    if (error instanceof ApiError && error.status === 423) cerrarConsola();
    throw error;
  }
}

/**
 * Abre la consola (`CONSOLA`) o pide el token para un cambio crítico (`CAMBIO_CRITICO`). La contraseña no se guarda en
 * ningún lado. 401 = contraseña mal; 429 = cinco intentos en 15 min.
 */
export async function desbloquear(contrasena: string, para: ParaQueSeDesbloquea): Promise<DesbloqueoApi> {
  const token = tokenDeConsola();
  const respuesta = validarRespuesta<DesbloqueoApi>(
    desbloqueoSchema,
    await apiFetch<unknown>(`${BASE_SOPORTE_TI}/desbloqueo`, {
      method: 'POST',
      body: { contrasena, para },
      cabeceras: token ? { 'X-Consola-Token': token } : undefined,
      // Un 401 acá es la contraseña mal, no la sesión vencida: no se cierra la sesión de la app.
      el401EsContrasena: true,
    }),
    `POST ${BASE_SOPORTE_TI}/desbloqueo`,
  );
  if (para === 'CONSOLA') abrirConsola(respuesta.token, respuesta.venceEn);
  else renovarConsola();
  return respuesta;
}

export async function listarFuncionalidades(): Promise<FuncionalidadConsola[]> {
  return validarRespuesta(listaDeFuncionalidadesSchema, await enLaConsola<unknown>('/funcionalidades'), `GET ${BASE_SOPORTE_TI}/funcionalidades`);
}

/** 409 versión vieja · 428 crítico sin reautenticación · 400 sin motivo o clave anti-bloqueo. */
export async function cambiarFuncionalidad(
  clave: string,
  cambio: CambioDeFuncionalidad,
  reautenticacion?: string | null,
): Promise<FuncionalidadConsola> {
  const ruta = `/funcionalidades/${encodeURIComponent(clave)}`;
  return validarRespuesta(
    funcionalidadConsolaSchema,
    await enLaConsola<unknown>(ruta, { method: 'PUT', body: cambio }, reautenticacion ? { 'X-Reautenticacion': reautenticacion } : undefined),
    `PUT ${BASE_SOPORTE_TI}${ruta}`,
  );
}

export const TAMANO_DE_PAGINA_DE_AUDITORIA = 20;

export async function leerAuditoria(filtros: { clave?: string | null; pagina?: number }): Promise<PaginaDeAuditoria> {
  // A mano y no con `URLSearchParams`: el de React Native no implementa `set`.
  const parametros = [
    ...(filtros.clave ? [`clave=${encodeURIComponent(filtros.clave)}`] : []),
    `page=${filtros.pagina ?? 0}`,
    `size=${TAMANO_DE_PAGINA_DE_AUDITORIA}`,
  ];
  const ruta = `/auditoria?${parametros.join('&')}`;
  return validarRespuesta(paginaDeAuditoriaSchema, await enLaConsola<unknown>(ruta), `GET ${BASE_SOPORTE_TI}${ruta}`);
}

export async function leerCircuitoDeLaIa(): Promise<ParteDelCircuito[]> {
  return validarRespuesta(circuitoSchema, await enLaConsola<unknown>('/ia/circuito'), `GET ${BASE_SOPORTE_TI}/ia/circuito`);
}

// ---------------------------------------------------------------------------------------------------------------------
// Fase 2 — despliegue progresivo (contrato `fase-2.md` §3.4)
// ---------------------------------------------------------------------------------------------------------------------

const rutaDelDespliegue = (clave: string) => `/funcionalidades/${encodeURIComponent(clave)}/despliegue`;

/** El despliegue de una funcionalidad: porcentaje, probadores y las métricas de las últimas 24 h, por hora. */
export async function leerDespliegue(clave: string): Promise<DespliegueApi> {
  const ruta = rutaDelDespliegue(clave);
  return validarRespuesta(despliegueSchema, await enLaConsola<unknown>(ruta), `GET ${BASE_SOPORTE_TI}${ruta}`);
}

/**
 * Pone el porcentaje (0–100; 100 termina el despliegue). 409 versión vieja · 428 crítico sin reautenticación · 400 sin
 * motivo, clave anti-bloqueo o porcentaje fuera de rango.
 */
export async function cambiarDespliegue(clave: string, cambio: CambioDeDespliegue, reautenticacion?: string | null): Promise<DespliegueApi> {
  const ruta = rutaDelDespliegue(clave);
  return validarRespuesta(
    despliegueSchema,
    await enLaConsola<unknown>(ruta, { method: 'PUT', body: cambio }, reautenticacion ? { 'X-Reautenticacion': reautenticacion } : undefined),
    `PUT ${BASE_SOPORTE_TI}${ruta}`,
  );
}

/** Suma una probadora (la tiene aunque su cubeta quede fuera). 404 persona inexistente · 409 no está en despliegue. */
export async function sumarProbador(clave: string, usuarioId: string, motivo?: string | null): Promise<void> {
  await enLaConsola<unknown>(`${rutaDelDespliegue(clave)}/probadores/${encodeURIComponent(usuarioId)}`, {
    method: 'PUT',
    body: motivo?.trim() ? { motivo: motivo.trim() } : {},
  });
}

export async function quitarProbador(clave: string, usuarioId: string): Promise<void> {
  await enLaConsola<unknown>(`${rutaDelDespliegue(clave)}/probadores/${encodeURIComponent(usuarioId)}`, { method: 'DELETE' });
}

/** Busca personas activas por nombre o correo, sin tildes (máx. 20, sin cuentas de prueba). */
export async function buscarPersonas(texto: string): Promise<PersonaBuscada[]> {
  const ruta = `/personas?q=${encodeURIComponent(texto.trim())}`;
  return validarRespuesta(listaDePersonasSchema, await enLaConsola<unknown>(ruta), `GET ${BASE_SOPORTE_TI}${ruta}`);
}

// ---------------------------------------------------------------------------------------------------------------------
// Fase 2 — roles personalizados (contrato `fase-2.md` §4.5)
// ---------------------------------------------------------------------------------------------------------------------

const conReautenticacion = (reautenticacion?: string | null) => (reautenticacion ? { 'X-Reautenticacion': reautenticacion } : undefined);

export async function listarRoles(): Promise<RolPersonalizadoConsola[]> {
  return validarRespuesta(listaDeRolesSchema, await enLaConsola<unknown>('/roles'), `GET ${BASE_SOPORTE_TI}/roles`);
}

/** 400: base Soporte TI, nombre repetido, una clave fuera de la base o más de 20 activos. */
export async function crearRol(rol: RolNuevo, reautenticacion?: string | null): Promise<RolPersonalizadoConsola> {
  return validarRespuesta(
    rolPersonalizadoConsolaSchema,
    await enLaConsola<unknown>('/roles', { method: 'POST', body: rol }, conReautenticacion(reautenticacion)),
    `POST ${BASE_SOPORTE_TI}/roles`,
  );
}

/** 409 versión vieja · 400. */
export async function editarRol(id: string, cambio: CambioDeRol, reautenticacion?: string | null): Promise<RolPersonalizadoConsola> {
  const ruta = `/roles/${encodeURIComponent(id)}`;
  return validarRespuesta(
    rolPersonalizadoConsolaSchema,
    await enLaConsola<unknown>(ruta, { method: 'PUT', body: cambio }, conReautenticacion(reautenticacion)),
    `PUT ${BASE_SOPORTE_TI}${ruta}`,
  );
}

/** 409 si tiene personas asignadas: hay que reemplazarlo antes. */
export async function borrarRol(id: string, motivo: string, reautenticacion?: string | null): Promise<void> {
  await enLaConsola<unknown>(
    `/roles/${encodeURIComponent(id)}?motivo=${encodeURIComponent(motivo.trim())}`,
    { method: 'DELETE' },
    conReautenticacion(reautenticacion),
  );
}

/** Pasa a todas sus personas a otro rol personalizado de la misma base, o a ninguno (`null`: solo el rol base). */
export async function reemplazarRol(id: string, rolDestinoId: string | null, motivo: string, reautenticacion?: string | null): Promise<number | null> {
  const ruta = `/roles/${encodeURIComponent(id)}/reemplazar`;
  const respuesta = validarRespuesta<{ personasMovidas?: number | null }>(
    reemplazoSchema,
    (await enLaConsola<unknown>(ruta, { method: 'POST', body: { rolDestinoId, motivo: motivo.trim() } }, conReautenticacion(reautenticacion))) ?? {},
    `POST ${BASE_SOPORTE_TI}${ruta}`,
  );
  return respuesta.personasMovidas ?? null;
}
