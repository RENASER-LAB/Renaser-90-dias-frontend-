import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { leerCaja, leerEstadoDeCajaDelMentor } from '../api/cajaApi';
import { etiquetaDelChip } from '../utils/estadosDeCaja';

/** De dónde se lee el estado: Administración ve el detalle; el mentor, solo el estado de los suyos. */
export type OrigenDelChip = { quien: 'admin'; aprendizId: string } | { quien: 'mentor'; aprendizId: string };

/**
 * «Caja: Enviada», en la ficha del aprendiz (Admin y mentor, spec §7). Antes del día 8 no aparece, y
 * tampoco si el servidor no responde o no deja verla: es un dato de más, no uno que haga falta.
 * Con `onPress` (Administración) abre la caja.
 */
export function ChipDeCaja({
  origen,
  onPress,
  margenArriba = 0,
}: {
  origen: OrigenDelChip;
  onPress?: () => void;
  /** Va en el chip y no en un contenedor: sin chip, tampoco queda el hueco. */
  margenArriba?: number;
}) {
  const { c } = useTheme();
  const [estado, setEstado] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    const leer =
      origen.quien === 'admin'
        ? leerCaja(origen.aprendizId).then(d => d.estado)
        : leerEstadoDeCajaDelMentor(origen.aprendizId);
    leer.then(
      e => {
        if (vigente) setEstado(e);
      },
      () => {
        if (vigente) setEstado(null);
      },
    );
    return () => {
      vigente = false;
    };
  }, [origen.quien, origen.aprendizId]);

  const etiqueta = etiquetaDelChip(estado);
  if (!etiqueta) return null;

  const contenido = (
    <>
      <Text style={[estilos.texto, { color: c.goldInk }]}>{etiqueta}</Text>
      {onPress ? <Icon name="chevron" size={14} color={c.goldInk} /> : null}
    </>
  );
  const estilo = [estilos.chip, { backgroundColor: c.goldWash, borderColor: c.borderStrong, marginTop: margenArriba }];

  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${etiqueta}. Abrir la caja`} style={estilo}>
      {contenido}
    </Pressable>
  ) : (
    <View style={estilo} accessible accessibilityLabel={etiqueta}>
      {contenido}
    </View>
  );
}

const estilos = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  texto: { fontFamily: 'Jost_500Medium', fontSize: 16, lineHeight: 22 },
});
