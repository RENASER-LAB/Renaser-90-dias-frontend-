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
 * El aviso propio de un día (spec 008): lo que dice el chip bajo la hora y lo que lee el lector de pantalla. Lo
 * calcula quien usa la fila (`resumenDelAvisoDelDia`, del editor de Planificar); la fila solo lo dibuja.
 */
export interface AvisoDeUnDiaEnLaFila {
  /** «30′», «a la hora», «30′ +1». Con `sinAviso`, no se escribe: va la campana tachada. */
  corto: string;
  /** «Aviso 30 minutos antes»: lo que dice el lector de pantalla. */
  largo: string;
  sinAviso: boolean;
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
   * (campana de línea de 16 con el texto, o la campana tachada si el día va sin aviso) y toda la fila pasa a
   * anunciarse completa al lector de pantalla. Sin esta prop —Plan no la pasa— la fila es exactamente la de
   * siempre.
   */
  avisoDelDia?: (dia: DiaDelPlan) => AvisoDeUnDiaEnLaFila | null;
  onAlternarDia: (dia: DiaDelPlan) => void;
}

export function FilaDeDiasDelPlan({
  corre,
  horarios,
  enEdicion,
  planificable = esPlanificable,
  avisoDelDia,
  onAlternarDia,
}: FilaDeDiasDelPlanProps) {
  const { c, t } = useTheme();
  const diasDelMes = diasDelMesDeLaSemana();

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
        const colorDelAviso = editando ? c.onGold : c.goldInk;
        return (
          <Pressable
            key={dia}
            onPress={() => !bloqueado && onAlternarDia(dia)}
            disabled={bloqueado}
            {...(avisoDelDia
              ? {
                accessibilityRole: 'button' as const,
                accessibilityLabel: etiquetaDelDia(dia, diasDelMes[dia], delDia, corriendo, sePuede, aviso),
                accessibilityState: { selected: editando, disabled: bloqueado },
              }
              : {})}
            style={[
              estilos.pastilla,
              {
                borderColor: editando ? c.gold : c.border,
                backgroundColor: editando ? c.gold : 'transparent',
                opacity: bloqueado ? 0.35 : 1,
              },
            ]}
          >
            <Text
              style={[t.micro, { fontSize: 12, fontFamily: 'Jost_700Bold', color: editando ? c.onGold : c.textSoft }]}
            >
              {dia.charAt(0)}
            </Text>
            {/* El día del mes: convierte "el martes" en "el martes 09". */}
            <Text
              style={[t.micro, { fontSize: 11, fontFamily: 'Jost_700Bold', color: editando ? c.onGold : c.textSoft }]}
            >
              {diasDelMes[dia]}
            </Text>
            {corriendo && !sePuede && <Icon name="lock" size={11} color={c.tabInactive} />}
            {corriendo && sePuede && (
              <Text
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
            {/* El aviso propio del día (spec 008): la campana de línea de 16 y, debajo, los minutos. Con alto
                contraste (dorado oscuro, o el color sobre dorado cuando se está editando) y a 13: es poco lugar,
                pero nunca gris tenue. El lector de pantalla lo oye en la etiqueta de la pastilla, no acá. */}
            {aviso && (
              <View style={estilos.aviso} accessible={false} importantForAccessibility="no-hide-descendants">
                <Icon name={aviso.sinAviso ? 'bellOff' : 'bell'} size={16} color={colorDelAviso} />
                {!aviso.sinAviso && (
                  <Text
                    style={[t.micro, estilos.textoDelAviso, { color: colorDelAviso }]}
                    numberOfLines={2}
                  >
                    {aviso.corto}
                  </Text>
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
): string {
  const partes = [`${NOMBRE_COMPLETO_DEL_DIA[dia]} ${diaDelMes}`];
  if (!corriendo) partes.push('el hábito no corre ese día');
  else if (!sePuede) partes.push('ya no se puede cambiar');
  else if (delDia?.activo === false) partes.push('no va');
  else if (delDia?.hora) partes.push(delDia.hora);
  if (aviso) partes.push(aviso.largo.charAt(0).toLowerCase() + aviso.largo.slice(1));
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
  // Spec 008: la campana sobre sus minutos, centrados. Los minutos pueden pasar a dos renglones («a la» / «hora»)
  // en una pastilla de ~40 px: las pastillas de la fila se estiran todas al alto de la más alta.
  aviso: { alignItems: 'center', marginTop: 2 },
  textoDelAviso: { fontSize: 13, lineHeight: 15, fontFamily: 'Jost_700Bold', textAlign: 'center', letterSpacing: 0 },
});
