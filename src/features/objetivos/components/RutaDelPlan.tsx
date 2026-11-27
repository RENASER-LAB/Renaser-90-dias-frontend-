import { fuentes } from '../../../theme/fuentes';
import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { CURVA_SALIDA, DURACION_MS } from '../../../theme/movimiento';
import { useTheme } from '../../../theme/ThemeContext';
import type { Palette } from '../../../theme/tokens';
import { ErrorDeCarga } from '../../sinRed/components/ErrorDeCarga';
import type { RocaMaestraApi } from '../types/objetivos.types';
import { estaPorConfirmar } from '../utils/objetivosPorConfirmar';
import {
  debeHacerLaCascada,
  DURACION_DE_CADA_NIVEL_EN_LA_CASCADA_MS,
  respiraElSiguiente,
  retrasoDeLaCascada,
  type EfectosDeLaRuta,
} from '../utils/efectosDeLaRuta';
import { primeraClausula } from '../utils/cifraDelObjetivo';
import {
  posicionarLosNiveles,
  textoDeLaCuenta,
  type ItemDeLoQueViene,
  type NivelDeLaRuta,
  type NivelPosicionado,
} from '../utils/rutaDelPlan';

/**
 * Plan como ruta de niveles (spec 058, R1 «Zigzag crema»). Aquí solo se dibuja; qué niveles hay y qué abre cada uno lo decide
 * `utils/rutaDelPlan` y lo conectan `PlanScreen` / `PlanDelEje`. Todo en el dorado de la app: los ejes se distinguen por su ícono.
 *
 * Los efectos (FR-014) animan solo `transform` y `opacity`, con valores compartidos de Reanimated (hilo de la interfaz). Con «Reducir
 * movimiento» del sistema nada se anima: los cambios son instantáneos (el háptico lo pone `useEfectosDeLaRuta`).
 */

/** La cascada de entrada sale una sola vez por sesión: al abrir Plan por primera vez. */
let cascadaYaSalio = false;

const TAMANO_DEL_FENIX = 44;
const FENIX = require('../../../../assets/rive/phoenix_alegre.png');

export type DisparoDeEfectos = { n: number; efectos: EfectosDeLaRuta };

function sinMovimiento(reducido: boolean) {
  return { reduceMotion: reducido ? ReduceMotion.Always : ReduceMotion.System };
}

/* ------------------------------------------------------------------------------------------------
 * La línea de la meta y el separador del mes
 * ---------------------------------------------------------------------------------------------- */

