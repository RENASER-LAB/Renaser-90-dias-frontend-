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

/**
 * `true` si `yyyyMmDd` todavia no llegó, en el día civil del dispositivo. Se comparan cadenas
 * `YYYY-MM-DD` en vez de objetos `Date` por la misma razón que documenta `formatearFechaLarga`:
 * `new Date('2026-09-05')` se interpreta como UTC y en Lima devolvería el día anterior. El
 * formato ISO ordena lexicográficamente igual que cronológicamente, así que `>` alcanza.
 */
/**
 * D-103: `true` si el programa empieza DESPUES de manana. Con la regla "hoy se organiza manana"
 * (D-91/D-98), quien eligio empezar manana tiene que poder armar su plan hoy: para esa persona el
 * programa ya esta "en curso" a efectos de planificar, aunque el contador diga dia 0. Solo se
 * bloquea a quien empieza pasado manana o mas tarde — y a esa persona se le dice desde que dia
 * va a poder organizar (el anterior al inicio), no "ese dia".
 */
function empiezaDespuesDeManana(yyyyMmDd: string): boolean {
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  return yyyyMmDd > fechaCivil(manana);
}

/** Fecha civil del dispositivo como `YYYY-MM-DD`, sin pasar por UTC (ver `formatearFechaLarga`). */
function fechaCivil(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(
    fecha.getDate(),
  ).padStart(2, '0')}`;
}

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
      // D-90: se compara la fecha contra HOY. Antes bastaba con que existiera `startDate` para
      // declarar ESPERANDO_INICIO, y una fecha de inicio YA PASADA dejaba la pantalla anunciando
      // "empezás el jueves 3 de septiembre" el viernes 4 — con las 7 pildoras de dia apagadas y
      // la lista de habitos en `display: none`. Ese era el reclamo de "estando en el dia no
      // puedo editar mis habitos": no habia nada que tocar. Una fecha de arranque en el pasado
      // no puede significar "todavia no arranco", diga lo que diga el contador de dias.
      if (estado.activated && estado.startDate && empiezaDespuesDeManana(estado.startDate)) {
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

/** `2026-09-08` → `2026-09-07`: el dia desde el que se puede organizar un programa que empieza esa fecha. */
export function diaAnterior(yyyyMmDd: string): string {
  const [anio, mes, dia] = yyyyMmDd.split('-').map(Number);
  if (!anio || !mes || !dia) return yyyyMmDd;
  const d = new Date(anio, mes - 1, dia);
  d.setDate(d.getDate() - 1);
  return fechaCivil(d);
}
