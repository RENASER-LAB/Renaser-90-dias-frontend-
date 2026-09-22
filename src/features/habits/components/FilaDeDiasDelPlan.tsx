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
  onAlternarDia: (dia: DiaDelPlan) => void;
}

export function FilaDeDiasDelPlan({
  corre,
  horarios,
  enEdicion,
  planificable = esPlanificable,
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
        return (
          <Pressable
            key={dia}
            onPress={() => !bloqueado && onAlternarDia(dia)}
            disabled={bloqueado}
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
          </Pressable>
        );
      })}
    </View>
  );
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
});
