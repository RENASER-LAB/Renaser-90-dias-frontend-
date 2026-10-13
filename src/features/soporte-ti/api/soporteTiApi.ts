import { ApiError, apiFetch } from '../../../services/http/apiClient';
import { validarRespuesta } from '../../mentor/api/mentorSchemas';
import { abrirConsola, cerrarConsola, renovarConsola, tokenDeConsola } from '../estado/sesionDeConsola';
import {
  circuitoSchema,
  desbloqueoSchema,
  funcionalidadConsolaSchema,
  listaDeFuncionalidadesSchema,
  paginaDeAuditoriaSchema,
  type CambioDeFuncionalidad,
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
