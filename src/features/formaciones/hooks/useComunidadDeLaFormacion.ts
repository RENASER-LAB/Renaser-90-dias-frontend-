import { useCallback, useEffect, useRef, useState } from 'react';

import { Alert } from '../../../components/Alerta';
import { ApiError, mensajeDeError } from '../../../services/http/apiClient';
import { tacto } from '../../../utils/tacto';
import { cambiarTipoDeComunidad, leerComunidadDeLaFormacionApi } from '../api/formacionesApi';
import type { ComunidadDeLaFormacion, TipoDeComunidad } from '../types/formaciones.types';
import { avisoDeGuardado, mensajeDeApagar, tituloDeApagar } from '../utils/comunidadDeLaFormacion';

/** Por qué no hay lista: `no_disponible` es un backend anterior (404) o sin permiso (403): la sección no se dibuja. */
export type FalloDeLaComunidadDeLaFormacion = { mensaje: string; noDisponible: boolean };

/** La confirmación de APAGAR, con el `Alert` de la app (en web lo dibuja `AnfitrionAlerta`; no es `window.confirm`). */
export function confirmarApagado(tipo: TipoDeComunidad, conversaciones: number): Promise<boolean> {
  return new Promise(resolver => {
    Alert.alert(tituloDeApagar(tipo), mensajeDeApagar(conversaciones), [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolver(false) },
      { text: 'Apagar', style: 'destructive', onPress: () => resolver(true) },
    ]);
  });
}

/**
 * Los cuatro tipos de comunidad de UNA formación (Administración → Formaciones → detalle, spec 024).
 *
 * - **Prender** guarda al instante. **Apagar pide confirmación** diciendo cuántas conversaciones esconde, y solo después guarda.
 * - Tras guardar se vuelve a leer (el número de conversaciones es del servidor) y se dice en línea; `tacto.logro()` una vez.
 * - Un fila ocupada (`ocupados[tipo]`) no recibe otro toque. Un error va en un diálogo y el interruptor queda como estaba.
 * - Cada lectura toma un turno y solo la última escribe.
 */
export function useComunidadDeLaFormacion(codigo: string) {
  const [comunidad, setComunidad] = useState<ComunidadDeLaFormacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<FalloDeLaComunidadDeLaFormacion | null>(null);
  const [ocupados, setOcupados] = useState<Partial<Record<TipoDeComunidad, boolean>>>({});
  const [aviso, setAviso] = useState<{ clave: number; texto: string } | null>(null);
  const turno = useRef(0);
  const enCurso = useRef(new Set<TipoDeComunidad>());

  const leer = useCallback(async () => {
    const mio = ++turno.current;
    setCargando(true);
    setFallo(null);
    try {
      const leida = await leerComunidadDeLaFormacionApi(codigo);
      if (mio !== turno.current) return;
      setComunidad(leida);
      if (!leida) setFallo({ mensaje: 'No pudimos leer la comunidad de esta formación.', noDisponible: false });
    } catch (e) {
      if (mio !== turno.current) return;
      const noDisponible = e instanceof ApiError && (e.status === 404 || e.status === 403);
      setFallo({ mensaje: mensajeDeError(e, 'No pudimos leer la comunidad de esta formación. Revisa tu conexión.'), noDisponible });
    } finally {
      if (mio === turno.current) setCargando(false);
    }
  }, [codigo]);

  useEffect(() => {
    void leer();
    return () => {
      turno.current += 1;
    };
  }, [leer]);

  const cambiar = useCallback(
    async (tipo: TipoDeComunidad, prendido: boolean) => {
      if (enCurso.current.has(tipo)) return;
      const fila = comunidad?.tipos.find(t => t.tipo === tipo);
      if (!fila || fila.prendido === prendido) return;
      enCurso.current.add(tipo);
      try {
        if (!prendido && !(await confirmarApagado(tipo, fila.conversaciones))) return;
        setOcupados(previos => ({ ...previos, [tipo]: true }));
        try {
          await cambiarTipoDeComunidad(codigo, tipo, prendido);
        } catch (e) {
          tacto.error();
          Alert.alert(
            prendido ? 'No se pudo prender' : 'No se pudo apagar',
            mensajeDeError(e, 'No pudimos guardar el cambio. Inténtalo de nuevo.'),
          );
          return;
        }
        tacto.logro();
        setAviso({ clave: Date.now(), texto: avisoDeGuardado(tipo, prendido) });
        /* Se vuelve a leer: el servidor sabe cuántas conversaciones tiene ahora cada tipo. Si falla, el cambio ya quedó guardado:
           se refleja localmente para que el interruptor diga la verdad. */
        try {
          const leida = await leerComunidadDeLaFormacionApi(codigo);
          if (leida) setComunidad(leida);
          else setComunidad(previa => (previa ? { ...previa, tipos: previa.tipos.map(t => (t.tipo === tipo ? { ...t, prendido } : t)) } : previa));
        } catch {
          setComunidad(previa => (previa ? { ...previa, tipos: previa.tipos.map(t => (t.tipo === tipo ? { ...t, prendido } : t)) } : previa));
        }
      } finally {
        enCurso.current.delete(tipo);
        setOcupados(previos => ({ ...previos, [tipo]: false }));
      }
    },
    [codigo, comunidad],
  );

  return { comunidad, cargando, fallo, ocupados, aviso, limpiarAviso: () => setAviso(null), cambiar, recargar: leer };
}
