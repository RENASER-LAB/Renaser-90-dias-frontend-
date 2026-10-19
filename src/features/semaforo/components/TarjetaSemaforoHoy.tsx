import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import type { DiaDelSemaforo, SemaforoDeHoy } from '../types/semaforo.types';
import { formatearPorcentaje, palabraDelSemaforo, textoDiasConDatos } from '../utils/lecturaDelSemaforo';
import { CifraDelSemaforo } from './CifraDelSemaforo';
import { EtiquetaSemaforo } from './EtiquetaSemaforo';
import { MensajeDelSemaforo } from './MensajeDelSemaforo';
import { GraficoDeDias } from './graficos';

/**
 * La tarjeta del semáforo en Hoy: color + palabra + porcentaje + días con datos + siete barritas.
 * Nada más (§5: no sobrecargar). Todo lo demás está en el detalle, que se abre al tocarla.
 *
 * Hoy es pestaña protegida (AGENTS.md §1): el dueño autorizó el 2026-09-25 solo ESTA tarjeta.
 *
 * > **Ampliada 2026-10-19 (spec 006 del backend, «Mensaje del semáforo con sticker»).** Entre la palabra del
 * > color y las siete barras suma el mensaje del día con el búho (`MensajeDelSemaforo`), solo si el servidor lo
 * > manda (`semaforo.mensaje`); el texto se suma a la etiqueta del lector de pantalla. Nada más cambia: sin
 * > mensaje la tarjeta es la de siempre.
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
    (detalle ? ` ${detalle}.` : '') +
    /* El mensaje del día (spec 006) va en la etiqueta: la tarjeta es UN solo control para el lector de
       pantalla y lo que está adentro no se lee por separado. El texto ya viene del servidor con su punto. */
    (semaforo.mensaje ? ` ${semaforo.mensaje.texto}` : '');

  /* Rediseño de Hoy (2026-10-05): responde al dedo como las demás tarjetas (`Presionable`, se hunde
     un 3 % al apoyar) en vez de teñirse, y el chevron de «entrar» va a 16 y centrado a la derecha,
     como en todas las tarjetas de Hoy (antes iba arriba, junto al rótulo). */
  return (
    <Presionable
      onPress={onAbrir}
      accessibilityRole="button"
      accessibilityLabel={dicho}
      style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}
    >
      <View style={estilos.contenido}>
        <MicroLabel>Tu semáforo · últimos 7 días</MicroLabel>

        <View style={estilos.cuerpo}>
          <View style={estilos.textos}>
            <EtiquetaSemaforo color={semaforo.color} etiqueta={semaforo.etiqueta} />
            {detalle ? <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>{detalle}</Text> : null}
          </View>
          <CifraDelSemaforo porcentaje={semaforo.porcentaje} color={semaforo.color} />
        </View>

        {/* Spec 006: lo que el programa le dice hoy a la persona, con el búho. Con `mensaje: null` (backend
            anterior, nadie a quien medir o un mensaje mal formado) no se monta nada y la tarjeta queda igual. */}
        {semaforo.mensaje ? <MensajeDelSemaforo key={semaforo.mensaje.id} mensaje={semaforo.mensaje} /> : null}

        {dias && dias.length > 0 ? (
          <View style={{ marginTop: 12 }}>
            <GraficoDeDias dias={dias} tamano="chico" />
          </View>
        ) : null}
      </View>
      <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  /* La misma caja que `Card` (borde 1, radio 16, relleno 17): una tarjeta más del día. */
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 17, width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12 },
  contenido: { flex: 1 },
  cuerpo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12 },
  textos: { flex: 1, flexShrink: 1, gap: 4 },
});
