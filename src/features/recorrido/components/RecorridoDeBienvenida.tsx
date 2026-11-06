import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Alert } from '../../../components/Alerta';
import { GoldButton } from '../../../components/GoldButton';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useBarraInferior } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { alCambiarLasCapasObligatorias, hayOtraCapaObligatoriaAbierta, useCapaObligatoria } from '../../../navigation/capasObligatorias';
import { irAPestana, navegacionRef } from '../../../navigation/navegacionRef';
import { fuentes } from '../../../theme/fuentes';
import { CURVA_SALIDA } from '../../../theme/movimiento';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { useAuth } from '../../auth/context/AuthContext';
import { contarMisPublicaciones } from '../../community/api/wallApi';
import { FenixDeSerQuieto } from '../../fenix/components/FenixDeSerQuieto';
import { celebrarPrimerPost, useMomentoGrande } from '../../fenix/estado/momentoGrande';
import { useFuncionalidad } from '../../plataforma/estado/useFuncionalidad';
import { CLAVES } from '../../plataforma/utils/clavesDeLaApp';
import { useHayPanelDeSerAbierto } from '../../renasia/state/panelDeSerAbierto';
import { verComoActual } from '../../soporte-ti/verComo/sesionVerComo';
import { escucharPostPublicado } from '../../sparkie/events/avisoPrimerPost';
import { guardarPasoEnElTelefono, leerPasoDelTelefono } from '../estado/pasoEnElTelefono';
import { guardarPasoDelRecorrido, obtenerRecorrido, terminarRecorrido, type ComoTermino } from '../api/recorridoApi';
import { AVISO_DEL_BLOQUEO, PREGUNTA_SALTAR, pasosDelRecorrido } from '../data/pasosDelRecorrido';
import { alMoverseLaBarra, circuloDelFoco, medirPestana } from '../estado/focoDeLasPestanas';
import {
  anotarPasoAlcanzado,
  avisarRecorridoTerminado,
  pasoAlcanzado,
  estadoDelRecorrido,
  marcarEsperandoPrimerPost,
  useEstadoDelRecorrido,
} from '../estado/recorridoEnCurso';
import { alVolverAtras, cantidadDePasos, esToqueDemasiadoPronto, pasoParaRetomar, puedeArrancar, sePausa } from '../utils/cuandoSaleElRecorrido';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Spec 045, D9: el nombre con que el recorrido se anota como capa obligatoria (para no pausarse por sí mismo). */
const CAPA = 'recorridoDeBienvenida';
/** Las cinco pestañas: el recorrido solo se dibuja sobre ellas (nunca sobre el ingreso ni sobre «Términos actualizados»). */
const PESTANAS = ['Hoy', 'Plan', 'Training', 'Comunidad', 'Yo'];
/** Tras cerrar el compositor sin publicar, lo que tarda en volver el paso del Muro. */
export const PAUSA_TRAS_EL_COMPOSITOR_MS = 600;
/** Lo más que se espera a que el compositor aparezca antes de volver a mostrar el paso del Muro. */
const ESPERA_AL_COMPOSITOR_MS = 2500;
/** Lo que tarda el foco en deslizarse de una pestaña a otra. */
export const FOCO_MS = 240;

type LecturaDelServidor = { mostrar: boolean; paso: number; yaPublico: boolean } | null;

/**
 * Spec 045 (D-330): el recorrido de bienvenida. Cinco pasos, una frase cada uno, con un foco sobre la pestaña de la que
 * habla; el último lleva al compositor real del Muro y, al publicar, la felicitación con confeti.
 *
 * Vive por encima del navegador (como el arranque guiado): ninguna de las cinco pantallas lo dibuja. Lo que se tocó en
 * ellas, con autorización del dueño (06/11), es: la barra registra sus botones para medirlos, el Muro cambia el texto de ayuda
 * del compositor, y Yo → Ajustes suma «Ver el recorrido».
 */
