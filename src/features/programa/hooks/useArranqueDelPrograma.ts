import { useCallback, useEffect, useState } from 'react';

import * as onboardingApi from '../../onboarding/api/onboardingApi';

/**
 * Por qué el aprendiz todavía no puede planificar (D-84).
 *
 * `diaPrograma === 0` esconde DOS situaciones que en pantalla se veían idénticas — un plan
 * vacío, sin una palabra — y que para el aprendiz son muy distintas:
 *
 *  - `PENDIENTE_ELEGIR`: nunca eligió su Día 1. Hay algo que hacer, y la app tiene que
 *    llevarlo ahí.
 *  - `ESPERANDO_INICIO`: ya eligió, la fecha todavía no llegó. No hay nada que hacer más que
 *    esperar, y saber la fecha exacta es justamente lo que calma.
 *
 * Se resuelve con `GET /api/v1/onboarding/activate-program`, que ya existía; lo único nuevo
 * es que ahora devuelve `startDate` cuando ya eligió.
 *
 * Se consulta SOLO cuando hace falta (`habilitado`): quien ya está en el día 5 de su programa
 * no tiene por qué pagar una llamada de red para dibujar una pantalla que no va a mostrar.
 */

export type ArranquePrograma =
  | { estado: 'CARGANDO' }
  | { estado: 'EN_CURSO' }
  | { estado: 'PENDIENTE_ELEGIR' }
  | { estado: 'ESPERANDO_INICIO'; fechaInicio: string };

export function useArranqueDelPrograma(habilitado: boolean): ArranquePrograma {
  const [arranque, setArranque] = useState<ArranquePrograma>({ estado: 'CARGANDO' });

  const consultar = useCallback(async () => {
    if (!habilitado) {
      setArranque({ estado: 'EN_CURSO' });
      return;
    }
    setArranque({ estado: 'CARGANDO' });
    try {
      const estado = await onboardingApi.consultarActivacionPrograma();
      if (estado.activated && estado.startDate) {
        setArranque({ estado: 'ESPERANDO_INICIO', fechaInicio: estado.startDate });
      } else if (estado.activated) {
        // Activado pero sin fecha: backend viejo, o staff con seguimiento personal. No hay
        // nada que explicarle al aprendiz, así que no se lo bloquea.
        setArranque({ estado: 'EN_CURSO' });
      } else {
        setArranque({ estado: 'PENDIENTE_ELEGIR' });
      }
    } catch {
      // Un aviso es decoración y no puede costarle nada a la pantalla que lo muestra: si la
      // consulta falla, Plan se dibuja como siempre en vez de quedar bloqueado por un error
      // de red. Nunca bloquear por no saber.
      setArranque({ estado: 'EN_CURSO' });
    }
  }, [habilitado]);

  useEffect(() => {
    consultar();
  }, [consultar]);

  return arranque;
}

/** `2026-09-05` → `sábado 5 de septiembre`. Sin `Date` para no arrastrar la zona del
 * dispositivo: la fecha ya viene resuelta en la zona del aprendiz por el backend, y
 * `new Date('2026-09-05')` la interpretaría como UTC y podría mostrar el día anterior. */
export function formatearFechaLarga(yyyyMmDd: string): string {
  const [anio, mes, dia] = yyyyMmDd.split('-').map(Number);
  if (!anio || !mes || !dia) return yyyyMmDd;
  const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  // Zeller, para no construir un Date: el día de la semana de una fecha civil es aritmética pura.
  const m = mes < 3 ? mes + 12 : mes;
  const a = mes < 3 ? anio - 1 : anio;
  const k = a % 100;
  const j = Math.floor(a / 100);
  const h = (dia + Math.floor((13 * (m + 1)) / 5) + k + Math.floor(k / 4) + Math.floor(j / 4) + 5 * j) % 7;
  const diaSemana = DIAS[(h + 6) % 7];
  return `${diaSemana} ${dia} de ${MESES[mes - 1]}`;
}
