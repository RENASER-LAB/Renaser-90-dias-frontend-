import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../context/AuthContext';
import { useMinutoActual } from '../../hooks/useMinutoActual';
import { useMapaRenacimientoAbierto } from '../mapa-renacimiento/MapaRenacimientoContext';
import { obtenerResumenHome } from '../home/api/homeApi';
import { useArranqueGuiado } from '../sparkie/hooks/useArranqueGuiado';
import { CONFIG_RADAR, rolObligadoAlRadar } from './config/configRadar';
import { sincronizarRecordatoriosDeRadar } from './notificaciones/recordatoriosDeRadar';
import { useRadarDelDia } from './hooks/useRadarDelDia';
import type { CheckInRadarApi } from './types/radar.types';
import type { EstadoRadar, SlotRadar } from './utils/slotsDelRadar';

/**
 * El Código Renaser, compartido por toda la app.
 *
 * ## Por qué un contexto y no un hook en `HoyScreen` (2026-09-11)
 *
 * Porque el formulario tiene que poder ser **innegociable**, y algo montado dentro de Hoy no lo
 * es: basta tocar otra pestaña para dejarlo atrás. El pedido fue explícito — *"el formulario
 * ocupará toda la pantalla, ni retrocediendo"*. Eso obliga a que viva por encima del navegador,
 * como ya viven RENASIA y el arranque guiado (`App.tsx`).
 *
 * Pero la tarjeta de Hoy sigue existiendo, y las dos piezas tienen que ver el MISMO estado: si
 * cada una llamara al hook por su cuenta habría dos lecturas de `/radar/latest`, dos relojes y
 * dos verdades sobre si el slot de esta hora ya está respondido. El contexto es lo que impide
 * ese desdoble.
 *
 * ## Quién queda obligado
 *
 * Nadie está excluido: el formulario aparece para todas las cuentas con el programa corriendo en
 * sus días 1 a 7. Lo único que cambia según el rol es la salida —`rolesObligados` en la config—,
 * y eso se decide acá, no en la pantalla.
 *
 * ## El día de programa
 *
 * Sale de `GET /api/v1/home`, la misma fuente que usa Hoy. Se pide al entrar y cuando cambia la
 * FECHA local, no cada minuto: el día de programa avanza una vez al día. Sin sesión —o con el
 * onboarding sin terminar— no se pide nada: el radar no existe en el login ni durante el alta.
 */
interface ValorRadar {
  estado: EstadoRadar;
  /** Minutos que faltan para que el formulario tome la pantalla solo. 0 = ya. */
  minutosParaAbrir: number;
  /** El slot que hay que responder, o `null` si no hay ninguno abierto. */
  slot: SlotRadar | null;
  /** `true` = este rol no puede cerrar el formulario. */
  obligatorio: boolean;
  /** `true` = el formulario está en pantalla. */
  abierto: boolean;
  abrir: () => void;
  cerrar: () => void;
  enviando: boolean;
  error: string | null;
  enviar: (checkIn: CheckInRadarApi) => Promise<boolean>;
  limpiarError: () => void;
}

const SIN_RADAR: ValorRadar = {
  estado: { tipo: 'apagado', motivo: 'desactivado' },
  minutosParaAbrir: 0,
  slot: null,
  obligatorio: false,
  abierto: false,
  abrir: () => {},
  cerrar: () => {},
  enviando: false,
  error: null,
  enviar: async () => false,
  limpiarError: () => {},
};

const RadarContext = createContext<ValorRadar>(SIN_RADAR);

export function useRadar(): ValorRadar {
  return useContext(RadarContext);
}

