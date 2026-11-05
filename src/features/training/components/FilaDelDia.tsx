import { fuentes } from '../../../theme/fuentes';
import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { CURVA_SALIDA, DURACION_MS } from '../../../theme/movimiento';
import { escalaDeLetra } from '../../../theme/topeDeLetra';
import { tacto } from '../../../utils/tacto';
import { CheckDelHabito } from '../../habits/celebracion/CheckDelHabito';
import { TituloQueSeTacha } from '../../habits/celebracion/TarjetaQueCelebra';
import { ESCALA_APRETADO_DEL_CHECK } from '../../habits/celebracion/momentoDelHabito';
import type { ItemDelDia } from '../utils/itemsDelDia';
import { controlDeLaFila, subtituloDeLaFila, type ModoDeLaFila } from '../utils/filaDelDia';
import type { MarcaDelPrimero } from '../utils/listaDelDia';
import { accionDeLaTarjeta, AVISO_DE_HORA_PASADA } from '../utils/tarjetaDelHabito';
import { LineaDeKilometros } from '../../pasos/components/LineaDeKilometros';
import { usePasosDeLaFila } from '../../pasos/components/PasosDeLaLista';
import { EntradaDeLaCarrera } from '../../carrera/components/EntradaDeLaCarrera';
import { BotonCorrerDeLaFila } from '../../carrera/components/BotonCorrerDeLaFila';
import { lugarDeLaCarrera } from '../../carrera/utils/entradaDeLaCarrera';
import { TEXTOS_DE_PASOS } from '../../pasos/utils/textosDePasos';
import { abreLaHojaDeKilometros } from '../../pasos/utils/vistaDeKilometros';

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
  onSubir,
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
  /** «Subir» de un hábito de evidencia opcional: abre directo las cuatro formas. */
  onSubir?: (item: ItemDelDia) => void;
}) {
  const { c, t } = useTheme();
  // La hora a ancho fijo mantiene las filas alineadas, pero con la letra grande del sistema «14:30» se partía en «14:3 / 0»:
  // el ancho crece con la escala de la letra (hasta el tope global de 1,2: `TOPE_DE_LETRA`) y la hora nunca baja de renglón.
  const { fontScale } = useWindowDimensions();
  const anchoDeLaHora = Math.round(ANCHO_DE_LA_HORA * escalaDeLetra(fontScale));
  const control = controlDeLaFila(item, modo, esHoy);
  const sub = subtituloDeLaFila(item, modo, marca, ahoraMs);
  const registroId = item.habit?.id ?? item.clave;
  const hecha = item.hecho;
  const accion = item.habit ? accionDeLaTarjeta({ done: item.hecho, hasEvidence: item.habit.hasEvidence, systemKey: item.habit.systemKey }) : null;
  /* Spec 037 (D-310): «Kilómetros diarios» con los pasos conectados. Solo esa fila (y solo en hoy) cambia: sin pasos que ofrecer,
     `pasos` es null y la fila es exactamente la de siempre. */
  const pasos = usePasosDeLaFila(item);
  const conPasos = esHoy && (modo === 'hoy' || modo === 'atrasado') && !!pasos && abreLaHojaDeKilometros(pasos.vista);
  const vistaDeLosPasos = pasos?.vista ?? null;
  const avance = conPasos && vistaDeLosPasos?.modo === 'avance' ? vistaDeLosPasos : null;
  /* Spec 042 (pedido del dueño del 2026-11-05): donde se puede correr con GPS, el botón de la derecha de «Kilómetros diarios» es
     «Correr» y no «Subir» (la captura queda en la hoja del hábito). Ya cumplido, o con el avance de los pasos a la derecha, la
     píldora va debajo del nombre como antes. Sin carrera, `null`: la fila de siempre. */
  const lugarCarrera = esHoy && pasos?.carrera ? lugarDeLaCarrera({ ofrecida: true, modo, hecho: hecha, conAvanceDePasos: !!avance }) : null;
  const correrEnLaFila = lugarCarrera === 'fila';
  // La etiqueta que oye el lector: la hora, qué es y qué pasa al tocarla.
  const etiqueta = [
    item.hora ?? 'Sin hora',
    item.titulo,
    sub.marca,
    item.tipo === 'evento' ? (item.lugar ? `evento, ${item.lugar}` : 'evento') : item.tipo === 'accion' ? 'acción de tus objetivos' : null,
    modo === 'atrasado' && item.tipo !== 'evento' ? `se te pasó la hora, ${AVISO_DE_HORA_PASADA.toLowerCase()}` : null,
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
            fontFamily: fuentes.media,
          },
        ]}
      />
      {/* Solo el nombre (pedido del dueño, 29/10): «Te toca ahora», de qué es y lo atrasado lo oye el lector de pantalla. */}
    </View>
  );

  const derecha = (() => {
    switch (control) {
      case 'hecho':
        return (
          <View style={estilos.hecho} accessibilityLabel="Hecho">
            <Icon name="check" size={TAMANO_ICONO.chico} color={c.goldInk} />
            {item.cumplido?.hora ? (
              <Text style={[t.small, { color: c.goldInk, fontFamily: fuentes.media, fontVariant: ['tabular-nums'] }]}>
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
        return accion ? (
          <View style={[estilos.pildora, { backgroundColor: c.goldWash }]} accessible={false} importantForAccessibility="no-hide-descendants">
            <Icon name={accion.icono} size={TAMANO_ICONO.chico} color={c.goldInk} />
            <Text style={[t.small, { color: c.goldInk, fontFamily: fuentes.media }]}>{accion.etiqueta}</Text>
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
          {control !== 'check' && control !== 'subir' && !conPasos && !correrEnLaFila ? derecha : null}
          {avance && !avance.metaLista ? (
            // Aún no llega a la meta: el círculo vacío y apagado, sin botón (maqueta 2.1).
            <View style={[estilos.circuloApagado, { borderColor: c.border }]} accessibilityLabel="Todavía no llegas a tu meta" />
          ) : null}
        </Presionable>
      ) : (
        <View style={[estilos.areaDelTexto, { flex: 1 }]}>{contenido}</View>
      )}
      {control === 'subir' && accion && !correrEnLaFila ? (
        // «Subir» es un botón aparte (abre las cuatro formas); el nombre abre la hoja con «Marcar como hecho» (30/10).
        <Presionable
          onPress={() => onSubir?.(item)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Subir evidencia de ${item.titulo}`}
          style={[estilos.pildora, { backgroundColor: c.goldWash }]}
        >
          <Icon name={accion.icono} size={TAMANO_ICONO.chico} color={c.goldInk} />
          <Text style={[t.small, { color: c.goldInk, fontFamily: fuentes.media }]}>{accion.etiqueta}</Text>
        </Presionable>
      ) : null}
      {conPasos && !avance && accion && !correrEnLaFila ? (
        // Sin pasos hoy o sin permiso la captura sigue ahí: «Subir» es un botón aparte, porque tocar el nombre abre la hoja de los pasos.
        <Presionable
          onPress={() => onSubir?.(item)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Subir captura de ${item.titulo}`}
          style={[estilos.pildora, { backgroundColor: c.goldWash }]}
        >
          <Icon name={accion.icono} size={TAMANO_ICONO.chico} color={c.goldInk} />
          <Text style={[t.small, { color: c.goldInk, fontFamily: fuentes.media }]}>{accion.etiqueta}</Text>
        </Presionable>
      ) : null}
      {correrEnLaFila ? <BotonCorrerDeLaFila registroId={pasos?.registroId ?? null} titulo={item.titulo} /> : null}
      {avance?.metaLista ? (
        // La meta está lista: un toque registra los km (el servidor vuelve a comprobar la meta y el día).
        <Presionable
          onPress={() => {
            tacto.seleccion();
            pasos?.onRegistrar();
          }}
          disabled={pasos?.registrando}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`${TEXTOS_DE_PASOS.registrar} ${item.titulo}`}
          style={[estilos.registrar, { backgroundColor: c.gold }]}
        >
          <Text style={[t.small, { color: c.onGold, fontFamily: fuentes.negrita, fontSize: 15 }]}>{TEXTOS_DE_PASOS.registrar}</Text>
        </Presionable>
      ) : null}
      {control === 'check' ? (
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

  // La línea de los pasos (el enlace, la barra o «Todavía no vemos pasos hoy») va debajo de la fila, a la altura del nombre: fuera del
  // área táctil de la fila, para que su enlace sea un botón propio y no quede dentro de otro.
  // Spec 042: «Correr con GPS» va en el mismo lugar, debajo de la línea de los pasos (o sola, si los pasos no ofrecen nada).
  const conCarrera = lugarCarrera === 'debajo';
  const conLinea = pasos && esHoy && (pasos.vista.modo !== 'captura' || conCarrera) ? (
    <View>
      {cuerpo}
      <View style={{ paddingLeft: anchoDeLaHora + 10, gap: 4, paddingBottom: conCarrera ? 8 : 0 }}>
        {pasos.vista.modo !== 'captura' ? (
          <LineaDeKilometros vista={pasos.vista} onConectar={pasos.onConectar} onActualizar={pasos.onActualizar} />
        ) : null}
        {conCarrera ? <EntradaDeLaCarrera registroId={pasos.registroId} /> : null}
      </View>
    </View>
  ) : (
    cuerpo
  );

  if (!animada) return conLinea;
  return (
    <Animated.View layout={ACOMODO_DE_LAS_FILAS} exiting={SALIDA_DE_LA_FILA}>
      {conLinea}
    </Animated.View>
  );
}

/** El ancho de la columna de la hora con la letra en su tamaño normal. */
export const ANCHO_DE_LA_HORA = 46;

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
  hora: { fontFamily: fuentes.negrita, fontSize: 14, fontVariant: ['tabular-nums'] },
  areaDelTexto: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 6 },
  // `justifyContent: 'center'`: si la columna del nombre queda más alta que su texto (el área de la fila mide 48 como mínimo),
  // el título de una línea se centra en vez de quedarse arriba, a la altura de la hora y del botón.
  texto: { flex: 1, minWidth: 0, gap: 2, justifyContent: 'center' },
  hecho: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pildora: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 38, paddingHorizontal: 14, borderRadius: 19 },
  registrar: { minHeight: 48, minWidth: 48, paddingHorizontal: 16, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  circuloApagado: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, marginRight: 1 },
  // 34 de dibujo y 10 de `hitSlop`: el área de toque pasa los 48 sin agrandar el círculo.
  check: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.75, alignItems: 'center', justifyContent: 'center' },
});
