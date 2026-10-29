import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../../context/AuthContext';
import { useMinutoActual } from '../../../hooks/useMinutoActual';
import { obtenerHistorial } from '../api/radarApi';
import { useRadar } from '../RadarContext';
import type { CheckInRadarApi } from '../types/radar.types';
import { miRadarCorresponde } from '../utils/miRadar';
import { mitadDelRadar } from '../utils/mitadDelRadar';
import { configDeMiRadar } from './useConfigDeMiRadar';
import { useHistorialDeRadar } from './useHistorialDeRadar';

/**
 * Todo lo que necesita la mitad del Radar de Hoy (spec 016), armado con piezas que ya existen y sin una lectura más de las
 * que ya hace Mi Radar:
 *
 *  - los días 1 a 7, el estado de la hora en curso es el de `RadarContext` (`useRadarDelDia`, `GET /radar/latest`), el mismo
 *    que abre el formulario obligatorio. **No se pide nada más.**
 *  - desde el día 8, Mi Radar de la cuenta es el de `RadarContext` (una sola lectura para toda la app), y lo respondido hoy
 *    es el mismo historial de Yo → Mi Radar (`GET /radar/history`, `useHistorialDeRadar`). Se lee **solo si Mi Radar está
 *    encendido** —apagado o sin backend no hay qué decir—, y se vuelve a leer en silencio al volver a Hoy: pudo
 *    responderse desde Yo.
 *  - las hojas «Ya lo registraste» y «Tu Radar de hoy» muestran lo respondido: abrir una (`hojaAbierta`) lee el mismo
 *    historial los días 1 a 7, donde de otro modo no se pide.
 *  - registrar usa el MISMO envío del Código Renaser (`radar.enviar`): el mismo `POST /radar`, y el mismo 409 que se relee y
 *    se da por registrado. No hay una segunda lógica de envío.
 *
 * Qué dice la mitad y qué hace al tocarla está en `utils/mitadDelRadar.ts`, sin React.
 */
export function useRadarEnHoy({
  diaPrograma,
  inscrito,
  hojaAbierta,
}: {
  diaPrograma: number | null | undefined;
  inscrito: boolean | null | undefined;
  /** Hay una hoja de la mitad a la vista: hace falta leer lo respondido aunque sea la semana 1. */
  hojaAbierta: boolean;
}) {
  const { user } = useAuth();
  const radar = useRadar();
  const ahora = useMinutoActual();
  const lectura = radar.miRadar.lectura;
  const config = configDeMiRadar(lectura);

  const conMiRadarEncendido = Boolean(inscrito) && miRadarCorresponde(diaPrograma) && Boolean(config?.encendido);
  const pideRegistros = conMiRadarEncendido || hojaAbierta;
  const historial = useHistorialDeRadar(pideRegistros ? obtenerHistorial : null);
  const { recargar: recargarHistorial } = historial;

  /* «Todavía no lo leí» no es «no hay registros»: `useHistorialDeRadar` empieza en «cargando» solo si nace con a quién
     preguntarle, y aquí la pregunta aparece cuando se enciende Mi Radar o se abre una hoja. Hasta ver la lectura en curso
     se dice que se está leyendo; si no, la mitad diría «Tu hora» un instante aunque la hora ya estuviera respondida (el
     parpadeo de 2026-10-19). Las relecturas en silencio no pasan por acá: no vacían nada. */
  const [vistoLeyendo, setVistoLeyendo] = useState(false);
  useEffect(() => {
    if (!pideRegistros) setVistoLeyendo(false);
    else if (historial.cargando) setVistoLeyendo(true);
  }, [pideRegistros, historial.cargando]);
  const leyendo = pideRegistros && (historial.cargando || !vistoLeyendo);

  const mitad = useMemo(
    () =>
      mitadDelRadar({
        diaPrograma,
        inscrito,
        estadoDelDia: radar.estado,
        obligatorio: radar.obligatorio,
        minutosParaAbrir: radar.minutosParaAbrir,
        miRadar: lectura,
        // Una lectura que falló cuenta como «sin registros»: como los días 1 a 7, no puede quedarse sin ofrecerse.
        registros: conMiRadarEncendido && leyendo ? null : historial.registros,
        ahora,
      }),
    [diaPrograma, inscrito, radar.estado, radar.obligatorio, radar.minutosParaAbrir, lectura, conMiRadarEncendido, leyendo, historial.registros, ahora],
  );

  /* Al volver a Hoy se relee en silencio lo respondido (pudo responderse desde Yo) y, si no se había podido leer, Mi Radar.
     La primera vez no: la lectura de arranque ya está en marcha. Va con refs para que el efecto de foco no corra de nuevo
     cuando cambia algo mientras Hoy está a la vista. */
  const ultimo = useRef({ pideRegistros, recargarHistorial, estadoDeMiRadar: lectura.estado, recargarMiRadar: radar.miRadar.recargar });
  ultimo.current = { pideRegistros, recargarHistorial, estadoDeMiRadar: lectura.estado, recargarMiRadar: radar.miRadar.recargar };
  const primeraVez = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeraVez.current) {
        primeraVez.current = false;
        return;
      }
      const u = ultimo.current;
      if (u.pideRegistros) void u.recargarHistorial(true);
      if (u.estadoDeMiRadar === 'fallo') u.recargarMiRadar();
    }, []),
  );

  /** Registra con el envío de siempre y, si quedó, vuelve a leer lo respondido para que la mitad lo diga. */
  const registrar = useCallback(
    async (checkIn: CheckInRadarApi): Promise<boolean> => {
      const ok = await radar.enviar(checkIn);
      if (ok) await recargarHistorial(true);
      return ok;
    },
    [radar.enviar, recargarHistorial],
  );

  return {
    usuarioId: user?.id ?? null,
    ahora,
    mitad,
    config,
    /** Los días 1 a 7: abrir el formulario obligatorio de siempre. */
    abrirFormularioDeLaSemanaUno: radar.abrir,
    registrar,
    enviando: radar.enviando,
    errorAlRegistrar: radar.error,
    limpiarErrorAlRegistrar: radar.limpiarError,
    registros: historial.registros,
    leyendoRegistros: leyendo,
    falloAlLeerRegistros: historial.fallo !== null,
    releerRegistros: () => recargarHistorial(false),
  };
}
