import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { DIAS_DEL_PLAN, diasDelMesDeLaSemana, esPlanificable, type DiaDelPlan } from '../utils/semanaDelPlan';

/**
 * La fila de los siete días de la semana, tocables, con su fecha y la hora que rige cada uno.
 *
 * ── De dónde sale ──
 *
 * Estaba escrita dentro de `PlanificarDimensionModal`, el planificador de hábitos de Training. El
 * dueño pidió la misma interfaz para agendar las acciones del día — *"es la misma interfaz bro"*,
 * *"en la programación la parte más fácil es reutilizar, ¿no crees?"*— así que se sacó a un
 * componente en vez de copiarla. **Su comportamiento en Training no cambia en nada**: lo que antes
 * era estado local ahora entra por props, y se dibuja igual.
 *
 * ── El candado ──
 *
 * `esPlanificable` lo resuelve solo, y **no es una decisión de esta fila**: es D-91/D-98, la regla
 * del backend de que el día en curso no se reacomoda (`PreferenciaHorarioService` arranca a contar
 * en `hoy.plusDays(1)`). Quien use este componente hereda esa regla, que es justo lo que se quiere:
 * dos pantallas que dibujan los mismos días no pueden discrepar sobre cuáles se pueden tocar.
 *
 * Se muestra un candado y no un día atenuado a secas: atenuar dice "algo pasa acá", el candado dice
 * qué pasa.
 */

/**
 * El aviso propio de un día (spec 008): lo que lee el lector de pantalla y si el día va sin aviso. Lo calcula quien usa
 * la fila (`resumenDelAvisoDelDia`, del editor de Planificar); la fila solo lo dibuja. El chip no escribe los minutos
 * (spec 011): dibuja la campana, o la campana tachada con `sinAviso`.
 */
export interface AvisoDeUnDiaEnLaFila {
  /** «Aviso 30 minutos antes»: lo que dice el lector de pantalla. */
  largo: string;
  sinAviso: boolean;
}

/**
 * «Cómo suena» propio de un día (spec 009): lo que dice el lector de pantalla. En el chip solo va un reloj de alarma
 * chico, sin texto: «sin texto largo», como la campana del aviso (008).
 */
export interface AlarmaDeUnDiaEnLaFila {
  /** «Alarma propia: sin sonido, vibra»: lo que dice el lector de pantalla. */
  largo: string;
}

/** Cómo se llama cada día para el lector de pantalla (la pastilla dibuja solo su inicial). */
const NOMBRE_COMPLETO_DEL_DIA: Record<DiaDelPlan, string> = {
  LUN: 'Lunes', MAR: 'Martes', 'MIÉ': 'Miércoles', JUE: 'Jueves', VIE: 'Viernes', 'SÁB': 'Sábado', DOM: 'Domingo',
};

/** Lo que rige un día concreto. `undefined` = ese día usa el horario general. */
export interface HoraDelDia {
  /** `HH:mm` que rige ese día. */
  hora?: string;
  /** `true` si esa hora es propia de ese día y no la general: se pinta en negrita. */
  propio?: boolean;
  /** `false` = ese día está apagado a propósito. Se lee "no va". */
  activo?: boolean;
}

interface FilaDeDiasDelPlanProps {
  /**
   * En qué días corre lo que se está planificando. Un día en que no corre no se puede tocar: la
   * hora de un día que no existe no significa nada.
   */
  corre: Record<DiaDelPlan, boolean>;
  /** Lo que rige cada día, para pintarlo en la pastilla. */
  horarios?: Partial<Record<DiaDelPlan, HoraDelDia>>;
  /** Los días que se están editando ahora. Vacío = se edita el horario general. */
  enEdicion: DiaDelPlan[];
  /**
   * Qué días se pueden tocar. Por defecto `esPlanificable`, la regla de los **hábitos** (D-91: de
   * mañana en adelante).
   *
   * Existe porque las acciones del día tienen **su propia regla** y no la misma: se pueden agendar
   * HOY mientras la ventana nocturna no haya abierto, y el servidor las acepta. Reusar la fila con
   * el candado de hábitos les taparía un día que sí funciona.
   *
   * Lo que se comparte es cómo se ve y cómo se toca; la regla la trae cada pantalla, que es la que
   * sabe contra qué endpoint va.
   */
  planificable?: (dia: DiaDelPlan) => boolean;
  /**
   * Spec 008, **opcional**: el aviso propio de cada día. Si devuelve algo, el chip lo dibuja debajo de la hora
   * (solo el ícono: la campana, o la campana tachada si el día va sin aviso; los minutos no se escriben, spec 011) y
   * toda la fila pasa a anunciarse completa al lector de pantalla. Sin esta prop —Plan no la pasa— la fila es
   * exactamente la de siempre.
   */
  avisoDelDia?: (dia: DiaDelPlan) => AvisoDeUnDiaEnLaFila | null;
  /**
   * Spec 009, **opcional**: «cómo suena» propio de cada día. Si devuelve algo, el chip dibuja un reloj de alarma de 16
   * (el aviso propio lleva su campana) y la etiqueta del lector lo suma. Plan no la pasa y no cambia.
   */
  alarmaDelDia?: (dia: DiaDelPlan) => AlarmaDeUnDiaEnLaFila | null;
  /**
   * Mi Radar (spec 019), **opcional**: lo que oye el lector de pantalla de cada pastilla, completo («Sábado 31, 15 veces»).
   * Recibe el día y su nombre con la fecha («Sábado 31»). Sin esta prop —Training y Plan no la pasan— la fila es exactamente
   * la de siempre.
   */
  etiquetaPropiaDelDia?: (dia: DiaDelPlan, nombreYFecha: string) => string;
  onAlternarDia: (dia: DiaDelPlan) => void;
}

