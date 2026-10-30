import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { ApiError } from '../../../services/http/apiClient';
import { guardarMiRadar, obtenerMiRadar } from '../api/radarApi';
import { escucharDiaUnoElegido } from '../../programa/events/avisoDiaUnoElegido';
import { CONFIG_RADAR } from '../config/configRadar';
import type { MiRadarApi, PedidoDeMiRadarApi } from '../types/radar.types';
import { miRadarCorresponde } from '../utils/miRadar';

/**
 * Lo que la app sabe de Mi Radar de esta cuenta (spec 012, rehecha por la 019).
 *
 * - `pendiente`: todavía no se leyó, o no corresponde leerlo (antes del día 8, sin sesión).
 * - `no-disponible`: el servidor no lo ofrece (404: backend anterior) o respondió un 403 **sin motivo que la app reconozca**
 *   (un backend anterior a la 019). La fila de Yo no aparece y no suena ningún aviso de Mi Radar.
 * - `sin-programa`: **403 `PROGRAMA_NO_ACTIVADO`** — el personal que todavía no eligió su Día 1 (FR-019). La pantalla lo dice y
 *   ofrece «Elegir mi Día 1»; Yo muestra la fila.
 * - `bloqueada`: **403 `CUENTA_SUSPENDIDA` o `SIN_PERMISO`** — la pantalla dice el motivo en una línea y nada más. El texto lo pone la
 *   app (nunca el del servidor): el código basta.
 * - `fallo`: no se pudo leer (sin red, 5xx). **No se sabe**, y por eso no se toca nada de lo programado: una red caída
 *   no puede apagar los avisos de nadie.
 * - `lista`: lo guardado en la cuenta.
 */
export type LecturaDeMiRadar =
  | { estado: 'pendiente' }
  | { estado: 'no-disponible' }
  | { estado: 'sin-programa' }
  | { estado: 'bloqueada'; motivo: 'suspendida' | 'sin-permiso' }
  | { estado: 'fallo' }
  | { estado: 'lista'; config: MiRadarApi };

export const MI_RADAR_PENDIENTE: LecturaDeMiRadar = { estado: 'pendiente' };

/** Lo guardado, o `null` si todavía no se sabe o no hay. */
export function configDeMiRadar(lectura: LecturaDeMiRadar): MiRadarApi | null {
  return lectura.estado === 'lista' ? lectura.config : null;
}

/** Los motivos con que el servidor explica un 403 (`codigo` del cuerpo, spec 019). */
export const CODIGO_PROGRAMA_NO_ACTIVADO = 'PROGRAMA_NO_ACTIVADO';
export const CODIGO_CUENTA_SUSPENDIDA = 'CUENTA_SUSPENDIDA';
export const CODIGO_SIN_PERMISO = 'SIN_PERMISO';

/**
 * Lo que dice una lectura que falló, o `null` si es un fallo que no se interpreta (sin red, 5xx, una respuesta rara).
 *
 * - **404**: un backend anterior, que no tiene la ruta.
 * - **403 con un motivo conocido**: lo dice (sin programa, suspendida, sin permiso).
 * - **403 sin motivo** (un backend anterior a la 019) **o con uno que esta app no conoce**: se lee como siempre, «no hay Mi Radar»,
 *   en silencio. Nunca se inventa un motivo.
 */
export function lecturaDeUnError(error: unknown): LecturaDeMiRadar | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status === 404) return { estado: 'no-disponible' };
  if (error.status !== 403) return null;
  switch (error.codigo) {
    case CODIGO_PROGRAMA_NO_ACTIVADO:
      return { estado: 'sin-programa' };
    case CODIGO_CUENTA_SUSPENDIDA:
      return { estado: 'bloqueada', motivo: 'suspendida' };
    case CODIGO_SIN_PERMISO:
      return { estado: 'bloqueada', motivo: 'sin-permiso' };
    default:
      return { estado: 'no-disponible' };
  }
}

/**
 * Lee y guarda Mi Radar de la cuenta. Lo monta `RadarProvider` (una sola lectura para toda la app: la fila de Yo, la
 * pantalla y los avisos del teléfono leen lo mismo).
 *
 * **Se lee sola desde el día 8.** Los días 1 a 7 no se pide nada: ahí el Código Renaser es el de siempre y este
 * endpoint no tiene nada que decir (FR-001). Antes del día 8 solo se lee si alguien lo pide (`solicitar`, `reiniciar`): el
 * personal que todavía no eligió su Día 1 necesita que el servidor le diga POR QUÉ no hay Mi Radar (403 con motivo).
 *
 * **Se vuelve a leer al volver la app al frente** (con 10 minutos de por medio): las horas salen del Despertar y el Dormir
 * que la persona programa en Training, y es así como las alarmas se rehacen cuando cambian (spec 019).
 *
 * Tres maneras de pedir una lectura, para que la pantalla nunca muestre lo anterior mientras llega lo nuevo:
 * - `solicitar`: «averigua si hay Mi Radar» antes del día 8. Una vez por cuenta; no vacía nada.
 * - `recargar`: lee de nuevo **sin vaciar** lo que se ve (al abrir la pantalla, al volver a Hoy tras un fallo).
 * - `reiniciar`: olvida un motivo o un fallo (queda `pendiente`: «Cargando…») y lee. Para «Reintentar» y para después de elegir el Día 1.
 */