export function RecorridoDeBienvenida() {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reducido = useReducedMotion();
  const { user, isAuthenticated, isOnboardingCompleted } = useAuth();
  const habilitado = isAuthenticated && isOnboardingCompleted && !!user?.id;

  const servidor = useLecturaDelRecorrido(habilitado, user?.id ?? null);
  const muro = useFuncionalidad(CLAVES.muro);
  const publicar = useFuncionalidad(CLAVES.muroPublicar);
  const muroDisponible = muro.prendida && muro.disponible && publicar.prendida && publicar.disponible;
  const pestanaActual = usePestanaActual();
  const otraCapa = useCallback(() => hayOtraCapaObligatoriaAbierta(CAPA), []);
  const otraCapaAbierta = useSyncExternalStore(alCambiarLasCapasObligatorias, otraCapa, otraCapa);
  const panelDeSerAbierto = useHayPanelDeSerAbierto();
  const { esperandoPrimerPost, composerAbierto, pedidoDeRepetir } = useEstadoDelRecorrido();
  const momentoGrande = useMomentoGrande();
  const barra = useBarraInferior();

  const [abierto, setAbierto] = useState(false);
  /** Entre «Escribir mi publicación» y que el compositor aparezca: el paso no se queda encima del compositor que se abre. */
  const [abriendoElCompositor, setAbriendoElCompositor] = useState(false);
  const [repetido, setRepetido] = useState(false);
  const [paso, setPaso] = useState(1);
  const arrancoRef = useRef(false);
  const usuarioId = user?.id ?? null;
  const avisarAlCerrarLaCelebracion = useRef(false);

  const yaPublico = servidor?.yaPublico ?? false;
  const cantidad = cantidadDePasos({ yaPublico, muroDisponible });
  const pasos = pasosDelRecorrido(user?.name).slice(0, cantidad);
  const actual = pasos[Math.min(paso, cantidad) - 1];
  /** Decisión del dueño (06/11, D9): para una cuenta nueva el primer post es obligatorio; no hay forma de saltarlo. */
  const obligatorio = !repetido && cantidad === 5;
  const enLasPestanas = pestanaActual !== null && PESTANAS.includes(pestanaActual);

  // Sale solo, una vez por sesión, cuando el servidor dice que toca y la persona está en Hoy sin otra capa encima.
  useEffect(() => {
    if (abierto || arrancoRef.current || esperandoPrimerPost) return;
    const entrada = {
      servidorDiceMostrar: servidor ? servidor.mostrar : null,
      repetido: false,
      pestanaActual,
      otraCapaAbierta,
      panelDeSerAbierto,
      verComo: verComoActual() !== null,
    };
    if (!puedeArrancar(entrada) || !servidor) return;
    arrancoRef.current = true;
    setRepetido(false);
    // Nunca vuelve atrás: lo guardado en el servidor o lo alcanzado en esta sesión, lo que vaya más adelante (D9, «se reiniciaba»).
    const alcanzado = usuarioId ? pasoAlcanzado(usuarioId) : 1;
    setPaso(pasoParaRetomar(Math.max(servidor.paso, alcanzado), cantidadDePasos({ yaPublico: servidor.yaPublico, muroDisponible })));
    setAbierto(true);
  }, [abierto, esperandoPrimerPost, servidor, pestanaActual, otraCapaAbierta, panelDeSerAbierto, muroDisponible, usuarioId]);

  // Yo → Ajustes → «Ver el recorrido»: lleva a Hoy y lo abre desde el principio.
  const ultimoPedido = useRef(pedidoDeRepetir);
  useEffect(() => {
    if (pedidoDeRepetir === ultimoPedido.current) return;
    ultimoPedido.current = pedidoDeRepetir;
    if (!habilitado || verComoActual() !== null) return;
    irAPestana('Hoy');
    setRepetido(true);
    setPaso(1);
    setAbierto(true);
  }, [pedidoDeRepetir, habilitado]);

  // Mientras dura, la barra de pestañas queda a la vista (se esconde al desplazar, D-246).
  useEffect(() => {
    if (abierto) barra?.mostrar();
  }, [abierto, paso, barra]);

  /** Termina sin el primer post (LISTO o SALTO). El del primer post lo termina el oyente de «post publicado». */
  const terminar = useCallback(
    (como: Exclude<ComoTermino, 'PUBLICO'>) => {
      setAbierto(false);
      if (repetido) return;
      void terminarRecorrido(como)
        .catch(() => undefined)
        .finally(() => avisarRecorridoTerminado());
    },
    [repetido],
  );

  const irAlPaso = useCallback(
    (siguiente: number) => {
      tacto.seleccion();
      setPaso(siguiente);
      if (repetido) return;
      if (usuarioId) {
        anotarPasoAlcanzado(usuarioId, siguiente);
        void guardarPasoEnElTelefono(usuarioId, siguiente);
      }
      void guardarPasoDelRecorrido(siguiente).catch(() => undefined);
    },
    [repetido, usuarioId],
  );

  const preguntarSaltar = useCallback(() => {
    Alert.alert(PREGUNTA_SALTAR.titulo, PREGUNTA_SALTAR.mensaje, [
      { text: PREGUNTA_SALTAR.cancelar, style: 'cancel' },
      { text: PREGUNTA_SALTAR.confirmar, onPress: () => terminar('SALTO') },
    ]);
  }, [terminar]);

  const alPrincipal = useCallback(() => {
    if (actual?.pestana === 'Comunidad') {
      if (!obligatorio) {
        // Repetido desde Yo (o una cuenta que ya publicó): solo lleva al Muro.
        setAbierto(false);
        irAPestana('Comunidad');
        return;
      }
      // El paso del Muro: el compositor real. Nada se publica solo. El recorrido queda abierto (y todo lo demás bloqueado, D9):
      // solo se oculta mientras el compositor está a la vista y vuelve en cuanto se cierra sin publicar.
      marcarEsperandoPrimerPost(true);
      setAbriendoElCompositor(true);
      irAPestana('Comunidad', { abrirComposerMuro: true, desdeElRecorrido: true });
      return;
    }
    if (paso >= cantidad) {
      terminar('LISTO');
      return;
    }
    irAlPaso(paso + 1);
  }, [actual, paso, cantidad, terminar, irAlPaso, obligatorio]);

  // Issue #151: tocar dentro del foco avanza, pero el foco tarda en moverse a la pestaña nueva y su área tocable sigue un instante
  // en la anterior. Se anota cuándo cambió el paso y un toque en el foco que llegue antes de la pausa se ignora.
  const ultimoCambioDePaso = useRef<number | null>(null);
  useEffect(() => {
    ultimoCambioDePaso.current = Date.now();
  }, [paso]);
  const alTocarElFoco = useCallback(() => {
    if (esToqueDemasiadoPronto(ultimoCambioDePaso.current, Date.now())) return;
    alPrincipal();
  }, [alPrincipal]);

  const alSecundario = useCallback(() => {
    if (actual?.pestana === 'Comunidad') terminar('SALTO');
    else preguntarSaltar();
  }, [actual, terminar, preguntarSaltar]);

  // El primer post: confeti, y el recorrido termina.
  useEffect(() => {
    return escucharPostPublicado(() => {
      if (!estadoDelRecorrido().esperandoPrimerPost) return;
      marcarEsperandoPrimerPost(false);
      setAbierto(false);
      celebrarPrimerPost();
      if (repetido) return;
      void terminarRecorrido('PUBLICO')
        .catch(() => undefined)
        .finally(() => {
          avisarAlCerrarLaCelebracion.current = true;
        });
    });
  }, [repetido]);

  // La guía de SER (el Pacto) se entera recién cuando se cierra la felicitación: no se monta encima del confeti.
  useEffect(() => {
    if (momentoGrande === null && avisarAlCerrarLaCelebracion.current) {
      avisarAlCerrarLaCelebracion.current = false;
      avisarRecorridoTerminado();
    }
  }, [momentoGrande]);

  // Cambiar de cuenta (o cerrar sesión): nada queda abierto ni esperando. Solo cuando cambia la CUENTA: si la sesión parpadea
  // (se relee el ingreso al volver al frente), el recorrido sigue donde estaba y no vuelve a empezar (D9, «se reiniciaba»).
  const cuentaAnterior = useRef(usuarioId);
  useEffect(() => {
    if (cuentaAnterior.current === usuarioId) return;
    cuentaAnterior.current = usuarioId;
    arrancoRef.current = false;
    setAbierto(false);
    setPaso(1);
    marcarEsperandoPrimerPost(false);
  }, [usuarioId]);

  // Después de cerrar el compositor sin publicar, el recorrido vuelve con una pausa corta: al publicar, el compositor se cierra un
  // instante antes del aviso de «publicado», y sin la pausa el paso del Muro parpadearía sobre la felicitación.
  const composerVisible = useComposerConPausa(composerAbierto);
  useEffect(() => {
    if (!abriendoElCompositor) return;
    if (composerAbierto) {
      setAbriendoElCompositor(false);
      return;
    }
    // Si el compositor no llegó a abrirse (el Muro no cargó), el paso vuelve en vez de dejar la app sin bloqueo a la vista.
    const espera = setTimeout(() => setAbriendoElCompositor(false), ESPERA_AL_COMPOSITOR_MS);
    return () => clearTimeout(espera);
  }, [abriendoElCompositor, composerAbierto]);
  const pausado = sePausa({ otraCapaAbierta, panelDeSerAbierto });
  const visible = habilitado && abierto && !pausado && !!actual && enLasPestanas && !(esperandoPrimerPost && (composerVisible || abriendoElCompositor)) && momentoGrande === null;

  // Mientras el recorrido de una cuenta nueva está abierto (también con el compositor a la vista), es una capa obligatoria: los
  // avisos del teléfono esperan a que termine en vez de abrir otra pantalla debajo.
  useCapaObligatoria(CAPA, habilitado && abierto && obligatorio);

  useSystemBackHandler(() => {
    // Obligatorio: en el primer paso y en el del Muro el atrás no hace nada (D9); nunca saca de la app ni salta el post.
    const atras = alVolverAtras(paso, { obligatorio, esElDelMuro: actual?.pestana === 'Comunidad' });
    if (atras.tipo === 'paso') irAlPaso(atras.paso);
    else if (atras.tipo === 'preguntarSaltar') preguntarSaltar();
    return true;
  }, visible);

  // ---- el foco ----
  const cx = useSharedValue(width / 2);
  const cy = useSharedValue(height);
  const radio = useSharedValue(0);
  const respira = useSharedValue(1);
  const [focoY, setFocoY] = useState<{ cx: number; arriba: number } | null>(null);
  const [altoTarjeta, setAltoTarjeta] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const pestana = actual?.pestana ?? null;
    let vigente = true;
    const medir = () => {
      if (!pestana) {
        radio.value = reducido ? 0 : withTiming(0, { duration: FOCO_MS, easing: CURVA_SALIDA });
        setFocoY(null);
        return;
      }
      void medirPestana(pestana).then(rect => {
        if (!vigente || !rect) return;
        const foco = circuloDelFoco(rect);
        const animar = (v: number) => (reducido ? v : withTiming(v, { duration: FOCO_MS, easing: Easing.out(Easing.cubic) }));
        cx.value = animar(foco.cx);
        cy.value = animar(foco.cy);
        radio.value = animar(foco.radio);
        if (!reducido) respira.value = withSequence(withTiming(1, { duration: FOCO_MS }), withTiming(1.06, { duration: 250 }), withTiming(1, { duration: 250 }));
        setFocoY({ cx: foco.cx, arriba: foco.cy - foco.radio });
      });
    };
    medir();
    const quitar = alMoverseLaBarra(medir);
    return () => {
      vigente = false;
      quitar();
    };
  }, [visible, actual?.pestana, reducido, cx, cy, radio, respira]);

  const ancho = width;
  const alto = height + insets.top + insets.bottom + 100;
  const propsDelVelo = useAnimatedProps(() => {
    const r = radio.value;
    const agujero = r > 0.5
      ? ` M${cx.value - r} ${cy.value} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`
      : '';
    return { d: `M0 0 H${ancho} V${alto} H0 Z${agujero}` };
  });
  const propsDelAro = useAnimatedProps(() => ({
    cx: cx.value,
    cy: cy.value,
    r: Math.max(0, radio.value * respira.value),
    strokeOpacity: radio.value > 0.5 ? 1 : 0,
  }));

  // La tarjeta entra con un fundido y 8 dp de subida en cada paso (con «reducir movimiento», solo fundido).
  const entrada = useSharedValue(0);
  useEffect(() => {
    if (!visible) return;
    entrada.value = 0;
    entrada.value = withTiming(1, { duration: 200, easing: CURVA_SALIDA });
  }, [visible, paso, entrada]);
  const estiloTarjeta = useAnimatedStyle(() => ({
    opacity: entrada.value,
    transform: [{ translateY: reducido ? 0 : (1 - entrada.value) * 8 }],
  }));

  // Los candados sobre las otras pestañas en el paso del Muro de una cuenta nueva (D9: se ve claro que están bloqueadas).
  const [candados, setCandados] = useState<Array<{ x: number; y: number }>>([]);
  const conCandados = visible && obligatorio && actual?.pestana === 'Comunidad';
  useEffect(() => {
    if (!conCandados) {
      setCandados([]);
      return;
    }
    let vigente = true;
    const medir = () =>
      void Promise.all(['Hoy', 'Plan', 'Training', 'Yo'].map(medirPestana)).then(rects => {
        if (vigente) setCandados(rects.flatMap(r => (r ? [{ x: r.x + r.ancho / 2, y: r.y + r.alto / 2 }] : [])));
      });
    medir();
    const quitar = alMoverseLaBarra(medir);
    return () => {
      vigente = false;
      quitar();
    };
  }, [conCandados]);

  if (!habilitado) return null;

  const fondoTarjeta = c.cardBgAlt;
  const conFoco = !!actual?.pestana && focoY !== null;
  // Encima del foco, con 14 dp de aire (la tarjeta se mide: con letra grande crece hacia arriba y nunca tapa el foco).
  const posicionTarjeta = conFoco
    ? { top: Math.max(insets.top + 16, focoY!.arriba - 14 - altoTarjeta) }
    : { top: Math.max(insets.top + 80, height * 0.22) };

  return (
    <>

      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => undefined}>
        <View style={StyleSheet.absoluteFill} accessibilityViewIsModal testID="recorrido-de-bienvenida">
          <Svg width={ancho} height={alto} style={StyleSheet.absoluteFill} pointerEvents="none">
            <AnimatedPath animatedProps={propsDelVelo} fill={c.velo} fillRule="evenodd" />
            <AnimatedCircle animatedProps={propsDelAro} stroke={c.gold} strokeWidth={2} fill="none" />
          </Svg>
          {candados.map((p, i) => (
            <View
              key={i}
              pointerEvents="none"
              testID="candado-de-pestana"
              style={[estilos.candado, { left: p.x - 18, top: p.y - 18, backgroundColor: c.cardBgAlt, borderColor: c.border }]}
            >
              <Icon name="lock" size={TAMANO_ICONO.chico} color={c.textSoft} />
            </View>
          ))}
          {/* Tocar dentro del foco avanza igual que «Siguiente»; tocar fuera no hace nada. */}
          {conFoco && actual?.pestana !== 'Comunidad' ? (
            <Pressable
              onPress={alTocarElFoco}
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={{ position: 'absolute', left: focoY!.cx - 40, top: focoY!.arriba, width: 80, height: 80 }}
            />
          ) : null}
          {actual ? (
            <Animated.View
              style={[estilos.tarjeta, { backgroundColor: fondoTarjeta, left: 16, right: 16 }, posicionTarjeta, estiloTarjeta]}
              accessibilityLiveRegion="polite"
              accessible={false}
              onLayout={e => setAltoTarjeta(e.nativeEvent.layout.height)}
            >
              {actual.pestana === null ? (
                <View style={estilos.fenix}>
                  <FenixDeSerQuieto size={120} />
                </View>
              ) : (
                <View style={estilos.puntos} accessibilityLabel={`Paso ${paso} de ${cantidad}`}>
                  {pasos.map(p => (
                    <View
                      key={p.numero}
                      style={[estilos.punto, { backgroundColor: p.numero === paso ? c.gold : c.border, width: p.numero === paso ? 20 : 7 }]}
                    />
                  ))}
                  <Text style={[t.small, { marginLeft: 'auto', color: c.textSoft }]}>{`${paso} de ${cantidad}`}</Text>
                </View>
              )}
              <Text
                style={[t.cardTitle, { color: c.textStrong, fontSize: 20, textAlign: actual.pestana === null ? 'center' : 'left' }]}
                accessibilityRole="header"
              >
                {actual.titulo}
              </Text>
              <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23, marginTop: 6, textAlign: actual.pestana === null ? 'center' : 'left' }]}>
                {actual.frase}
              </Text>
              {conCandados ? (
                <View style={estilos.bloqueo}>
                  <Icon name="lock" size={TAMANO_ICONO.chico} color={c.textSoft} />
                  <Text style={[t.body, { color: c.textSoft, fontSize: 15, flexShrink: 1 }]}>{AVISO_DEL_BLOQUEO}</Text>
                </View>
              ) : null}
              <View style={estilos.botones}>
                {obligatorio ? null : (
                  <Pressable onPress={alSecundario} style={estilos.secundario} accessibilityRole="button" hitSlop={4}>
                    <Text style={[t.body, { color: c.textSoft, fontFamily: fuentes.seminegrita, fontSize: 16 }]}>
                      {actual.pestana === 'Comunidad' ? 'Cerrar' : actual.botonSecundario}
                    </Text>
                  </Pressable>
                )}
                <GoldButton
                  label={actual.pestana === 'Comunidad' && !obligatorio ? 'Ir al Muro' : actual.botonPrincipal}
                  onPress={alPrincipal}
                  style={{ flex: 1 }}
                />
              </View>
              {conFoco ? (
                <View
                  pointerEvents="none"
                  style={[estilos.flecha, { backgroundColor: fondoTarjeta, left: Math.min(Math.max(16, focoY!.cx - 16 - 8), ancho - 32 - 24) }]}
                />
              ) : null}
            </Animated.View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

