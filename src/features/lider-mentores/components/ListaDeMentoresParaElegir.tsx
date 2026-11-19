import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import type { IndicadoresApi } from '../api/liderMentoresSchemas';
import { mentorConCupoLleno } from '../utils/gruposDelLider';
import { AnilloDeCupo } from './AnilloDeCupo';

/**
 * Los mentores para elegir uno (spec 056 FR-008, FR-009), cada uno con el anillo de su cupo y su nombre. Quien tiene el cupo lleno se ve apagado, dice
 * «Cupo lleno» y no se puede elegir. Un mentor sin grupo recibe: su cupo en cero no es «lleno». Una sola decisión: el elegido lleva la marca.
 */
export function ListaDeMentoresParaElegir({
  mentores,
  elegidoId,
  onElegir,
  yaEsMentorId,
}: {
  mentores: readonly IndicadoresApi[];
  elegidoId: string | null;
  onElegir: (mentor: IndicadoresApi) => void;
  /** El mentor que ya tiene el grupo, si lo hay: se marca y no se vuelve a elegir. */
  yaEsMentorId?: string | null;
}) {
  const { c, t } = useTheme();
  return (
    <View style={estilos.lista}>
      {mentores.map(m => {
        const lleno = mentorConCupoLleno(m.cupo);
        const actual = yaEsMentorId === m.userId;
        const apagado = lleno || actual || m.accountActive === false;
        const elegido = elegidoId === m.userId;
        const detalle = actual ? 'Es su mentor ahora' : m.accountActive === false ? 'Cuenta suspendida' : lleno ? 'Cupo lleno' : null;
        return (
          <Presionable
            key={m.userId}
            onPress={() => onElegir(m)}
            disabled={apagado}
            accessibilityRole="radio"
            accessibilityState={{ checked: elegido, disabled: apagado }}
            accessibilityLabel={`${m.fullName}${m.cupo ? `. Cupo ${m.cupo.acompanados} de ${m.cupo.maximo}` : ''}${detalle ? `. ${detalle}` : ''}`}
            style={[estilos.fila, { borderColor: elegido ? c.gold : c.border, backgroundColor: elegido ? c.goldWash : c.cardBg, opacity: apagado ? 0.5 : 1 }]}
          >
            {m.cupo ? <AnilloDeCupo acompanados={m.cupo.acompanados} maximo={m.cupo.maximo} tamano={44} /> : null}
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={[t.body, { color: c.textStrong, fontFamily: fuentes.media, fontSize: 16 }]} numberOfLines={2}>
                {m.fullName}
              </Text>
              {detalle ? <Text style={[t.body, { color: c.textSoft, fontSize: 15 }]}>{detalle}</Text> : null}
            </View>
            {elegido ? <Icon name="checkCircle" size={22} color={c.goldInk} /> : null}
          </Presionable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  lista: { gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, borderWidth: 1.5, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 },
});
