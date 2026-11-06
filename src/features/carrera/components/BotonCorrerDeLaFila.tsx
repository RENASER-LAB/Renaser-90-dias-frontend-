import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { useCarreraEnVivo } from '../hooks/useCarreraEnVivo';
import { usePrepararLaCarrera } from '../servicios/calentarLaCarrera';
import { pedirLaCarrera } from '../servicios/pedidosDeLaCarrera';
import { TEXTOS_DE_LA_CARRERA } from '../utils/textosDeLaCarrera';

/**
 * El botón de la derecha de «Kilómetros diarios» cuando el teléfono puede correr con GPS (pedido del dueño del 2026-11-05):
 * «Correr» abre la cuenta 3, 2, 1; con una carrera en curso dice «Volver» y la vuelve a abrir. Reemplaza a «Subir» en la fila;
 * la captura sigue en la hoja del hábito. Misma forma que la píldora «Subir» (fondo dorado suave), 48 de área con el `hitSlop`.
 */
export function BotonCorrerDeLaFila({ registroId, titulo }: { registroId: string | null; titulo: string }) {
  const { c, t } = useTheme();
  const enCurso = useCarreraEnVivo() != null;
  // Se ve la fila que ofrece correr: Google Maps y el peso se adelantan para que el mapa salga ya en la cuenta.
  usePrepararLaCarrera(!enCurso);
  const texto = enCurso ? TEXTOS_DE_LA_CARRERA.botonDeLaFilaEnCurso : TEXTOS_DE_LA_CARRERA.botonDeLaFila;
  return (
    <Presionable
      onPress={() => pedirLaCarrera(enCurso ? { tipo: 'volver' } : { tipo: 'empezar', registroId })}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={enCurso ? TEXTOS_DE_LA_CARRERA.entradaEnCurso : `${TEXTOS_DE_LA_CARRERA.entrada}: ${titulo}`}
      style={[estilos.pildora, { backgroundColor: c.goldWash }]}
    >
      <Icon name={enCurso ? 'activity' : 'footprints'} size={TAMANO_ICONO.chico} color={c.goldInk} />
      <Text style={[t.small, { color: c.goldInk, fontFamily: fuentes.media }]}>{texto}</Text>
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  pildora: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 38, paddingHorizontal: 14, borderRadius: 19 },
});