/**
 * `GET /api/v1/me/recorrido`, el paso del teléfono y si ya publicó, una vez por cuenta. Una lectura vieja (otra cuenta, o la
 * sesión que parpadeó) nunca pisa a la nueva: cada efecto descarta la suya al terminar.
 */
function useLecturaDelRecorrido(habilitado: boolean, usuarioId: string | null): LecturaDelServidor {
  const [lectura, setLectura] = useState<LecturaDelServidor>(null);
  useEffect(() => {
    setLectura(null);
    if (!habilitado || !usuarioId) return;
    let vigente = true;
    void (async () => {
      try {
        const [recorrido, pasoDelTelefono] = await Promise.all([obtenerRecorrido(), leerPasoDelTelefono(usuarioId)]);
        if (!recorrido.mostrar) {
          if (vigente) setLectura({ mostrar: false, paso: recorrido.paso, yaPublico: true });
          return;
        }
        const publicados = await contarMisPublicaciones().catch(() => 0);
        // Nunca un paso anterior al que la persona ya alcanzó en este teléfono (sin red al avanzar, el servidor quedó atrás).
        if (vigente) setLectura({ mostrar: true, paso: Math.max(recorrido.paso, pasoDelTelefono), yaPublico: publicados > 0 });
      } catch {
        // Un backend anterior (404), sin red o cualquier fallo: no se muestra. Nunca sobre una duda.
        if (vigente) setLectura({ mostrar: false, paso: 1, yaPublico: true });
      }
    })();
    return () => {
      vigente = false;
    };
  }, [habilitado, usuarioId]);
  return lectura;
}

