import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';

import { Alert } from '../../../components/Alerta';
import { useFuncionalidad } from '../../plataforma/estado/useFuncionalidad';
import { CLAVES } from '../../plataforma/utils/clavesDeLaApp';
import { fechaEnZona, zonaDelTelefono } from '../../eventos/utils/zonaHoraria';
import { useAhora } from '../../eventos/hooks/useAhora';
import type { EjeObjetivo } from '../../objetivos/types/objetivos.types';
import { useCierreDeHoy } from '../hooks/useCierreDeHoy';
import { useCierresAnteriores } from '../hooks/useCierresAnteriores';
import { diasDeLaTarjeta, hayDiasAnteriores } from '../utils/semanaDelCierre';
import { textosDeLaTarjeta } from '../utils/tarjetaDelCierre';
import { CierresAnterioresDeLaSemana } from './CierresAnterioresDeLaSemana';
import { HojaDelCierre, TEXTO_DE_DIA_CERRADO_TARDE } from './HojaDelCierre';
import { TarjetaDelCierreEnPlan } from './TarjetaDelCierreEnPlan';

/**
 * «Cierra tu día» en Plan (spec 033): la tarjeta de hoy, la semana de los días anteriores y la hoja, juntas. Es lo que
 * Training hacía (spec 017) montado donde viven las acciones: la hoja, las lecturas y el guardado son los mismos y el servidor
 * no cambió.
 *
 * - **Está siempre** (decisión 033-3 A): con o sin Mapa de Renacimiento, con o sin acciones agendadas, todos los días y a
 *   cualquier hora. Solo se calla donde ya se callaba la fila de Training: mientras no se sabe (`sin-leer`, nada de
 *   parpadeos), sin la ruta en el servidor (uno anterior a la spec 017), ante un fallo de red (se reintenta al volver al foco)
 *   o con el interruptor `plan` de Soporte TI apagado.
 * - **El día es el de la persona** y la hoja compara, antes de enviar, el día para el que se abrió con el de hoy (spec 002 /
 *   017): si cambia con la hoja abierta, se cierra, se relee y se avisa; nada se envía ni se pasa al día nuevo.
 * - **Los días anteriores se leen al tocarlos**, una vez por fecha y cuenta, y solo se miran (decisión 033-1 A).
 */
export function CierreEnPlan({
  cuentaId,
  diaPrograma,
  habitosHoy,
  ejeDe,
  puedeVerManana,
  onVerManana,
}: {
  cuentaId: string;
  /** El día del programa, o `null` si todavía no se sabe. */
  diaPrograma: number | null;
  /** Los hábitos de hoy según `/home` (la hoja los repite en solo lectura). */
  habitosHoy: { completados: number; total: number } | null;
  ejeDe: (idDeLaAccion: string) => EjeObjetivo | null;
  /** «Ver mañana en Plan» solo se ofrece si Plan muestra acciones (Mapa activo). */
  puedeVerManana: boolean;
  onVerManana: () => void;
}) {
  const plan = useFuncionalidad(CLAVES.plan);
  const prendido = plan.prendida && plan.disponible;
  const enfocada = useIsFocused();
  const zona = useMemo(() => zonaDelTelefono(), []);
  // `useAhora` solo hace volver a dibujar cada 30 s; el día se toma de la hora de CADA dibujo, así que pasada la medianoche el
  // lunes no se arma con el domingo hasta el siguiente refresco.
  useAhora(30_000);
  const hoyIso = fechaEnZona(Date.now(), zona);

  const cierreDeHoy = useCierreDeHoy({ cuentaId, hoyIso, activo: enfocada && prendido });
  const dias = useMemo(() => diasDeLaTarjeta(hoyIso, diaPrograma), [hoyIso, diaPrograma]);
  const { pedir, estadoDe } = useCierresAnteriores({ cuentaId, semana: dias[0].iso });

  const [elegido, setElegido] = useState<string | null>(null);
  const [hojaAbierta, setHojaAbierta] = useState(false);
  /** El día para el que se abrió la hoja: el «ID original» que se compara antes de enviar. */
  const [diaDeLaHoja, setDiaDeLaHoja] = useState(hoyIso);
  /** Lo que se hace cuando la hoja termina de irse: «Ver mañana» no puede mover el scroll con la hoja todavía encima. */
  const despuesDeLaHoja = useRef<(() => void) | null>(null);

  // Pasar la medianoche o cambiar de cuenta: la hoja abierta se cierra (no envía nada) y el día tocado se suelta.
  useEffect(() => {
    setHojaAbierta(false);
    setElegido(null);
    despuesDeLaHoja.current = null;
  }, [hoyIso, cuentaId]);

  const alElegirUnDia = useCallback(
    (iso: string) => {
      setElegido(iso);
      void pedir(iso);
    },
    [pedir],
  );

  const alIrseLaHoja = useCallback(() => {
    const pendiente = despuesDeLaHoja.current;
    despuesDeLaHoja.current = null;
    pendiente?.();
  }, []);

  const lectura = cierreDeHoy.lectura;
  // Sin lectura no hay tarjeta ni hoja: nada de parpadeos y, con un servidor anterior o Soporte TI apagado, nada que ofrecer.
  if (!prendido || lectura.estado !== 'listo') return null;

  return (
    <>
      <TarjetaDelCierreEnPlan
        textos={textosDeLaTarjeta(lectura.vista)}
        onAbrir={() => {
          setDiaDeLaHoja(hoyIso);
          setHojaAbierta(true);
        }}
      >
        {hayDiasAnteriores(dias) ? (
          <CierresAnterioresDeLaSemana
            dias={dias}
            elegido={elegido}
            lectura={elegido ? estadoDe(elegido) : undefined}
            onElegir={alElegirUnDia}
            onReintentar={iso => void pedir(iso, { reintentar: true })}
          />
        ) : null}
      </TarjetaDelCierreEnPlan>

      <HojaDelCierre
        visible={hojaAbierta}
        fecha={diaDeLaHoja}
        hoyIso={hoyIso}
        diaPrograma={diaPrograma}
        habitosHechos={habitosHoy?.completados ?? 0}
        habitosTotal={habitosHoy?.total ?? 0}
        puedeVerManana={puedeVerManana}
        ejeDe={ejeDe}
        onCerrar={() => setHojaAbierta(false)}
        alTerminarDeCerrar={alIrseLaHoja}
        alLeer={cierreDeHoy.reemplazar}
        alGuardar={cierreDeHoy.reemplazar}
        alSalirPorDiaCerrado={() => {
          setHojaAbierta(false);
          void cierreDeHoy.recargar();
          Alert.alert('Ese día ya cerró', TEXTO_DE_DIA_CERRADO_TARDE);
        }}
        onVerManana={() => {
          despuesDeLaHoja.current = onVerManana;
          setHojaAbierta(false);
        }}
      />
    </>
  );
}