const MINUTOS_ENTRE_LECTURAS = 10;

export function useConfigDeMiRadar(diaPrograma: number | null, usuarioId: string | null) {
  const porElDia = miRadarCorresponde(diaPrograma);
  /* La cuenta para la que alguien pidió leer antes del día 8. Va con la cuenta y no como un booleano: al cambiar de sesión
     el pedido de la anterior no vale para la nueva. */
  const [pedidaPor, setPedidaPor] = useState<string | null>(null);
  const corresponde = usuarioId !== null && CONFIG_RADAR.activo && (porElDia || pedidaPor === usuarioId);
  const [lectura, setLectura] = useState<LecturaDeMiRadar>(MI_RADAR_PENDIENTE);
  /** Cada vez que sube, se vuelve a leer sin vaciar lo que ya se ve. */
  const [version, setVersion] = useState(0);

  /* Todo lo que sabe este hook es de UNA persona: al cambiar de cuenta, o al salir de los días en que corresponde, se
     olvida (mismo criterio que `useRadarDelDia`). */
  useEffect(() => {
    setLectura(MI_RADAR_PENDIENTE);
  }, [usuarioId, corresponde]);

  /* `porElDia` en las dependencias: al llegar al día 8 con la app abierta se relee lo que se supo antes (sin vaciarlo). */
  useEffect(() => {
    if (!corresponde) return;
    let vigente = true;
    obtenerMiRadar()
      .then(config => {
        if (vigente) setLectura({ estado: 'lista', config });
      })
      .catch((e: unknown) => {
        if (!vigente) return;
        const conocida = lecturaDeUnError(e);
        if (!conocida) console.warn('[Mi Radar] no se pudo leer:', e);
        /* Un fallo que no se sabe interpretar conserva lo último que se sabía (una lectura buena, un motivo del servidor):
           una red caída no cambia lo que el servidor ya dijo. Solo si nunca se supo nada queda en `fallo`. */
        setLectura(previa => conocida ?? (previa.estado === 'pendiente' || previa.estado === 'fallo' ? { estado: 'fallo' } : previa));
      });
    return () => {
      vigente = false;
    };
  }, [corresponde, porElDia, usuarioId, version]);

  const recargar = useCallback(() => setVersion(v => v + 1), []);

  const solicitar = useCallback(() => {
    if (usuarioId !== null) setPedidaPor(usuarioId);
  }, [usuarioId]);

  /** Olvida un motivo o un fallo (queda «Cargando…»): sería mostrar lo de antes. Una lectura buena se queda a la vista. */
  const olvidarElMotivo = useCallback(() => {
    setLectura(previa => (previa.estado === 'lista' || previa.estado === 'pendiente' ? previa : MI_RADAR_PENDIENTE));
  }, []);

  const reiniciar = useCallback(() => {
    if (usuarioId !== null) setPedidaPor(usuarioId);
    olvidarElMotivo();
    setVersion(v => v + 1);
  }, [usuarioId, olvidarElMotivo]);

  /* Elegir el Día 1 (desde Yo, Hoy, Training o el onboarding) cambia la respuesta del servidor: «sin programa» deja de ser verdad. Si ya
     se está mirando Mi Radar de esta cuenta, se relee —sin dejar a la vista el motivo de antes—, como las demás lecturas del Día 1.
     Quien nunca lo pidió (un aprendiz en su onboarding) no dispara ninguna lectura. */
  useEffect(
    () =>
      escucharDiaUnoElegido(() => {
        if (!corresponde) return;
        olvidarElMotivo();
        setVersion(v => v + 1);
      }),
    [corresponde, olvidarElMotivo],
  );

  /* Al volver la app al frente se relee, a lo sumo cada `MINUTOS_ENTRE_LECTURAS`. */
  const ultimaLectura = useRef(Date.now());
  useEffect(() => {
    ultimaLectura.current = Date.now();
  }, [version]);
  useEffect(() => {
    if (!corresponde) return;
    const suscripcion = AppState.addEventListener('change', estado => {
      if (estado !== 'active') return;
      if (Date.now() - ultimaLectura.current < MINUTOS_ENTRE_LECTURAS * 60_000) return;
      setVersion(v => v + 1);
    });
    return () => suscripcion.remove();
  }, [corresponde]);

  /** Guarda y deja a la vista lo que el servidor respondió. Si falla, el error llega a quien lo pidió. */
  const guardar = useCallback(async (pedido: PedidoDeMiRadarApi): Promise<MiRadarApi> => {
    const guardada = await guardarMiRadar(pedido);
    setLectura({ estado: 'lista', config: guardada });
    return guardada;
  }, []);

  return useMemo(() => ({ lectura, guardar, recargar, solicitar, reiniciar }), [lectura, guardar, recargar, solicitar, reiniciar]);
}
