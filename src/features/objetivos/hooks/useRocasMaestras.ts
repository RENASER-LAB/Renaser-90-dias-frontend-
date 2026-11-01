import { useCallback, useEffect, useState } from 'react';

import { mensajeDeObjetivos } from '../utils/mensajeDeObjetivos';
import * as objetivosApi from '../api/objetivosApi';
import { esRocaMaestraFija } from '../utils/objetivoFijo';
import type { DefinicionRocaMaestra, EjeObjetivo, RocaMaestraApi } from '../types/objetivos.types';
import type { ObjetivoParaConfirmar } from '../utils/objetivosPorConfirmar';

/** Lo que devuelve `confirmar`: todo confirmado, o en qué eje falló (y cuáles ya se habían confirmado antes). */
export type ResultadoDeConfirmar =
  | { ok: true; confirmados: EjeObjetivo[] }
  | { ok: false; confirmados: EjeObjetivo[]; falloEn: EjeObjetivo; mensaje: string };

/**
 * El objetivo de 90 días del aprendiz, traído del backend. Se define una vez y queda fijo (D-234); después solo
 * se anota el avance.
 *
 * **Por qué esto existe.** Hasta ahora la pantalla de Objetivos del Plan mostraba un objetivo
 * escrito a mano en el código ("Facturar $30.000 USD", "Corporación Delta"), igual para todos los
 * aprendices, y el botón Editar cambiaba un estado de React que se perdía al recargar. Esto lo
 * reemplaza por el dato real de cada persona.
 *
 * **Sobre los errores:** un fallo al cargar NO vacía lo que ya se había traído. Si la persona está
 * mirando su objetivo y el refresco falla por red, es mejor que siga viendo el dato viejo con un
 * aviso que una pantalla en blanco.
 */
export function useRocasMaestras() {
  const [rocas, setRocas] = useState<RocaMaestraApi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setRocas(await objetivosApi.obtenerRocasMaestras());
    } catch (e) {
      setError(mensajeDeObjetivos(e, 'No pudimos cargar tu objetivo de 90 días.'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * Define el objetivo de un eje la primera vez, o anota su avance si ya estaba. Devuelve `ok`.
   *
   * Una vez definido, el objetivo queda fijo (D-234): cambiarlo responde `409 ROCA_MAESTRA_FIJA`.
   * Ese rechazo trae un mensaje pensado para la persona, que se muestra tal cual, y se recarga la
   * lista para que la pantalla vuelva a lo que de verdad está guardado.
   *
   * > **Corregido 2026-09-30.** Decía «Define o corrige el objetivo de un eje»: ya no se corrige.
   *
   * > **Corregido 2026-10-31 (spec 026).** Ya no hay Mapa de Renacimiento: el servidor dejó de responder
   * > `MAPA_PENDIENTE` y no exige nada previo para escribir el objetivo (se quitó `mapaPendiente` del resultado).
   *
   * La respuesta del servidor reemplaza a la roca de ese eje en memoria, en vez de recargar la
   * lista entera: el backend devuelve la roca ya guardada, con su porcentaje recalculado, así que
   * pedirla de nuevo sería un viaje de más para el mismo dato.
   */
  const definir = useCallback(async (eje: EjeObjetivo, definicion: DefinicionRocaMaestra) => {
    setGuardando(true);
    try {
      const guardada = await objetivosApi.definirRocaMaestra(eje, definicion);
      setRocas(previas => {
        const sinEseEje = previas.filter(r => r.eje !== eje);
        return [...sinEseEje, guardada];
      });
      return { ok: true as const };
    } catch (e) {
      if (esRocaMaestraFija(e)) void cargar();
      return {
        ok: false as const,
        mensaje: mensajeDeObjetivos(e, 'No pudimos guardar tu objetivo.'),
      };
    } finally {
      setGuardando(false);
    }
  }, [cargar]);

  /**
   * Confirma los objetivos que nacieron del diagnóstico (spec 026): un `PUT /rocks/master/{eje}` por eje, **en serie**, solo
   * con el texto (sin meta: el servidor lo marca confirmado). Se detiene en el primer fallo y dice en qué eje fue; los que ya
   * se confirmaron quedan confirmados (cada respuesta reemplaza a su roca en memoria) y no se repiten.
   */
  const confirmar = useCallback(async (items: readonly ObjetivoParaConfirmar[]): Promise<ResultadoDeConfirmar> => {
    setGuardando(true);
    const confirmados: EjeObjetivo[] = [];
    try {
      for (const item of items) {
        try {
          const guardada = await objetivosApi.definirRocaMaestra(item.eje, { objetivo: item.objetivo });
          setRocas(previas => [...previas.filter(r => r.eje !== item.eje), guardada]);
          confirmados.push(item.eje);
        } catch (e) {
          // Si otro teléfono ya lo confirmó con otro texto, lo guardado manda: se vuelve a leer.
          if (esRocaMaestraFija(e)) void cargar();
          return {
            ok: false,
            confirmados,
            falloEn: item.eje,
            mensaje: mensajeDeObjetivos(e, 'No pudimos confirmar tu objetivo.'),
          };
        }
      }
      return { ok: true, confirmados };
    } finally {
      setGuardando(false);
    }
  }, [cargar]);

  const deEje = useCallback(
    (eje: EjeObjetivo) => rocas.find(r => r.eje === eje) ?? null,
    [rocas]
  );

  return { rocas, deEje, cargando, error, guardando, definir, confirmar, recargar: cargar };
}