/** `true` mientras el compositor está abierto y hasta {@link PAUSA_TRAS_EL_COMPOSITOR_MS} después de cerrarse. */
function useComposerConPausa(abierto: boolean): boolean {
  const [visible, setVisible] = useState(abierto);
  useEffect(() => {
    if (abierto) {
      setVisible(true);
      return;
    }
    const espera = setTimeout(() => setVisible(false), PAUSA_TRAS_EL_COMPOSITOR_MS);
    return () => clearTimeout(espera);
  }, [abierto]);
  return visible;
}

/** La pestaña que se ve, leída del navegador. */
function usePestanaActual(): string | null {
  const [nombre, setNombre] = useState<string | null>(() => (navegacionRef.isReady() ? (navegacionRef.getCurrentRoute() as { name: string } | undefined)?.name ?? null : null));
  useEffect(() => {
    const leer = () => setNombre(navegacionRef.isReady() ? (navegacionRef.getCurrentRoute() as { name: string } | undefined)?.name ?? null : null);
    leer();
    const quitar = navegacionRef.addListener('state', leer);
    return quitar;
  }, []);
  return nombre;
}

const estilos = StyleSheet.create({
  tarjeta: {
    position: 'absolute',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  fenix: { alignItems: 'center', marginBottom: 6 },
  puntos: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  punto: { height: 7, borderRadius: 4 },
  botones: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  secundario: { minHeight: 48, paddingHorizontal: 14, justifyContent: 'center' },
  flecha: { position: 'absolute', bottom: -8, width: 16, height: 16, borderRadius: 3, transform: [{ rotate: '45deg' }] },
  candado: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloqueo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
});
