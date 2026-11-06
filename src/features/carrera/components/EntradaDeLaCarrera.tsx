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
 * «Correr con GPS» bajo el nombre de «Kilómetros diarios» en la lista de hoy de Training (spec 042, FR-001): una píldora con borde
 * dorado, de 48 de alto. Con una carrera en curso dice «Carrera en curso · Volver» y la vuelve a abrir. Quién la ve lo decide
 * `seOfreceLaCarrera`; la fila de siempre (la captura) no cambia.
 */
export function EntradaDeLaCarrera({ registroId }: { registroId: string | null }) {
  const { c } = useTheme();
  const enCurso = useCarreraEnVivo() != null;
  // Se ve la fila que ofrece correr: Google Maps y el peso se adelantan para que el mapa salga ya en la cuenta.
  usePrepararLaCarrera(!enCurso);
  const texto = enCurso ? TEXTOS_DE_LA_CARRERA.entradaEnCurso : TEXTOS_DE_LA_CARRERA.entrada;
  return (
    <Presionable
      onPress={() => pedirLaCarrera(enCurso ? { tipo: 'volver' } : { tipo: 'empezar', registroId })}
      accessibilityRole="button"
      accessibilityLabel={texto}
      style={[estilos.pildora, { borderColor: c.gold, backgroundColor: enCurso ? c.goldWash : c.cardBgAlt }]}
    >
      <Icon name={enCurso ? 'activity' : 'footprints'} size={TAMANO_ICONO.normal} color={c.goldInk} />
      <Text style={[estilos.texto, { color: c.goldInk }]}>{texto}</Text>
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  pildora: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    borderWidth: 1.5,
    borderRadius: 24,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  texto: { fontFamily: fuentes.seminegrita, fontSize: 15 },
});