export function RadarProvider({ children }: { children: React.ReactNode }) {
  const { user, isOnboardingCompleted, onboardingResuelto } = useAuth();
  const ahora = useMinutoActual();
  const [diaPrograma, setDiaPrograma] = useState<number | null>(null);
  const [cerradoEnSlot, setCerradoEnSlot] = useState<number | null>(null);
  const [abiertoAMano, setAbiertoAMano] = useState(false);

  /* Durante el onboarding NO hay Código Renaser, y esto no es un detalle de diseño: se vio en la
     prueba del 2026-09-11 contra el backend local. Una cuenta de aprendiz en su día 3 que todavía
     no había completado la Ficha se encontró el formulario innegociable ENCIMA del onboarding
     —sin X y sin retroceso—, o sea imposible de terminar de darse de alta.

     `onboardingResuelto` además de `isOnboardingCompleted` por la misma razón que lo exige
     `RootNavigator`: mientras la respuesta no esté confirmada, `isOnboardingCompleted` arrastra su
     valor por defecto (false), y tratar "todavía no sé" como "ya está" abriría el formulario un
     frame antes de tiempo. */
  const haySesion = Boolean(user?.id) && onboardingResuelto && isOnboardingCompleted;
  const fechaLocal = ahora.toDateString();

  useEffect(() => {
    if (!haySesion) {
      setDiaPrograma(null);
      return;
    }
    let vigente = true;
    obtenerResumenHome()
      .then(resumen => {
        // `inscrito` además del día: un día > 0 sin inscripción no debería existir, pero si el
        // backend lo devolviera no es motivo para trabar a nadie con un formulario obligatorio.
        if (vigente) setDiaPrograma(resumen.inscrito ? resumen.diaPrograma : 0);
      })
      .catch((e: unknown) => {
        // Sin día de programa no se muestra nada. Un fallo de red no puede INVENTAR un radar
        // obligatorio, que es el peor error posible acá.
        console.warn('[Radar] no se pudo leer el día de programa:', e);
        if (vigente) setDiaPrograma(null);
      });
    return () => {
      vigente = false;
    };
  }, [haySesion, fechaLocal]);

  /* El arranque guiado (SER: saludo -> primer post -> Pacto) manda mientras esté en curso.

     Se vio en la prueba del 2026-09-11: con el onboarding recién cerrado, la tarjeta de SER y el
     formulario innegociable del radar salieron a la vez, una encima de la otra. Dos flujos que se
     creen dueños de la pantalla no es un problema de z-index, es de orden: primero se termina de
     entrar, después empieza a pedirse el registro por hora.

     Se reutiliza `useArranqueGuiado` en vez de volver a deducir "¿ya terminó de entrar?" con otra
     consulta propia: esa pregunta ya tiene UNA respuesta en esta app y conviene que siga teniendo
     una sola. Para la enorme mayoría —Pacto ya firmado— resuelve `NINGUNO` con una sola llamada y
     sin sondeos; sólo insiste con quien está justo en el medio del arranque, que es exactamente
     a quien no hay que interrumpir. Ante cualquier fallo resuelve NINGUNO, así que un error de
     red no deja el radar apagado para siempre. */
  const { estado: arranque } = useArranqueGuiado(haySesion);
  const arranqueTerminado = arranque.paso === 'NINGUNO';

  /* El Mapa de Renacimiento también toma la pantalla entera, y es una sesión de 15-20 minutos
     que cruza cuatro cambios de hora. Taparlo con el formulario a mitad de camino sería la
     misma colisión que ya se corrigió con el arranque guiado, pero peor: ahí sí se pierde
     trabajo. Mientras el Mapa esté abierto, el radar espera; al cerrarlo, si el slot sigue
     vivo, aparece. */
  const { abierto: mapaAbierto } = useMapaRenacimientoAbierto();

  const puedePedirse = arranqueTerminado && !mapaAbierto;
  const radar = useRadarDelDia(puedePedirse ? diaPrograma : null, user?.id ?? null);

  /* Las doce alarmas diarias. Se sincronizan con el DÍA DE PROGRAMA, no con `puedePedirse`: los
     avisos tienen que seguir puestos aunque en este momento el Mapa esté abierto o el arranque
     guiado sin terminar —esas son razones para no interrumpir AHORA, no para dejar a alguien sin
     recordatorio a las 15:00. Al salir de la ventana (día 8) se cancelan solas. */
  useEffect(() => {
    if (diaPrograma === null) return;
    void sincronizarRecordatoriosDeRadar(diaPrograma);
  }, [diaPrograma]);
  const obligatorio = rolObligadoAlRadar(user?.role);

  const slot = radar.estado.tipo === 'abierto' ? radar.estado.slot : null;
  /* Cuántos minutos lleva abierta la franja. `minutosParaCerrar` va de 60 a 1, así que su
     complemento son los minutos transcurridos desde la hora en punto. */
  const minutosDesdeQueAbrio = radar.estado.tipo === 'abierto' ? 60 - radar.estado.minutosParaCerrar : 0;
  const pasoLaCortesia = minutosDesdeQueAbrio >= CONFIG_RADAR.minutosDeCortesia;
  const horaDelSlot = slot?.hora ?? null;

  /* Cerrarlo vale para ESTE slot y nada más. Al dar la hora siguiente vuelve a ofrecerse, que es
     justo lo que distingue "opcional" de "apagado". */
  const cerrar = useCallback(() => {
    setAbiertoAMano(false);
    setCerradoEnSlot(horaDelSlot);
  }, [horaDelSlot]);

  const abrir = useCallback(() => setAbiertoAMano(true), []);

  const abierto = useMemo(() => {
    if (slot === null) return false;
    // Tocar la tarjeta lo abre YA: quien lo pide no necesita cortesía.
    if (abiertoAMano) return true;
    // Los primeros minutos de la franja son de la persona, no del formulario. Pasados, para el
    // aprendiz el formulario se queda hasta que lo llene; para el resto es una sola oferta.
    if (!pasoLaCortesia) return false;
    if (obligatorio) return true;
    return CONFIG_RADAR.abrirAutomaticamente && cerradoEnSlot !== slot.hora;
  }, [slot, obligatorio, abiertoAMano, cerradoEnSlot, pasoLaCortesia]);

  const valor = useMemo<ValorRadar>(
    () => ({
      estado: radar.estado,
      minutosParaAbrir: Math.max(0, CONFIG_RADAR.minutosDeCortesia - minutosDesdeQueAbrio),
      slot,
      obligatorio,
      abierto,
      abrir,
      cerrar,
      enviando: radar.enviando,
      error: radar.error,
      enviar: radar.enviar,
      limpiarError: radar.limpiarError,
    }),
    [radar.estado, radar.enviando, radar.error, radar.enviar, radar.limpiarError, slot, obligatorio, abierto,
      abrir, cerrar, minutosDesdeQueAbrio],
  );

  return <RadarContext.Provider value={valor}>{children}</RadarContext.Provider>;
}
