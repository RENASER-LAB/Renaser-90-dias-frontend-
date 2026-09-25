import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import type { DiaDelSemaforo, SemaforoDeHoy } from '../types/semaforo.types';
import { formatearPorcentaje, palabraDelSemaforo, textoDiasConDatos } from '../utils/lecturaDelSemaforo';
import { CifraDelSemaforo } from './CifraDelSemaforo';
import { EtiquetaSemaforo } from './EtiquetaSemaforo';
import { GraficoDeDias } from './graficos';

/**
 * La tarjeta del semáforo en Hoy: color + palabra + porcentaje + días con datos + siete barritas.
 * Nada más (§5: no sobrecargar). Todo lo demás está en el detalle, que se abre al tocarla.
 *
 * Hoy es pestaña protegida (AGENTS.md §1): el dueño autorizó el 2026-09-25 solo ESTA tarjeta.
 *
 * NO pide datos: los recibe. El resumen viene de `GET /api/v1/home` (su campo `semaforo`, contrato
 * §4.2), y si ese campo es `null` Hoy ni siquiera la monta. Las barras vienen del detalle
 * (`/me/semaforo`), que es la misma lectura que usa la pantalla de detalle; si todavía no llegó o
 * falló, la tarjeta se muestra sin barras en vez de esperar o de inventarlas.
 */
export function TarjetaSemaforoHoy({
  semaforo,
  dias,
  onAbrir,
}: {
  semaforo: SemaforoDeHoy;
  dias: readonly DiaDelSemaforo[] | null;
  onAbrir: () => void;
}) {
  const { c, t } = useTheme();
  const palabra = palabraDelSemaforo(semaforo.color, semaforo.etiqueta);

  const detalle = [
    semaforo.pausado ? 'En pausa' : null,
    semaforo.diasConDatos !== null ? textoDiasConDatos(semaforo.diasConDatos) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const dicho =
    `Abrir tu semáforo de los últimos 7 días. ${palabra}` +
    (semaforo.porcentaje !== null ? `, ${formatearPorcentaje(semaforo.porcentaje)}.` : '.') +
    (detalle ? ` ${detalle}.` : '');

  return (
    <Pressable
      onPress={onAbrir}
      accessibilityRole="button"
      accessibilityLabel={dicho}
      style={({ pressed }) => [
        estilos.tarjeta,
        { borderColor: c.border, backgroundColor: pressed ? c.goldWash : c.cardBg },
      ]}
    >
      <View style={estilos.encabezado}>
        <MicroLabel>Tu semáforo · últimos 7 días</MicroLabel>
        <Icon name="chevron" size={14} color={c.chevron} />
      </View>

      <View style={estilos.cuerpo}>
        <View style={estilos.textos}>
          <EtiquetaSemaforo color={semaforo.color} etiqueta={semaforo.etiqueta} />
          {detalle ? <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>{detalle}</Text> : null}
        </View>
        <CifraDelSemaforo porcentaje={semaforo.porcentaje} color={semaforo.color} />
      </View>

      {dias && dias.length > 0 ? (
        <View style={{ marginTop: 12 }}>
          <GraficoDeDias dias={dias} tamano="chico" />
        </View>
      ) : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  /* La misma caja que `Card` (borde 1, radio 16, relleno 17): una tarjeta más del día. */
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 17, width: '100%' },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cuerpo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12 },
  textos: { flex: 1, flexShrink: 1, gap: 4 },
});
