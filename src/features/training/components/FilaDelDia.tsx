import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { CURVA_SALIDA, DURACION_MS } from '../../../theme/movimiento';
import { tacto } from '../../../utils/tacto';
import { CheckDelHabito } from '../../habits/celebracion/CheckDelHabito';
import { TituloQueSeTacha } from '../../habits/celebracion/TarjetaQueCelebra';
import { ESCALA_APRETADO_DEL_CHECK } from '../../habits/celebracion/momentoDelHabito';
import type { ItemDelDia } from '../utils/itemsDelDia';
import { controlDeLaFila, subtituloDeLaFila, type ModoDeLaFila } from '../utils/filaDelDia';
import type { MarcaDelPrimero } from '../utils/listaDelDia';
import { accionDeLaTarjeta } from '../utils/tarjetaDelHabito';

/**
 * Lo que se mueve al acomodarse la lista (spec 014): lo hecho se va con un fundido corto y lo que queda sube a su lugar
 * con el mismo ease-out de la app. Se ve tantas veces al día como hábitos se cumplen, así que es lo más corto que se
 * nota; con «reducir movimiento» del sistema, sin desplazamiento.
 */
const SALIDA_DE_LA_FILA = FadeOut.duration(DURACION_MS.fundido).reduceMotion(ReduceMotion.System);
const ACOMODO_DE_LAS_FILAS = LinearTransition.duration(DURACION_MS.avance)
  .easing(CURVA_SALIDA)
  .reduceMotion(ReduceMotion.System);

/**
 * Una fila de la lista de Training: la hora, lo que es y, a la derecha, lo que se hace con ella.
 *
 * - **Tocar la fila** abre lo suyo (`onAbrir`): la hoja del hábito, su registro de siempre o el evento.
 * - **El ✓** (los hábitos que se cierran sin abrir nada) marca en el acto (`onMarcar`), sin abrir nada. Es el
 *   mismo check de la tarjeta de antes: se hunde, se llena de dorado con su «+N» y tacha el título.
 * - **Los de evidencia opcional** (Escritura libre nocturna, un hábito propio…) llevan las DOS cosas de la tarjeta de master: la
 *   píldora «Subir», que abre las cuatro formas (foto, texto, audio o video), y el ✓, que cierra sin evidencia.
 * - Lo hecho lleva ✓ y la hora; lo cerrado, candado; lo planificado no lleva nada.
 *
 * Medidas: la fila entera mide ≥ 66 y el área de toque del texto y la del ✓ ≥ 48 (AGENTS.md §4).
 */
