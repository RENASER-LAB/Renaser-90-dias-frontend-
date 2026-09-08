import { apiFetch } from '../../../services/http/apiClient';
import type {
  CierreRocaSemanal,
  DefinicionRocaMaestra,
  EdicionRocaSemanal,
  EjeObjetivo,
  ItemPlanDiario,
  ItemPlanSemanal,
  RocaDiariaApi,
  RocaMaestraApi,
  RocaSemanalApi,
} from '../types/objetivos.types';
import { objetivosSchemas, validarRespuesta } from './objetivosSchemas';

/**
 * Endpoints de las rocas: el objetivo de 90 días (maestra), el plan de la semana (semanal) y las
 * acciones agendadas del día (diaria). Acá vive solo el "cómo se llama": qué hacer con la respuesta
 * es de `hooks/`, mismo criterio que `features/habits/api/habitsApi.ts`.
 *
 * Los tres niveles están encadenados en el backend y conviene tenerlo presente al leer esto:
 * sin las **tres** maestras, `/weekly` responde `403 ROCKS_LOCKED`; sin la semanal del eje,
 * `/plan` responde `400 NO_WEEKLY_ROCK`.
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


/* ------------------------------------------------------------------------------------------------
 * Semanal
 * ---------------------------------------------------------------------------------------------- */

/**
 * `GET /api/v1/rocks/weekly` — las rocas de una semana (0 o 3, una por eje).
 *
 * Sin `semana`, el servidor devuelve las de la semana en curso calculada **con la zona horaria del
 * participante**. Por eso la app no manda un número salvo que el usuario esté mirando otra semana:
 * recalcularlo acá sería repetir una cuenta que depende de un dato que el cliente no tiene.
 */
export async function obtenerRocasSemanales(semana?: number): Promise<RocaSemanalApi[]> {
  const ruta = semana == null ? '/api/v1/rocks/weekly' : `/api/v1/rocks/weekly?semana=${semana}`;
  const r = await apiFetch<unknown>(ruta);
  return validarRespuesta(objetivosSchemas.rocasSemanales, r, 'GET /api/v1/rocks/weekly');
}

/**
 * `POST /api/v1/rocks/weekly` — abre la semana con **el trío completo**: una roca por eje, las tres
 * de una. Mandar dos da 400 ("se requiere exactamente una roca semanal por eje").
 *
 * **El número de semana no se manda.** Lo decide el servidor: la semana de hoy, o la siguiente si
 * hoy es domingo (`RocaSemanalService.numeroSemanaAPlanificar`). Mandarlo desde el cliente abriría
 * la puerta a planificar una semana equivocada por un desfase de zona horaria.
 *
 * Errores que la pantalla tiene que distinguir, porque significan cosas muy distintas:
 * `403 ROCKS_LOCKED` (faltan maestras) y `409 ALREADY_PLANNED` (esta semana ya está abierta).
 */
export async function crearPlanSemanal(rocas: ItemPlanSemanal[]): Promise<RocaSemanalApi[]> {
  const r = await apiFetch<unknown>('/api/v1/rocks/weekly', { method: 'POST', body: { rocas } });
  return validarRespuesta(objetivosSchemas.rocasSemanales, r, 'POST /api/v1/rocks/weekly');
}

/**
 * `PATCH /api/v1/rocks/weekly/{id}` — corrige una roca ya abierta. Parcial: lo que no va, no se toca.
 *
 * **La ventana no son 48 h**, pese a que el caso de uso se llame `EditarDentroDe48hUseCase`: es
 * domingo 12:00 → lunes 09:00 en la zona del participante. Quien planificó a destiempo (fuera de esa
 * franja) tiene 2 h desde que creó, y nunca más allá del fin de su día local. Fuera de eso: 403.
 */
export async function editarRocaSemanal(id: string, edicion: EdicionRocaSemanal): Promise<RocaSemanalApi> {
  const r = await apiFetch<unknown>(`/api/v1/rocks/weekly/${id}`, { method: 'PATCH', body: edicion });
  return validarRespuesta(objetivosSchemas.rocaSemanal, r, `PATCH /api/v1/rocks/weekly/${id}`);
}

/**
 * `PATCH /api/v1/rocks/weekly/{id}/review` — cierra la semana con la autoevaluación final, el
 * bloqueo principal y la corrección. Los tres son obligatorios: media revisión no sirve para nada.
 *
 * Esto **no** tiene ventana horaria: una semana se puede cerrar cuando la persona pueda sentarse a
 * revisarla.
 */
export async function cerrarSemana(id: string, cierre: CierreRocaSemanal): Promise<RocaSemanalApi> {
  const r = await apiFetch<unknown>(`/api/v1/rocks/weekly/${id}/review`, { method: 'PATCH', body: cierre });
  return validarRespuesta(objetivosSchemas.rocaSemanal, r, `PATCH /api/v1/rocks/weekly/${id}/review`);
}

/* ------------------------------------------------------------------------------------------------
 * Diario
 * ---------------------------------------------------------------------------------------------- */