export function LineaDeLaMeta({
  roca,
  cargando,
  error,
  plazo,
  alTocar,
}: {
  roca: RocaMaestraApi | null;
  cargando: boolean;
  error: string | null;
  plazo: string;
  /** Abre el editor de siempre (o la revisión, si está por confirmar). `undefined` = no hay nada que anotar. */
  alTocar?: () => void;
}) {
  const { c, t } = useTheme();
  const porConfirmar = estaPorConfirmar(roca);
  const porcentaje = roca?.porcentaje ?? null;
  const contenido = (
    <View style={[estilos.meta, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
      <View style={estilos.filaMeta}>
        <Icon name="flag" size={TAMANO_ICONO.normal} color={c.goldInk} />
        {cargando && !roca ? (
          <Text style={[t.body, estilos.textoMeta, { color: c.textSoft }]}>Cargando tu objetivo…</Text>
        ) : error && !roca ? (
          <ErrorDeCarga mensaje={error} style={[t.body, estilos.textoMeta]} />
        ) : !roca ? (
          <Text style={[t.body, estilos.textoMeta, { color: c.textSoft }]}>{`Escribe tu meta de ${plazo}`}</Text>
        ) : (
          <Text style={[t.body, estilos.textoMeta, estilos.negrita, { color: c.textStrong }]} numberOfLines={2}>
            {primeraClausula(roca.objetivo)}
          </Text>
        )}
        {porcentaje != null ? <Text style={[t.cardTitle, estilos.cifras, { color: c.goldInk, fontSize: 17 }]}>{porcentaje}%</Text> : null}
        {alTocar ? <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} /> : null}
      </View>
      {porConfirmar ? <Text style={[t.small, { color: c.goldInk, fontFamily: fuentes.negrita }]}>Por confirmar</Text> : null}
      {porcentaje != null ? (
        <View
          style={[estilos.barraMeta, { backgroundColor: c.border }]}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Avance de tu objetivo: ${porcentaje} por ciento`}
        >
          <View style={{ width: `${Math.max(0, Math.min(100, porcentaje))}%`, height: '100%', borderRadius: 3, backgroundColor: c.gold }} />
        </View>
      ) : null}
    </View>
  );
  return alTocar ? (
    <Presionable onPress={alTocar} accessibilityRole="button" accessibilityLabel={porConfirmar ? 'Tu meta, por confirmar. Revisa y confirma' : 'Tu meta. Abre el editor del objetivo'}>
      {contenido}
    </Presionable>
  ) : (
    contenido
  );
}

export function SeparadorDelMes({ etiqueta, alTocar }: { etiqueta: string | null; alTocar: () => void }) {
  const { c, t } = useTheme();
  return (
    <Presionable onPress={alTocar} accessibilityRole="button" accessibilityLabel={`${etiqueta ?? 'Planificar mi mes'}. Abre Planificar mi mes`} style={estilos.mes}>
      <View style={[estilos.regla, { backgroundColor: c.divider }]} />
      <Text style={[t.small, estilos.textoMes, { color: c.textSoft }]} numberOfLines={2}>
        {etiqueta ?? 'Planificar mi mes'}
      </Text>
      <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
    </Presionable>
  );
}

/* ------------------------------------------------------------------------------------------------
 * La franja de la semana
 * ---------------------------------------------------------------------------------------------- */

export function FranjaDeLaSemana({
  numeroSemana,
  rango,
  titulo,
  avance,
  alTocar,
  disparo,
  mensajeSinTitulo,
}: {
  numeroSemana: number;
  rango: string | null;
  /** El objetivo de la semana; `null` = todavía no se arma. */
  titulo: string | null;
  avance: { cumplidas: number; total: number };
  alTocar?: () => void;
  disparo: DisparoDeEfectos;
  mensajeSinTitulo: string;
}) {
  const { c, t } = useTheme();
  const reducido = useReducedMotion();
  const armada = titulo !== null;
  const cuenta = armada ? textoDeLaCuenta(avance) : null;
  const proporcion = avance.total > 0 ? avance.cumplidas / avance.total : 0;
  const [anchoBarra, setAnchoBarra] = useState(0);
  const progreso = useSharedValue(proporcion);
  const pop = useSharedValue(1);

  useEffect(() => {
    progreso.set(reducido ? proporcion : withTiming(proporcion, { duration: DURACION_MS.avance, easing: CURVA_SALIDA }));
  }, [proporcion, reducido, progreso]);
  // La cifra «N de M» sube una vez por cada cambio real (`disparo.n`), no cada vez que se redibuja.
  useEffect(() => {
    if (disparo.n === 0 || !disparo.efectos.cuentaSubio || reducido) return;
    pop.set(withSequence(withTiming(1.28, { duration: 90, easing: CURVA_SALIDA }), withSpring(1, { damping: 12, stiffness: 240 })));
  }, [disparo, reducido, pop]);

  const estiloCifra = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const estiloRelleno = useAnimatedStyle(() => ({ transform: [{ translateX: (progreso.get() - 1) * anchoBarra }] }));

  const fondo = armada ? c.gold : c.cardBg;
  const tinta = armada ? c.onGold : c.textStrong;
  const contenido = (
    <View style={[estilos.franja, { backgroundColor: fondo, borderColor: armada ? c.goldInk : c.border }]}>
      <View style={estilos.filaFranja}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[t.small, estilos.rotuloFranja, { color: tinta }]}>{rango ? `Semana ${numeroSemana} · ${rango}` : `Semana ${numeroSemana}`}</Text>
          <Text style={[t.body, estilos.negrita, { color: tinta, fontSize: 16, lineHeight: 22 }]} numberOfLines={3}>
            {armada ? titulo : mensajeSinTitulo}
          </Text>
        </View>
        {cuenta ? (
          <Animated.View style={[estilos.cuenta, { backgroundColor: 'rgba(255,255,255,0.22)' }, estiloCifra]}>
            <Text style={[t.cardTitle, estilos.cifras, { color: tinta, fontSize: 16 }]}>{cuenta}</Text>
          </Animated.View>
        ) : null}
      </View>
      {armada && avance.total > 0 ? (
        <View
          style={[estilos.barraFranja, { backgroundColor: 'rgba(255,255,255,0.28)' }]}
          onLayout={(e: LayoutChangeEvent) => setAnchoBarra(e.nativeEvent.layout.width)}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`${avance.cumplidas} de ${avance.total} acciones cumplidas, de hoy a fin de semana`}
        >
          <Animated.View style={[estilos.rellenoFranja, { backgroundColor: tinta }, estiloRelleno]} />
        </View>
      ) : null}
    </View>
  );
  return alTocar ? (
    <Presionable onPress={alTocar} accessibilityRole="button" accessibilityLabel={`${armada ? titulo : mensajeSinTitulo}. ${cuenta ?? ''} Abre el plan de la semana`.trim()}>
      {contenido}
    </Presionable>
  ) : (
    contenido
  );
}

/* ------------------------------------------------------------------------------------------------
 * La ruta
 * ---------------------------------------------------------------------------------------------- */

function coloresDelNivel(nivel: NivelDeLaRuta, c: Palette) {
  switch (nivel.tipo) {
    case 'cumplido':
      return { frente: c.gold, fondo: c.goldInk, icono: c.onGold, borde: 'transparent', halo: false };
    case 'siguiente':
      return { frente: c.gold, fondo: c.goldInk, icono: c.onGold, borde: 'transparent', halo: true };
    case 'porHacer':
      return { frente: c.cardBgAlt, fondo: c.borderStrong, icono: c.goldInk, borde: c.borderStrong, halo: false };
    case 'candado':
      return { frente: c.divider, fondo: c.border, icono: c.tabInactive, borde: 'transparent', halo: false };
    case 'arma':
    case 'metas':
      return { frente: c.text, fondo: c.textStrong, icono: c.bg, borde: 'transparent', halo: true };
    case 'mas':
      return { frente: 'transparent', fondo: 'transparent', icono: c.goldInk, borde: c.gold, halo: false };
    case 'cofre':
    default:
      return nivel.abierto
        ? { frente: c.gold, fondo: c.goldInk, icono: c.onGold, borde: 'transparent', halo: true }
        : { frente: c.goldWash, fondo: c.borderStrong, icono: c.goldInk, borde: c.gold, halo: false };
  }
}

function PiezaDeLaRuta({
  item,
  ancho,
  respira,
  retraso,
  pop,
  cofreSeAbrio,
  reducido,
  alTocar,
}: {
  item: NivelPosicionado;
  ancho: number;
  respira: boolean;
  /** Retraso de la cascada de entrada en ms; `null` = sin cascada. */
  retraso: number | null;
  /** Sube cuando este nivel acaba de cumplirse (0 = no). */
  pop: number;
  cofreSeAbrio: number;
  reducido: boolean;
  alTocar: (nivel: NivelDeLaRuta) => void;
}) {
  const { c, t } = useTheme();
  const { nivel, y, alto, ancho: lado, xPorCiento, etiquetaALaIzquierda } = item;
  const col = coloresDelNivel(nivel, c);
  const centro = (xPorCiento / 100) * ancho;
  const espacio = etiquetaALaIzquierda ? centro - lado / 2 - 8 : ancho - centro - lado / 2 - 8;
  const anchoEtiqueta = Math.max(90, Math.min(190, espacio));
  const hayTexto = nivel.titulo !== '';

  const escala = useSharedValue(1);
  const palomita = useSharedValue(nivel.tipo === 'cumplido' ? 1 : 0);
  const entrada = useSharedValue(retraso === null ? 1 : 0);
  const brillo = useSharedValue(0);

  // La cascada de entrada: los niveles aparecen uno tras otro, todos dentro de 280 ms.
  useEffect(() => {
    if (retraso === null) return;
    entrada.set(reducido ? 1 : withDelay(retraso, withTiming(1, { duration: DURACION_DE_CADA_NIVEL_EN_LA_CASCADA_MS, easing: CURVA_SALIDA })));
    // Solo al montar: la cascada no se repite.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Un nivel cumplido sin «pop» (por ejemplo, el que ya estaba) se ve con su check puesto.
  useEffect(() => {
    if (nivel.tipo === 'cumplido' && pop === 0) palomita.set(1);
    if (nivel.tipo !== 'cumplido') palomita.set(0);
  }, [nivel.tipo, pop, palomita]);

  // El «pop» al cumplirse: 0.9 → 1.08 → 1 con resorte suave, y el check se dibuja.
  useEffect(() => {
    if (pop === 0) return;
    if (reducido) {
      palomita.set(1);
      return;
    }
    palomita.set(0);
    palomita.set(withDelay(70, withTiming(1, { duration: 200, easing: CURVA_SALIDA })));
    escala.set(withSequence(withTiming(0.9, { duration: 70, easing: CURVA_SALIDA }), withSpring(1.08, { damping: 11, stiffness: 260 }), withSpring(1, { damping: 16, stiffness: 200 })));
  }, [pop, reducido, escala, palomita]);

  // El cofre al abrirse: un rebote pequeño y un brillo dorado, una sola vez.
  useEffect(() => {
    if (cofreSeAbrio === 0 || reducido) return;
    escala.set(withSequence(withTiming(0.88, { duration: 80, easing: CURVA_SALIDA }), withSpring(1.12, { damping: 9, stiffness: 240 }), withSpring(1, { damping: 14, stiffness: 200 })));
    brillo.set(withSequence(withTiming(0.8, { duration: 140, easing: CURVA_SALIDA }), withTiming(0, { duration: 520, easing: CURVA_SALIDA })));
  }, [cofreSeAbrio, reducido, escala, brillo]);

  // El siguiente por hacer «respira» (1 → 1.04, lento) hasta que se toca.
  const respirando = useSharedValue(1);
  useEffect(() => {
    if (respira && !reducido) {
      respirando.set(withRepeat(withSequence(withTiming(1.04, { duration: 1500 }), withTiming(1, { duration: 1500 })), -1));
    } else {
      respirando.set(withTiming(1, { duration: 120, ...sinMovimiento(reducido) }));
    }
  }, [respira, reducido, respirando]);

  const estiloNodo = useAnimatedStyle(() => ({ transform: [{ scale: escala.get() * respirando.get() }] }));
  const estiloEntrada = useAnimatedStyle(() => ({ opacity: entrada.get(), transform: [{ translateY: (1 - entrada.get()) * 8 }] }));
  const estiloCheck = useAnimatedStyle(() => ({ opacity: palomita.get(), transform: [{ scale: 0.4 + 0.6 * palomita.get() }] }));
  const estiloBrillo = useAnimatedStyle(() => ({ opacity: brillo.get(), transform: [{ scale: 1 + (1 - brillo.get()) * 0.7 }] }));

  const tocable = nivel.alTocar !== null;
  const rotulo = [nivel.titulo, nivel.detalle, nivel.tipo === 'cumplido' ? 'cumplida' : nivel.tipo === 'candado' ? 'con candado' : nivel.tipo === 'siguiente' ? 'la que sigue' : null]
    .filter(Boolean)
    .join(', ');

  const dibujo = (
    <View style={{ position: 'absolute', left: centro - lado / 2, top: 6, width: lado, height: alto + 5 }}>
      {nivel.tipo === 'cofre' && nivel.abierto ? (
        <Animated.View pointerEvents="none" style={[estilos.brillo, { backgroundColor: c.gold }, estiloBrillo]} />
      ) : null}
      {col.halo ? <View style={[estilos.halo, { backgroundColor: c.goldWash }]} /> : null}
      <Animated.View style={[{ width: lado, height: alto + 5 }, estiloNodo]}>
        <View style={{ position: 'absolute', top: 5, width: lado, height: alto, borderRadius: nivel.tipo === 'cofre' ? 16 : lado / 2, backgroundColor: col.fondo }} />
        <View
          style={[
            estilos.frente,
            {
              width: lado,
              height: alto,
              borderRadius: nivel.tipo === 'cofre' ? 16 : lado / 2,
              backgroundColor: col.frente,
              borderColor: col.borde,
              borderWidth: nivel.tipo === 'mas' ? 2 : col.borde === 'transparent' ? 0 : 3,
              borderStyle: nivel.tipo === 'mas' ? 'dashed' : 'solid',
            },
          ]}
        >
          {nivel.tipo === 'cumplido' ? (
            <Animated.View style={estiloCheck}>
              <Icon name="check" size={TAMANO_ICONO.grande} color={col.icono} />
            </Animated.View>
          ) : (
            <Icon name={nivel.icono} size={TAMANO_ICONO.grande} color={col.icono} />
          )}
        </View>
      </Animated.View>
    </View>
  );

  const etiqueta = hayTexto ? (
    <View
      style={[
        estilos.etiqueta,
        { top: 6, height: alto, width: anchoEtiqueta },
        etiquetaALaIzquierda ? { left: centro - lado / 2 - 8 - anchoEtiqueta, alignItems: 'flex-end' } : { left: centro + lado / 2 + 8, alignItems: 'flex-start' },
        nivel.tipo === 'candado' ? { opacity: 0.6 } : null,
      ]}
    >
      <Text
        style={[
          t.body,
          estilos.tituloNivel,
          { color: nivel.tipo === 'cumplido' ? c.textSoft : c.textStrong, textAlign: etiquetaALaIzquierda ? 'right' : 'left' },
          nivel.tipo === 'cumplido' ? { textDecorationLine: 'line-through' } : null,
        ]}
        numberOfLines={2}
      >
        {nivel.titulo}
      </Text>
      {nivel.detalle ? (
        <Text
          style={[
            t.small,
            estilos.detalleNivel,
            { color: nivel.tipo === 'siguiente' ? c.goldInk : c.textSoft, textAlign: etiquetaALaIzquierda ? 'right' : 'left' },
            nivel.tipo === 'siguiente' ? { fontFamily: fuentes.negrita } : null,
          ]}
          numberOfLines={2}
        >
          {nivel.detalle}
        </Text>
      ) : null}
    </View>
  ) : null;

  const fila = (
    <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: y - 6, height: alto + 12 }, estiloEntrada]}>
      {tocable ? (
        <Presionable
          onPress={() => alTocar(nivel)}
          accessibilityRole="button"
          accessibilityLabel={rotulo}
          contenedorStyle={StyleSheet.absoluteFill}
          style={StyleSheet.absoluteFill}
        >
          {dibujo}
          {etiqueta}
        </Presionable>
      ) : (
        <View style={StyleSheet.absoluteFill} accessible accessibilityLabel={rotulo}>
          {dibujo}
          {etiqueta}
        </View>
      )}
    </Animated.View>
  );
  return fila;
}

export function RutaDelPlan({
  niveles,
  disparo,
  alTocar,
}: {
  niveles: readonly NivelDeLaRuta[];
  disparo: DisparoDeEfectos;
  alTocar: (nivel: NivelDeLaRuta) => void;
}) {
  const reducido = useReducedMotion();
  const [ancho, setAncho] = useState(0);
  const [tocado, setTocado] = useState<string | null>(null);
  const { items, alto } = posicionarLosNiveles(niveles);
  const siguiente = niveles.find(n => n.tipo === 'siguiente')?.clave ?? null;

  // La cascada: se decide una vez, cuando aparecen los niveles por primera vez en la sesión.
  const decidida = useRef<boolean | null>(null);
  if (decidida.current === null && niveles.length > 0) {
    decidida.current = debeHacerLaCascada(cascadaYaSalio, true);
    if (decidida.current) cascadaYaSalio = true;
  }
  const haceCascada = decidida.current === true;

  const fenix = useFenix(items, siguiente, disparo, reducido, ancho);

  const tocar = (nivel: NivelDeLaRuta) => {
    setTocado(nivel.clave);
    alTocar(nivel);
  };

  return (
    <View style={{ height: alto, width: '100%' }} onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}>
      {ancho > 0
        ? items.map((item, i) => (
            <PiezaDeLaRuta
              key={item.nivel.clave}
              item={item}
              ancho={ancho}
              respira={respiraElSiguiente(item.nivel.clave, siguiente, tocado)}
              retraso={haceCascada ? retrasoDeLaCascada(i, items.length) : null}
              pop={disparo.efectos.popDe.includes(item.nivel.clave) ? disparo.n : 0}
              cofreSeAbrio={item.nivel.tipo === 'cofre' && disparo.efectos.cofreSeAbrio ? disparo.n : 0}
              reducido={reducido}
              alTocar={tocar}
            />
          ))
        : null}
      {fenix}
    </View>
  );
}

/** El fénix al costado del siguiente por hacer; al cumplirse una acción salta en arco hasta el nuevo siguiente (FR-014). */
function useFenix(items: NivelPosicionado[], siguiente: string | null, disparo: DisparoDeEfectos, reducido: boolean, ancho: number) {
  const progreso = useSharedValue(1);
  const desvio = useSharedValue({ x: 0, y: 0 });
  const destino = items.find(i => i.nivel.clave === siguiente);
  const posicion = (i: NivelPosicionado) => {
    const centro = (i.xPorCiento / 100) * ancho;
    const x = i.etiquetaALaIzquierda ? centro + i.ancho / 2 + 2 : centro - i.ancho / 2 - TAMANO_DEL_FENIX - 2;
    return { x: Math.max(0, Math.min(ancho - TAMANO_DEL_FENIX, x)), y: i.y - 6 };
  };
  useEffect(() => {
    const salto = disparo.efectos.saltoDelFenix;
    if (disparo.n === 0 || !salto || reducido) return;
    const desde = items.find(i => i.nivel.clave === salto.desde);
    const hasta = items.find(i => i.nivel.clave === salto.hasta);
    if (!desde || !hasta) return;
    const a = posicion(desde);
    const b = posicion(hasta);
    desvio.set({ x: a.x - b.x, y: a.y - b.y });
    progreso.set(0);
    progreso.set(withTiming(1, { duration: 420, easing: CURVA_SALIDA }));
    // Un salto por cada cambio real.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disparo.n]);
  const estilo = useAnimatedStyle(() => {
    const p = progreso.get();
    const d = desvio.get();
    return { transform: [{ translateX: d.x * (1 - p) }, { translateY: d.y * (1 - p) - 4 * 28 * p * (1 - p) }] };
  });
  if (!destino || ancho === 0) return null;
  const { x, y } = posicion(destino);
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, top: y, width: TAMANO_DEL_FENIX, height: TAMANO_DEL_FENIX }, estilo]}>
      <Image source={FENIX} style={{ width: TAMANO_DEL_FENIX, height: TAMANO_DEL_FENIX }} resizeMode="contain" accessible={false} />
    </Animated.View>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Lo que viene
 * ---------------------------------------------------------------------------------------------- */

export function LoQueViene({ items, alTocar }: { items: readonly ItemDeLoQueViene[]; alTocar: (item: ItemDeLoQueViene) => void }) {
  const { c, t } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={[t.small, estilos.rotuloSeccion, { color: c.textSoft }]}>Lo que viene</Text>
      {items.map(item => {
        const esMeta = item.tipo === 'meta';
        const tocable = item.alTocar !== null;
        const fila = (
          <View style={[estilos.proximo, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            <Icon name={esMeta ? 'flag' : tocable ? 'plus' : 'lock'} size={TAMANO_ICONO.normal} color={esMeta ? c.goldInk : c.tabInactive} />
            <Text style={[t.body, estilos.tituloProximo, { color: esMeta ? c.goldInk : c.textStrong }]} numberOfLines={2}>
              {item.titulo}
            </Text>
            <Text style={[t.small, { color: c.textSoft, flexShrink: 1, textAlign: 'right' }]} numberOfLines={2}>
              {item.detalle}
            </Text>
          </View>
        );
        return tocable ? (
          <Presionable key={item.clave} onPress={() => alTocar(item)} accessibilityRole="button" accessibilityLabel={`${item.titulo}, ${item.detalle}`}>
            {fila}
          </Presionable>
        ) : (
          <View key={item.clave} accessible accessibilityLabel={`${item.titulo}, ${item.detalle}`}>
            {fila}
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  cifras: { fontVariant: ['tabular-nums'] },
  negrita: { fontFamily: fuentes.negrita },
  meta: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, gap: 8, minHeight: 56 },
  filaMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  textoMeta: { flex: 1, fontSize: 16, lineHeight: 22 },
  barraMeta: { height: 6, borderRadius: 3, overflow: 'hidden' },
  mes: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  regla: { width: 18, height: 2, borderRadius: 1 },
  textoMes: { flex: 1, fontFamily: fuentes.negrita, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  franja: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, gap: 10, minHeight: 56 },
  filaFranja: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rotuloFranja: { fontFamily: fuentes.negrita, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  cuenta: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  barraFranja: { height: 6, borderRadius: 3, overflow: 'hidden' },
  rellenoFranja: { height: '100%', width: '100%', borderRadius: 3 },
  frente: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', left: -7, right: -7, top: -7, bottom: -2, borderRadius: 40 },
  brillo: { position: 'absolute', left: -14, right: -14, top: -14, bottom: -9, borderRadius: 40 },
  etiqueta: { position: 'absolute', justifyContent: 'center', gap: 2 },
  tituloNivel: { fontFamily: fuentes.seminegrita, fontSize: 14, lineHeight: 18 },
  detalleNivel: { fontSize: 13, lineHeight: 17, fontVariant: ['tabular-nums'] },
  rotuloSeccion: { fontFamily: fuentes.negrita, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  proximo: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  tituloProximo: { flex: 1, fontFamily: fuentes.media, fontSize: 15, lineHeight: 21 },
});