export function FilaDelDia({
  item,
  modo,
  marca,
  ahoraMs,
  resaltada = false,
  animada = false,
  tocable = true,
  esHoy = true,
  onAbrir,
  onMarcar,
}: {
  item: ItemDelDia;
  modo: ModoDeLaFila;
  /** «Te toca ahora» / «Lo que sigue»: solo la primera de la lista. */
  marca: MarcaDelPrimero | null;
  ahoraMs: number;
  /** El fondo dorado suave de la primera de la lista. */
  resaltada?: boolean;
  /** Con salida y acomodo animados (solo la lista de hoy). */
  animada?: boolean;
  /** `false` en un día que no se puede tocar (lo planificado): la fila es solo texto. */
  tocable?: boolean;
  /** `false` en cualquier día que no sea hoy: la fila nunca ofrece registrar nada. */
  esHoy?: boolean;
  onAbrir: (item: ItemDelDia, modo: ModoDeLaFila) => void;
  onMarcar?: (item: ItemDelDia) => void;
}) {
  const { c, t } = useTheme();
  // La hora a ancho fijo mantiene las filas alineadas, pero con la letra grande del sistema «14:30» se partía en «14:3 / 0»:
  // el ancho crece con la escala de la letra (hasta 1,5) y la hora nunca baja de renglón.
  const { fontScale } = useWindowDimensions();
  const anchoDeLaHora = Math.round(ANCHO_DE_LA_HORA * Math.min(Math.max(fontScale, 1), 1.5));
  const control = controlDeLaFila(item, modo, esHoy);
  const sub = subtituloDeLaFila(item, modo, marca, ahoraMs);
  const registroId = item.habit?.id ?? item.clave;
  const hecha = item.hecho;
  const accion = item.habit ? accionDeLaTarjeta({ done: item.hecho, hasEvidence: item.habit.hasEvidence, systemKey: item.habit.systemKey }) : null;
  // La etiqueta que oye el lector: la hora, qué es y qué pasa al tocarla.
  const etiqueta = [
    item.hora ?? 'Sin hora',
    item.titulo,
    sub.marca,
    modo === 'hecho' ? 'hecho' : modo === 'cerrado' ? 'ya no se puede registrar' : null,
  ]
    .filter(Boolean)
    .join(', ');

  const contenido = (
    <View style={estilos.texto}>
      <TituloQueSeTacha
        registroId={registroId}
        texto={item.titulo}
        cumplido={hecha}
        colorDeLaRaya={c.textStrong}
        style={[
          t.body,
          {
            fontSize: 16,
            color: hecha || modo === 'cerrado' ? c.textSoft : c.textStrong,
            fontFamily: 'Jost_500Medium',
          },
        ]}
      />
      <Text style={[t.small, { color: c.textSoft }]} numberOfLines={fontScale > 1.15 ? 4 : 2}>
        {sub.marca ? <Text style={{ color: c.goldInk, fontFamily: 'Jost_700Bold' }}>{sub.marca}</Text> : null}
        {sub.marca && sub.texto ? ' · ' : ''}
        {sub.texto ? (
          <Text style={sub.tonoDeAviso ? { color: c.danger, fontFamily: 'Jost_500Medium' } : undefined}>{sub.texto}</Text>
        ) : null}
      </Text>
    </View>
  );

  const derecha = (() => {
    switch (control) {
      case 'hecho':
        return (
          <View style={estilos.hecho} accessibilityLabel="Hecho">
            <Icon name="check" size={TAMANO_ICONO.chico} color={c.goldInk} />
            {item.cumplido?.hora ? (
              <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_500Medium', fontVariant: ['tabular-nums'] }]}>
                {item.cumplido.hora}
              </Text>
            ) : null}
          </View>
        );
      case 'candado':
        return <Icon name="lock" size={TAMANO_ICONO.chico} color={c.chevron} />;
      case 'evento':
        return <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />;
      case 'accion':
      case 'check-y-accion':
        return accion ? (
          <View style={[estilos.pildora, { backgroundColor: c.goldWash }]} accessible={false} importantForAccessibility="no-hide-descendants">
            <Icon name={accion.icono} size={TAMANO_ICONO.chico} color={c.goldInk} />
            <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_500Medium' }]}>{accion.etiqueta}</Text>
          </View>
        ) : null;
      default:
        return null;
    }
  })();

  const cuerpo = (
    <View style={[estilos.fila, { borderTopColor: resaltada ? 'transparent' : c.divider }, resaltada && { backgroundColor: c.goldWash, borderRadius: 14, paddingHorizontal: 8 }]}>
      <Text
        numberOfLines={1}
        style={[t.small, estilos.hora, { width: anchoDeLaHora, color: item.hora ? c.textStrong : c.chevron }]}
      >
        {item.hora ?? '—'}
      </Text>
      {tocable ? (
        <Presionable
          onPress={() => onAbrir(item, modo)}
          accessibilityRole="button"
          accessibilityLabel={etiqueta}
          contenedorStyle={{ flex: 1 }}
          style={estilos.areaDelTexto}
        >
          {contenido}
          {control !== 'check' ? derecha : null}
        </Presionable>
      ) : (
        <View style={[estilos.areaDelTexto, { flex: 1 }]}>{contenido}</View>
      )}
      {control === 'check' || control === 'check-y-accion' ? (
        // El ✓ vive fuera del área de la fila para que tocarlo no abra la hoja. Mismo check de siempre.
        <Presionable
          onPress={() => {
            if (!hecha) tacto.seleccion();
            onMarcar?.(item);
          }}
          disabled={hecha}
          hitSlop={10}
          escalaAlApretar={ESCALA_APRETADO_DEL_CHECK}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: hecha }}
          accessibilityLabel={hecha ? `${item.titulo}, cumplido` : `Marcar ${item.titulo}`}
          style={[estilos.check, { borderColor: hecha ? c.gold : c.tabInactive }]}
        >
          <CheckDelHabito registroId={registroId} cumplido={hecha} />
        </Presionable>
      ) : null}
    </View>
  );

  if (!animada) return cuerpo;
  return (
    <Animated.View layout={ACOMODO_DE_LAS_FILAS} exiting={SALIDA_DE_LA_FILA}>
      {cuerpo}
    </Animated.View>
  );
}

/** El ancho de la columna de la hora con la letra en su tamaño normal. */
const ANCHO_DE_LA_HORA = 46;

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 66,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
  },
  // La hora, a ancho fijo: las filas quedan alineadas aunque una diga «—».
  hora: { fontFamily: 'Jost_700Bold', fontSize: 14, fontVariant: ['tabular-nums'] },
  areaDelTexto: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 6 },
  texto: { flex: 1, minWidth: 0, gap: 2 },
  hecho: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pildora: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 38, paddingHorizontal: 14, borderRadius: 19 },
  // 34 de dibujo y 10 de `hitSlop`: el área de toque pasa los 48 sin agrandar el círculo.
  check: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.75, alignItems: 'center', justifyContent: 'center' },
});
