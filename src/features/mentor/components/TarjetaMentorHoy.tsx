import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import type { FalloCelula } from '../hooks/useCelulaQueAcompano';
import type { VistaCelula } from '../hooks/useCelulaQueAcompano';
import { useSemaforoDelGrupo } from '../../semaforo/hooks/useLecturaPorSemana';
import { cuantosNecesitanAyuda } from '../../semaforo/utils/ayudaDelSemaforo';
import { textoDeLaTarjeta } from '../utils/textoDeLaTarjeta';

/**
 * La entrada al grupo desde Hoy, solo para quien acompaña una célula.
 *
 * Va como tarjeta y NO como sexta pestaña: AGENTS.md §1 prohíbe alterar los cinco tabs, y con
 * razón — el mentor sigue siendo un aprendiz, y meterle una pestaña permanente cambiaría la
 * app para él en todas las pantallas, no solo donde acompaña.
 *
 * El padrón NO lo pide: lo recibe. La pantalla del grupo y esta tarjeta se pintan desde la MISMA
 * lectura, hecha una sola vez en Hoy. Lo único que pide por su cuenta es el semáforo del grupo
 * (26/09, S-1), para decir «N necesitan tu ayuda»: es la misma ruta que lee «Mi grupo», así que las
 * dos pantallas dicen lo mismo.
 */
export function TarjetaMentorHoy({
  onAbrir,
  vista,
  cargando,
  fallo,
}: {
  onAbrir: () => void;
  vista: VistaCelula | null;
  cargando: boolean;
  fallo: FalloCelula | null;
}) {
  const { c, t } = useTheme();

  /* Desde el 26/09 (S-1) la tarjeta habla con el SEMÁFORO del grupo: cuántos están en rojo o
     amarillo. Antes contaba "requieren seguimiento" con campos que el servidor nunca mandaba
     (`mentorApi.ts` los ponía en `null`) y terminaba diciendo «sin avance registrado» de todos. */
  const grupoId = vista?.celula.id ?? null;
  const semaforo = useSemaforoDelGrupo(grupoId ? { quien: 'mentor', grupoId } : null);
  const resumen = semaforo.datos?.resumen ?? null;
  const ayuda = cuantosNecesitanAyuda(resumen);
  const total = vista?.todos.length ?? 0;
  const sinDatos = Boolean(fallo) || !vista;

  const detalle = textoDeLaTarjeta({ cargando, fallo, total, resumen });

  return (
    <Pressable
      onPress={onAbrir}
      accessibilityRole="button"
      accessibilityLabel={`Abrir mi grupo. ${detalle}`}
      style={({ pressed }) => [
        estilos.tarjeta,
        {
          /* Solo se resalta en dorado cuando hay alguien que necesita ayuda. Un borde permanente
             compite con la Roca del dia, que es la prioridad del aprendiz. */
          borderColor: !sinDatos && (ayuda ?? 0) > 0 ? c.gold : c.border,
          backgroundColor: pressed ? c.goldWash : c.cardBg,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        {/* Rótulo de la tarjeta, a 14 px (A-1). Tipo oración, en negrita y sin espaciar desde el
            2026-10-05 (pedido del dueño): decía «MI GRUPO» en versales espaciadas. */}
        <Text style={[t.small, { color: c.micro, fontSize: 14 /* metadato */, fontFamily: 'Jost_700Bold' }]}>Mi grupo</Text>
        <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 5 }]} numberOfLines={1}>
          {vista?.celula.nombre ?? 'Acompañamiento'}
        </Text>
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, marginTop: 3, lineHeight: 22 }]}>
          {detalle}
        </Text>
      </View>
      <View style={estilos.derecha}>
        {!sinDatos && ayuda !== null && ayuda > 0 ? (
          <View style={[estilos.contador, { backgroundColor: c.dangerWash }]}>
            <Text style={[t.micro, { color: c.danger, fontFamily: 'Jost_700Bold', fontSize: 16 }]}>
              {ayuda}
            </Text>
          </View>
        ) : (
          <Icon name="users" size={18} color={c.goldInk} />
        )}
        <Icon name="chevron" size={13} color={c.chevron} />
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 16, padding: 16, minHeight: 56,
  },
  derecha: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 0 },
  contador: { minWidth: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
});