/**
 * Cuánto puede crecer la letra del sistema dentro de un chip del editor (E-643). Un chip mide ~40 px de ancho: sin tope,
 * con la letra grande (1,3) el día, su número, la hora y los avisos lo estiraban y lo cortaban. Con 1,15 sigue siendo más
 * grande que lo normal y cabe; el detalle completo está en la etiqueta que oye el lector de pantalla.
 */
const MAXIMO_DE_LETRA_EN_EL_CHIP = 1.15;

export function FilaDeDiasDelPlan({
  corre,
  horarios,
  enEdicion,
  planificable = esPlanificable,
  avisoDelDia,
  alarmaDelDia,
  etiquetaPropiaDelDia,
  onAlternarDia,
}: FilaDeDiasDelPlanProps) {
  const { c, t } = useTheme();
  const diasDelMes = diasDelMesDeLaSemana();
  /**
   * E-643: con el aviso o la alarma propios por día (el editor de Planificar), cada chip reserva SIEMPRE el mismo
   * bloque de abajo, tenga o no campana y reloj: los siete miden lo mismo y la letra, el número y la hora quedan
   * alineados. Antes el chip crecía con lo que llevara (la campana, los minutos en dos o tres renglones, el reloj) y un
   * día con varios avisos «se deformaba» respecto de los demás. Desde la spec 011 el bloque es solo la fila de íconos
   * (los minutos ya no se escriben), así que el chip es más bajo. Sin esas props (Plan) la fila es la de siempre.
   */
  const conBanda = Boolean(avisoDelDia || alarmaDelDia);
  const acotado = conBanda ? ({ maxFontSizeMultiplier: MAXIMO_DE_LETRA_EN_EL_CHIP } as const) : {};

  return (
    <View style={estilos.fila}>
      {DIAS_DEL_PLAN.map(dia => {
        const corriendo = corre[dia];
        const editando = enEdicion.includes(dia);
        const delDia = horarios?.[dia];
        // Por defecto D-98/D-91: el día en curso y los ya pasados no se planifican, porque el
        // servidor empieza a contar en `hoy.plusDays(1)` y dejarlo tocable sería ofrecer algo que
        // no va a hacer. Las acciones del día traen la suya — ver la prop.
        const sePuede = planificable(dia);
        const bloqueado = !corriendo || !sePuede;
        const aviso = avisoDelDia && corriendo && sePuede ? avisoDelDia(dia) : null;
        const alarma = alarmaDelDia && corriendo && sePuede ? alarmaDelDia(dia) : null;
        const colorDelAviso = editando ? c.onGold : c.goldInk;
        const conAmbos = aviso !== null && alarma !== null;
        const etiquetaDelDiaPropia = etiquetaPropiaDelDia
          ? etiquetaPropiaDelDia(dia, `${NOMBRE_COMPLETO_DEL_DIA[dia]} ${diasDelMes[dia]}`)
          : null;

        // La hora que rige ese día, o el candado si ya no se puede cambiar.
        const horaOCandado = (
          <>
            {corriendo && !sePuede && <Icon name="lock" size={11} color={c.tabInactive} />}
            {corriendo && sePuede && (
              <Text
                {...acotado}
                style={[
                  t.micro,
                  {
                    fontSize: 10.5,
                    color: editando
                      ? c.onGold
                      : delDia?.activo === false
                        ? c.danger
                        : delDia?.propio
                          ? c.goldInk
                          : c.textSoft,
                    fontFamily: delDia?.propio ? 'Jost_700Bold' : 'Jost_400Regular',
                  },
                ]}
                numberOfLines={1}
              >
                {delDia?.activo === false ? 'no va' : (delDia?.hora ?? '·')}
              </Text>
            )}
          </>
        );

        return (
          <Pressable
            key={dia}
            onPress={() => !bloqueado && onAlternarDia(dia)}
            disabled={bloqueado}
            {...(conBanda
              ? {
                accessibilityRole: 'button' as const,
                accessibilityLabel: etiquetaDelDia(dia, diasDelMes[dia], delDia, corriendo, sePuede, aviso, alarma),
                accessibilityState: { selected: editando, disabled: bloqueado },
              }
              : etiquetaDelDiaPropia
                ? {
                  accessibilityRole: 'button' as const,
                  accessibilityLabel: etiquetaDelDiaPropia,
                  accessibilityState: { selected: editando, disabled: bloqueado },
                }
                : {})}
            style={[
              estilos.pastilla,
              conBanda && estilos.pastillaConBanda,
              {
                borderColor: editando ? c.gold : c.border,
                backgroundColor: editando ? c.gold : 'transparent',
                opacity: bloqueado ? 0.35 : 1,
              },
            ]}
          >
            <Text
              {...acotado}
              style={[t.micro, { fontSize: 12, fontFamily: 'Jost_700Bold', color: editando ? c.onGold : c.textSoft }]}
            >
              {dia.charAt(0)}
            </Text>
            {/* El día del mes: convierte "el martes" en "el martes 09". */}
            <Text
              {...acotado}
              style={[t.micro, { fontSize: 11, fontFamily: 'Jost_700Bold', color: editando ? c.onGold : c.textSoft }]}
            >
              {diasDelMes[dia]}
            </Text>
            {conBanda ? <View style={estilos.filaDeLaHora}>{horaOCandado}</View> : horaOCandado}
            {/* El bloque de abajo (spec 008 y 009, E-643, 011): UNA fila de íconos —la campana del aviso propio, o la
                tachada si el día va sin aviso, y el reloj de la alarma propia; los dos de 14 si conviven, uno solo de
                16—. Sin texto: los minutos no se escriben en el chip (spec 011); la lista completa de avisos la oye el
                lector de pantalla en la etiqueta de la pastilla, no acá. Con alto contraste (dorado oscuro, o el color
                sobre dorado al editar): es poco lugar, pero nunca gris tenue. */}
            {conBanda && (
              <View style={estilos.banda} accessible={false} importantForAccessibility="no-hide-descendants">
                {(aviso || alarma) && (
                  <View style={estilos.iconos}>
                    {aviso && <Icon name={aviso.sinAviso ? 'bellOff' : 'bell'} size={conAmbos ? 14 : 16} color={colorDelAviso} />}
                    {alarma && <Icon name="alarmClock" size={conAmbos ? 14 : 16} color={colorDelAviso} />}
                  </View>
                )}
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** «Sábado 24, 09:00, aviso 30 minutos antes»: la pastilla completa para el lector de pantalla. */
function etiquetaDelDia(
  dia: DiaDelPlan,
  diaDelMes: string,
  delDia: HoraDelDia | undefined,
  corriendo: boolean,
  sePuede: boolean,
  aviso: AvisoDeUnDiaEnLaFila | null,
  alarma: AlarmaDeUnDiaEnLaFila | null = null,
): string {
  const partes = [`${NOMBRE_COMPLETO_DEL_DIA[dia]} ${diaDelMes}`];
  if (!corriendo) partes.push('el hábito no corre ese día');
  else if (!sePuede) partes.push('ya no se puede cambiar');
  else if (delDia?.activo === false) partes.push('no va');
  else if (delDia?.hora) partes.push(delDia.hora);
  if (aviso) partes.push(aviso.largo.charAt(0).toLowerCase() + aviso.largo.slice(1));
  if (alarma) partes.push(alarma.largo.charAt(0).toLowerCase() + alarma.largo.slice(1));
  return partes.join(', ');
}

/**
 * Copiadas tal cual de `PlanificarDimensionModal` para que la fila se vea idéntica: mismo `gap`,
 * mismo `borderWidth: 1.2` y el mismo `minHeight: 58`, que su comentario original explicaba así —
 * *"alto para TRES renglones: la letra del día, su número del mes y la hora que rige ese día. Subió
 * de 48 a 58 al agregarse el número: con 48 los tres se apretaban y el de la hora quedaba recortado
 * en pantallas compactas"*.
 */
const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 6, marginTop: 6 },
  pastilla: {
    flex: 1,
    minHeight: 58,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // E-643: con el aviso y la alarma por día todos los chips son iguales: los datos de arriba pegados arriba y siempre
  // el mismo bloque de abajo, vacío o no (antes se centraban, y un chip con campana desalineaba a los demás). Spec 011:
  // sin el texto de los minutos el bloque es solo la fila de íconos (16), y el chip baja de 88 a 76.
  pastillaConBanda: { minHeight: 76, paddingTop: 6, paddingBottom: 4, justifyContent: 'flex-start' },
  filaDeLaHora: { height: 14, alignItems: 'center', justifyContent: 'center' },
  banda: { alignSelf: 'stretch', minHeight: 16, alignItems: 'center', justifyContent: 'flex-start', marginTop: 4 },
  iconos: { height: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
});