/** `GET /api/v1/rocks/today` — lo agendado para hoy. Es lo que Training muestra en VIDA Y NEGOCIO. */
export async function obtenerRocasDeHoy(): Promise<RocaDiariaApi[]> {
  const r = await apiFetch<unknown>('/api/v1/rocks/today');
  return validarRespuesta(objetivosSchemas.rocasDiarias, r, 'GET /api/v1/rocks/today');
}

/** `GET /api/v1/rocks/tomorrow` — lo agendado para mañana, para ver qué quedó planificado. */
export async function obtenerRocasDeManana(): Promise<RocaDiariaApi[]> {
  const r = await apiFetch<unknown>('/api/v1/rocks/tomorrow');
  return validarRespuesta(objetivosSchemas.rocasDiarias, r, 'GET /api/v1/rocks/tomorrow');
}

/**
 * `POST /api/v1/rocks/plan` — agenda las acciones de un día, con hora si la persona la eligió.
 *
 * **Qué fechas acepta.** No cualquiera: a partir de las 18:00 locales solo se puede planificar
 * **mañana** (es la hora de cerrar el día y preparar el siguiente); antes de las 18:00 se acepta
 * hoy o mañana. Otra fecha da `400 INVALID_DATE`. Es deliberado: planificar tres días adelante es
 * lista de deseos, no plan.
 *
 * Otros dos errores esperables: `409 ALREADY_PLANNED` (ese día ya tiene rocas — el plan del día se
 * arma una vez) y `400 NO_WEEKLY_ROCK` (falta la roca semanal del eje, o sea la parte 2).
 */
export async function crearPlanDiario(fecha: string, rocas: ItemPlanDiario[]): Promise<RocaDiariaApi[]> {
  const r = await apiFetch<unknown>('/api/v1/rocks/plan', { method: 'POST', body: { fecha, rocas } });
  return validarRespuesta(objetivosSchemas.rocasDiarias, r, 'POST /api/v1/rocks/plan');
}

/* ------------------------------------------------------------------------------------------------
 * Evidencia de una roca diaria
 * ---------------------------------------------------------------------------------------------- */

/**
 * `POST /api/v1/rocks/{id}/evidence/upload-url` — URL PUT prefirmada de S3 para el archivo.
 *
 * Es el gemelo de `habit-tracks/{id}/evidence/upload-url`, y existe aparte **porque el id es de otra
 * cosa**: acá va el id de la roca diaria, allá el del registro del día de un hábito. Mandar uno por
 * el otro da 404, que es exactamente lo que pasaba cuando Training abría el modal de hábitos para
 * una tarjeta de VIDA Y NEGOCIO.
 *
 * `tipoContenido` es el MIME exacto y tiene que ser EL MISMO que después viaja como `Content-Type`
 * del PUT: S3 firma el content-type y si no coinciden rechaza con un 403 mudo.
 */
export async function solicitarUrlSubidaEvidenciaRoca(
  rocaId: string,
  tipoContenido: string
): Promise<{ uploadUrl: string; bucket: string; ruta: string }> {
  const r = await apiFetch<unknown>(`/api/v1/rocks/${rocaId}/evidence/upload-url`, {
    method: 'POST',
    body: { tipoContenido },
  });
  return validarRespuesta(
    objetivosSchemas.urlSubidaEvidencia,
    r,
    'POST /api/v1/rocks/{id}/evidence/upload-url'
  );
}

/**
 * `POST /api/v1/rocks/{id}/evidence` — registra la evidencia **y cierra la roca**, en una sola
 * llamada.
 *
 * Ojo con la diferencia contra los hábitos, que es la que hace que no se pueda reusar aquel camino:
 * un hábito necesita **dos** pasos (`/evidence` y después `/complete`, y es el segundo el que da los
 * puntos). Una roca se cierra y se premia acá mismo. Llamarlo dos veces da `409 ALREADY_COMPLETED`.
 *
 * `timestampExif` es **obligatorio para FOTO** y se compara contra el instante de subida con ±15 min
 * de margen (Ley VI). Mandarlo en `null` con `tipo: 'FOTO'` hace estallar al servidor con un 500 —
 * ver la anotación en `docs/BITACORA_ERRORES.md`. Por eso quien llama tiene que resolver antes qué
 * hacer si no hay instante, en vez de mandar `null` y ver qué pasa.
 */
export async function registrarEvidenciaRoca(
  rocaId: string,
  evidencia: {
    tipo: 'FOTO' | 'VIDEO' | 'AUDIO' | 'TEXTO' | 'CAPTURA';
    bucket?: string | null;
    rutaStorage?: string | null;
    contenidoTexto?: string | null;
    timestampExif?: string | null;
  }
): Promise<RocaDiariaApi> {
  const r = await apiFetch<unknown>(`/api/v1/rocks/${rocaId}/evidence`, {
    method: 'POST',
    body: {
      tipo: evidencia.tipo,
      bucket: evidencia.bucket ?? null,
      rutaStorage: evidencia.rutaStorage ?? null,
      contenidoTexto: evidencia.contenidoTexto ?? null,
      timestampExif: evidencia.timestampExif ?? null,
      gpsLat: null,
      gpsLng: null,
      esPrincipal: true,
      publishedToWall: false,
    },
  });
  return validarRespuesta(objetivosSchemas.rocaDiaria, r, 'POST /api/v1/rocks/{id}/evidence');
}
