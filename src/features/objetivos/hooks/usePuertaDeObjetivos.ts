import { useCallback, useEffect, useState } from 'react';

import { almacenMapa } from '../../mapa-renacimiento/almacen';
import { consultarMapa } from '../../mapa-renacimiento/api/mapaApi';
import { mapaHabilitado } from '../../mapa-renacimiento/utils/mapaHabilitado';
import { type LecturaDelMapa, type PuertaDeObjetivos, puertaDeObjetivos } from '../utils/puertaDeObjetivos';

/**
 * La puerta de los objetivos de Plan: ¿ya hizo la persona su Mapa de Renacimiento? (issue #37, 2026-10-27)
 *
 * Lee lo mismo que la tarjeta del Mapa en Hoy (`useEstadoMapa`): el borrador del teléfono y, si ahí no está activo, el
 * servidor (`GET /api/v1/mapa-renacimiento`, `stageCompleted`), que solo puede CONFIRMAR que está hecho. Se
 * diferencia en lo que le importa a Plan: Hoy puede dejar la tarjeta «utilizable» con el estado local si la red cae;
 * Plan no, porque de esa lectura depende dejar escribir el objetivo o no. Sin respuesta del servidor y sin «activo» en
 * el teléfono la puerta dice `sin-comprobar` (ni bloquea ni deja pasar: pide reintentar).
 *
 * - **Sin parpadeo**: la primera lectura es `comprobando`; una relectura posterior (al abrir Objetivos, al volver del
 *   Mapa) conserva lo ya confirmado hasta tener la nueva, y un fallo de red no borra un «todavía no hay Mapa» ya
 *   confirmado.
 * - **Sin datos de otra cuenta**: la lectura va marcada con su cuenta; si cambia la sesión, vuelve a `comprobando`
 *   en ese mismo render.
 * - Un build sin el Mapa (`mapaHabilitado()` falso) no pide nada: la puerta es `abierta`.
 *
 * `refresco` es cualquier valor que, al cambiar, vuelve a leer (la vista abierta, si el Mapa estuvo abierto).
 */
export function usePuertaDeObjetivos(
  userId: string | null,
  refresco: unknown = null,
): { puerta: PuertaDeObjetivos; reintentar: () => void } {
  const habilitado = mapaHabilitado();
  const [leida, setLeida] = useState<{ para: string; lectura: LecturaDelMapa } | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!habilitado || !userId) return;
    let vigente = true;
    (async () => {
      const guardado = await almacenMapa.leer(userId);
      if (!vigente) return;
      const estadoLocal = guardado?.estado ?? 'no_iniciado';
      if (estadoLocal === 'activo') {
        setLeida({ para: userId, lectura: { fase: 'confirmada', estado: 'activo' } });
        return;
      }
      try {
        const servidor = await consultarMapa();
        if (!vigente) return;
        setLeida({
          para: userId,
          lectura: { fase: 'confirmada', estado: servidor.stageCompleted ? 'activo' : estadoLocal },
        });
      } catch {
        if (!vigente) return;
        setLeida(previa =>
          previa?.para === userId && previa.lectura.fase === 'confirmada'
            ? previa
            : { para: userId, lectura: { fase: 'sin-confirmar', estado: estadoLocal } },
        );
      }
    })();
    return () => {
      vigente = false;
    };
  }, [habilitado, userId, refresco, intento]);

  const reintentar = useCallback(() => {
    // Quien reintenta ve «Comprobando…», no el error de antes con el botón sin respuesta.
    setLeida(null);
    setIntento(n => n + 1);
  }, []);

  const lectura: LecturaDelMapa = leida && leida.para === userId ? leida.lectura : { fase: 'cargando' };
  return { puerta: puertaDeObjetivos(habilitado, lectura), reintentar };
}
