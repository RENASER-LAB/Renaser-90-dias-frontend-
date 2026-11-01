import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO, type IconName } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import type { EstadoEnUnHabito, PersonaEnUnHabito } from '../types/habitosDeTodos.types';
import { dichoDeLaPersona, estadoEnPalabras, lineaDeLaPersona } from '../utils/habitosDeTodos';
import { AvatarDeLaLista } from './AvatarDeLaLista';
import { EvidenciaDeObligacion } from './EvidenciaDeObligacion';

/** El estado siempre lleva forma además de color: ✓ cumplió, reloj pendiente, ✕ sin cumplir, círculo tachado sin nada que medir. */
const ICONO_DEL_ESTADO: Record<EstadoEnUnHabito, IconName> = {
  CUMPLIDO: 'checkCircle',
  PENDIENTE: 'clock',
  SIN_CUMPLIR: 'close',
  SIN_DATOS: 'ban',
};

/**
 * Una persona frente a un hábito (spec 029): su foto, su nombre, el grupo con la hora planificada y la de cumplimiento, y el estado con su
 * palabra («Cumplió», «Pendiente», «Sin cumplir» o, sin nada que medir, «No le tocaba o en pausa»: nunca como falta). Tocar la fila abre su ficha en
 * ese mismo día; si entregó una evidencia, «Ver evidencia» (debajo, aparte de la fila) abre la hoja de siempre.
 */
export function FilaDePersonaEnHabito({
  persona,
  tituloDelHabito,
  primera,
  onAbrir,
}: {
  persona: PersonaEnUnHabito;
  /** El nombre del hábito, para titular la hoja de la evidencia. */
  tituloDelHabito: string;
  primera: boolean;
  onAbrir: () => void;
}) {
  const { c, t } = useTheme();
  const colorDelEstado =
    persona.estado === 'CUMPLIDO'
      ? c.success
      : persona.estado === 'SIN_CUMPLIR'
        ? c.danger
        : persona.estado === 'PENDIENTE'
          ? c.goldInk
          : c.textSoft;
  return (
    <View style={{ borderTopColor: c.divider, borderTopWidth: primera ? 0 : StyleSheet.hairlineWidth }}>
      <Presionable onPress={onAbrir} accessibilityRole="button" accessibilityLabel={dichoDeLaPersona(persona)} style={estilos.fila}>
        <AvatarDeLaLista fila={persona} size={44} />
        <View style={estilos.texto}>
          <Text style={[t.cardTitle, { color: c.textStrong }]} numberOfLines={2}>
            {persona.nombre}
          </Text>
          <Text style={[t.body, { color: c.textSoft, fontSize: 15, lineHeight: 20 }]} numberOfLines={2}>
            {lineaDeLaPersona(persona)}
          </Text>
          <View style={estilos.estado}>
            <Icon name={ICONO_DEL_ESTADO[persona.estado]} size={TAMANO_ICONO.chico} color={colorDelEstado} />
            <Text style={[t.body, { color: colorDelEstado, fontSize: 15, lineHeight: 20, fontFamily: fuentes.seminegrita }]}>
              {estadoEnPalabras(persona)}
            </Text>
          </View>
        </View>
        <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
      </Presionable>
      {persona.evidenciaId ? (
        <View style={estilos.evidencia}>
          <EvidenciaDeObligacion
            titulo={`${tituloDelHabito} · ${persona.nombre}`}
            evidencias={[{ id: persona.evidenciaId, tipo: null, subidaEn: null }]}
          />
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 14, paddingVertical: 10 },
  texto: { flex: 1, minWidth: 0, gap: 1 },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  /* Debajo de la fila, alineada con el texto (foto de 44 + separación de 12 + relleno de 14). */
  evidencia: { paddingLeft: 70, paddingRight: 14, paddingBottom: 10 },
});
