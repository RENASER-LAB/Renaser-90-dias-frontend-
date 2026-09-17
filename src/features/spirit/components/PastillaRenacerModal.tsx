import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { Icon } from '../../../components/Icon';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { RESPUESTA_MAX_LENGTH, RESPUESTA_MIN_LENGTH } from '../api/spiritApi';
import { preguntasDelDia } from '../data/preguntasPastilla';
import { borradorEspiritu, type BorradorEspiritu } from '../storage/borradorEspiritu';
import type { SpiritDayApi } from '../types/spirit.types';

/**
 * "Pastilla Renacer": escuchá el audio de hoy y contestá. Sale desde abajo, como pidió el dueño
 * del producto.
 *
 * Las reglas que gobiernan este componente, y por qué:
 *
 * 1. **El audio empieza a cargar antes de que se abra el modal.** Este componente se monta con
 *    Training (solo cambia `visible`), y `useAudioPlayer(fuente)` arranca a preparar el audio en
 *    cuanto la URL existe — no se espera a que la persona toque play, ni siquiera a que abra el
 *    modal. Con la URL ya en mano, el único costo que queda para el requisito de "menos de 3
 *    segundos" es la descarga del propio mp3. Ver la nota de rendimiento más abajo.
 * 2. **Cerrar nunca pierde nada.** Salir por la ✕, por el fondo o por el gesto lateral del
 *    sistema guarda el borrador — el texto escrito, en qué pregunta iba, y qué preguntas le
 *    tocaron — y lo repone al volver a abrir. Es el pedido literal: *"que también guarde por
 *    error dónde te quedaste si te sales del modal"*.
 * 3. **Nada se marca completado de forma optimista.** El hábito queda cerrado cuando el POST
 *    responde OK; ahí recién Training recarga. Si el envío falla, el modal sigue abierto con todo
 *    lo escrito.
 * 4. **Ya entregado = solo lectura.** Si el día ya está `submitted`, se muestra lo que escribió y
 *    el audio para volver a escucharlo, sin formulario.
 *
 * ## Nota de rendimiento (requisito: que suene en menos de 3 segundos)
 *
 * Se reproduce **en streaming progresivo** (`downloadFirst: false`, el default de `expo-audio`):
 * el reproductor empieza a sonar con los primeros bloques en vez de esperar el archivo entero. Es
 * la diferencia entre ~1 segundo y ~20: los audios del catálogo pesan entre 3 y 11 MB, y bajar 11
 * MB completos con datos móviles no entra en ningún presupuesto de 3 segundos —
 * `downloadFirst: true` sería justo la opción equivocada acá.
 *
 * Ese prefetch no baja el archivo entero: en streaming el reproductor solo llena su búfer de
 * adelanto (cientos de KB, no 11 MB), así que abrir Training sin tocar la Pastilla no se come los
 * datos de nadie.
 *
 * Lo que queda fuera del alcance de este archivo y hace falta para *garantizar* el número: que los
 * mp3 estén servidos por un CDN cercano. Hoy `audios_espiritu.ruta_storage` está en NULL en las 43
 * filas (los archivos siguen en el Google Drive viejo, sin migrar), así que `audioUrl` llega
 * `null` y este componente muestra el aviso de "audio en preparación" en vez de un reproductor
 * roto.
 */

interface PastillaRenacerModalProps {
  visible: boolean;
  /** Id de la persona logueada: el borrador se guarda por usuario y por día. */
  userId: string;
  /** El día en curso (`state: 'current'`) o el ya entregado de hoy. `null` mientras carga. */
  dia: SpiritDayApi | null;
  cargando: boolean;
  /** Falla al leer el estado de Espíritu — distinta de una falla al entregar. */
  error: string | null;
  enviando: boolean;
  errorEnvio: string | null;
  /** Solo se llama con un texto que ya pasó la validación de largo. */
  onEntregar: (dia: number, texto: string) => void;
  onCerrar: () => void;
}

export function PastillaRenacerModal({
  visible,
  userId,
  dia,
  cargando,
  error,
  enviando,
  errorEnvio,
  onEntregar,
  onCerrar,
}: PastillaRenacerModalProps) {
  const { c, t } = useTheme();
  const { isTablet, horizontalPadding, contentMaxWidth } = useResponsive();

  const yaEntregado = dia?.state === 'submitted';
  const fuente = dia?.audioUrl ?? null;

  // ─── Reproductor ────────────────────────────────────────────────────────────────────────────
  // Crear el player con la fuente ya puesta es lo que dispara la carga. `null` es una fuente
  // válida para expo-audio: si el día todavía no tiene archivo, el player existe pero no carga
  // nada, y no hay que ramificar el árbol de hooks (que no se puede: los hooks no van dentro de
  // un `if`).
  const player = useAudioPlayer(fuente, { updateInterval: 250 });
  const estadoAudio = useAudioPlayerStatus(player);

  useEffect(() => {
    // Que se escuche aunque el teléfono esté en silencio (iOS) y que no se corte al bloquear la
    // pantalla: es un audio de 5-10 minutos que la persona escucha con el teléfono en el bolsillo.
    void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true });
  }, []);

  // Al cerrar el modal el audio se pausa. Que siga sonando sobre Training sin control visible
  // sería peor que cortarlo.
  useEffect(() => {
    if (!visible && estadoAudio.playing) {
      player.pause();
    }
  }, [visible, estadoAudio.playing, player]);

  const alternarReproduccion = useCallback(() => {
    if (estadoAudio.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [estadoAudio.playing, player]);

  // ─── Preguntas y respuestas ─────────────────────────────────────────────────────────────────
  const [preguntas, setPreguntas] = useState<string[]>([]);
  const [respuestas, setRespuestas] = useState<string[]>([]);
  const [indice, setIndice] = useState(0);
  const [intentoDeEnvio, setIntentoDeEnvio] = useState(false);
  const [borradorListo, setBorradorListo] = useState(false);
  // Evita guardar el borrador con el estado vacío del primer render, antes de haber leído el que
  // ya estaba guardado — eso lo pisaría con nada.
  const hidratado = useRef(false);

  useEffect(() => {
    if (!visible || !dia) return;
    let cancelado = false;
    hidratado.current = false;
    setBorradorListo(false);

    void (async () => {
      const guardado: BorradorEspiritu | null = yaEntregado
        ? null
        : await borradorEspiritu.leer(userId, dia.day);
      if (cancelado) return;

      if (guardado) {
        // Se reponen TAMBIÉN las preguntas, no solo el texto: volver y encontrar otras preguntas
        // que las que estaba contestando haría inútil el borrador.
        setPreguntas(guardado.preguntas);
        setRespuestas(guardado.respuestas);
        setIndice(Math.min(guardado.indiceActual, guardado.preguntas.length - 1));
      } else {
        const delDia = preguntasDelDia(dia.day);
        setPreguntas(delDia.preguntas);
        setRespuestas(delDia.preguntas.map(() => ''));
        setIndice(0);
      }
      setIntentoDeEnvio(false);
      hidratado.current = true;
      setBorradorListo(true);
    })();

    return () => {
      cancelado = true;
    };
  }, [visible, dia, userId, yaEntregado]);

  // Guardado del borrador: en cada cambio, con un respiro de medio segundo para no escribir en
  // disco en cada tecla. Mismo criterio que el borrador de la Ficha Inicial.
  useEffect(() => {
    if (!visible || !dia || yaEntregado || !hidratado.current) return;
    const temporizador = setTimeout(() => {
      void borradorEspiritu.guardar(userId, dia.day, {
        preguntas,
        respuestas,
        indiceActual: indice,
      });
    }, 500);
    return () => clearTimeout(temporizador);
  }, [visible, dia, userId, yaEntregado, preguntas, respuestas, indice]);

  const cerrar = useCallback(() => {
    // El guardado con respiro puede no haber llegado a correr si cierra rápido: se fuerza uno
    // último, sincrónico con el cierre. Es exactamente el caso que el dueño pidió cubrir.
    if (dia && !yaEntregado && hidratado.current) {
      void borradorEspiritu.guardar(userId, dia.day, {
        preguntas,
        respuestas,
        indiceActual: indice,
      });
    }
    onCerrar();
  }, [dia, yaEntregado, userId, preguntas, respuestas, indice, onCerrar]);

  /**
   * Gesto lateral del sistema / botón atrás: cierra el modal, nunca la app (AGENTS.md §6). Con el
   * mismo camino que la ✕, así que también guarda el borrador.
   */
  useSystemBackHandler(() => {
    cerrar();
    return true;
  }, visible);

  const cambiarRespuesta = useCallback((texto: string) => {
    setRespuestas(previas => {
      const copia = [...previas];
      copia[indice] = texto;
      return copia;
    });
  }, [indice]);

  const esUltima = indice === preguntas.length - 1;
  const actual = respuestas[indice] ?? '';
  const largoActual = actual.trim().length;
  const actualMuyCorta = largoActual < RESPUESTA_MIN_LENGTH;

  /**
   * Lo que se manda al backend. Con una sola pregunta va el texto tal cual; con varias, cada
   * pregunta con su respuesta debajo — el campo del servidor es un texto libre
   * (`registros_espiritu.resumen_texto`), así que el formato lo decide esta pantalla y tiene que
   * ser legible para el mentor que después lo lee.
   */
  const textoAEntregar = useMemo(() => {
    if (preguntas.length === 1) return respuestas[0]?.trim() ?? '';
    return preguntas.map((p, i) => `${p}\n${respuestas[i]?.trim() ?? ''}`).join('\n\n');
  }, [preguntas, respuestas]);

  const todasCompletas = respuestas.every(r => r.trim().length >= RESPUESTA_MIN_LENGTH);

  const avanzar = useCallback(() => {
    setIntentoDeEnvio(true);
    if (actualMuyCorta) return;
    if (!esUltima) {
      setIntentoDeEnvio(false);
      setIndice(i => i + 1);
      return;
    }
    if (!todasCompletas || !dia) return;
    onEntregar(dia.day, textoAEntregar);
  }, [actualMuyCorta, esUltima, todasCompletas, dia, onEntregar, textoAEntregar]);

  const anchoTarjeta = contentMaxWidth;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={cerrar}>
      <View style={styles.backdrop}>
        {/* Tocar el fondo cierra: mismo camino que la ✕, así que también guarda el borrador. */}
        <Pressable style={styles.zonaFondo} onPress={cerrar} accessibilityLabel="Cerrar" />

        <View
          style={[
            styles.hoja,
            {
              backgroundColor: c.cardBg,
              borderColor: c.border,
              paddingHorizontal: horizontalPadding,
              maxWidth: anchoTarjeta,
              alignSelf: isTablet ? 'center' : 'stretch',
            },
          ]}
        >
          <View style={styles.asa} />

          {/* UN SOLO scroll en toda la hoja (AGENTS.md §2): el reproductor y el formulario van
              dentro del mismo contenedor, sin scroll anidado. */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.contenido}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.encabezado}>
              <View style={styles.tituloBloque}>
                <Text style={[t.micro, { color: c.goldInk }]}>PASTILLA RENASER</Text>
                <Text style={[t.cardTitle, { color: c.text, marginTop: 4 }]}>
                  {dia?.title ?? 'Tu audio de hoy'}
                </Text>
                {dia ? (
                  <Text style={[t.small, { color: c.textSoft, marginTop: 2 }]}>
                    Audio {dia.day}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={cerrar}
                style={styles.botonCerrar}
                hitSlop={12}
                accessibilityLabel="Cerrar"
              >
                <Icon name="close" size={17} color={c.textSoft} />
              </Pressable>
            </View>

            {cargando ? (
              <View style={styles.centrado}>
                <ActivityIndicator color={c.goldInk} />
              </View>
            ) : error ? (
              <Text style={[t.body, { color: c.danger }]}>{error}</Text>
            ) : !dia ? (
              <Text style={[t.body, { color: c.textSoft }]}>
                Todavía no tienes una Pastilla disponible. Aparece a partir del día 8 de tu programa.
              </Text>
            ) : (
              <>
                <Reproductor
                  hayAudio={Boolean(fuente)}
                  reproduciendo={estadoAudio.playing}
                  cargandoAudio={!estadoAudio.isLoaded || estadoAudio.isBuffering}
                  posicion={estadoAudio.currentTime}
                  duracion={estadoAudio.duration}
                  onAlternar={alternarReproduccion}
                />

                {yaEntregado ? (
                  <View style={styles.bloque}>
                    <View style={styles.filaHecho}>
                      <Icon name="checkCircle" size={18} color={c.success} />
                      <Text style={[t.small, { color: c.success, marginLeft: 8 }]}>
                        Registrado. Ya contestaste este audio.
                      </Text>
                    </View>
                    <Text style={[t.body, { color: c.text, marginTop: 12 }]}>
                      {dia.summaryText}
                    </Text>
                  </View>
                ) : !borradorListo ? (
                  <View style={styles.centrado}>
                    <ActivityIndicator color={c.goldInk} />
                  </View>
                ) : (
                  <View style={styles.bloque}>
                    {preguntas.length > 1 ? (
                      <Text style={[t.micro, { color: c.textSoft, marginBottom: 6 }]}>
                        PREGUNTA {indice + 1} DE {preguntas.length}
                      </Text>
                    ) : null}
                    <Text style={[t.body, { color: c.text, marginBottom: 10 }]}>
                      {preguntas[indice]}
                    </Text>

                    <TextInput
                      value={actual}
                      onChangeText={cambiarRespuesta}
                      multiline
                      maxLength={RESPUESTA_MAX_LENGTH}
                      textAlignVertical="top"
                      placeholder="Escribe lo que te dejó este audio…"
                      placeholderTextColor={c.textSoft}
                      style={[
                        styles.campo,
                        t.body,
                        {
                          color: c.text,
                          backgroundColor: c.bg,
                          borderColor:
                            intentoDeEnvio && actualMuyCorta ? c.danger : c.border,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        t.small,
                        {
                          color: intentoDeEnvio && actualMuyCorta ? c.danger : c.textSoft,
                          marginTop: 6,
                        },
                      ]}
                    >
                      {intentoDeEnvio && actualMuyCorta
                        ? `Escribe al menos ${RESPUESTA_MIN_LENGTH} caracteres.`
                        : `${largoActual}/${RESPUESTA_MAX_LENGTH}`}
                    </Text>

                    {errorEnvio ? (
                      <Text style={[t.small, { color: c.danger, marginTop: 8 }]}>{errorEnvio}</Text>
                    ) : null}

                    <View style={styles.acciones}>
                      {indice > 0 ? (
                        <GoldButton
                          label="Anterior"
                          variant="outline"
                          onPress={() => {
                            setIntentoDeEnvio(false);
                            setIndice(i => i - 1);
                          }}
                          style={styles.botonSecundario}
                        />
                      ) : null}
                      <GoldButton
                        label={esUltima ? 'Registrar' : 'Siguiente'}
                        loading={enviando}
                        onPress={avanzar}
                        style={styles.botonPrincipal}
                      />
                    </View>

                    <Text style={[t.small, { color: c.textSoft, marginTop: 10 }]}>
                      Si cierras, guardamos lo que escribiste y vuelves donde estabas.
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}


function segundosAReloj(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos < 0) return '0:00';
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface ReproductorProps {
  hayAudio: boolean;
  reproduciendo: boolean;
  cargandoAudio: boolean;
  posicion: number;
  duracion: number;
  onAlternar: () => void;
}

/**
 * Reproductor mínimo: un botón grande, el tiempo y una barra de avance.
 *
 * Cuando el día no tiene archivo publicado se muestra un aviso en vez de un botón muerto — es el
 * estado real de hoy (los mp3 no están migrados al bucket) y quedarse mirando un play que no hace
 * nada es peor que un mensaje claro.
 */
function Reproductor({
  hayAudio,
  reproduciendo,
  cargandoAudio,
  posicion,
  duracion,
  onAlternar,
}: ReproductorProps) {
  const { c, t } = useTheme();

  if (!hayAudio) {
    return (
      <View style={[styles.reproductor, { backgroundColor: c.bg, borderColor: c.border }]}>
        <Text style={[t.small, { color: c.textSoft }]}>
          El audio de este día todavía no está publicado. Puedes contestar igual cuando esté
          disponible.
        </Text>
      </View>
    );
  }

  const avance = duracion > 0 ? Math.min(posicion / duracion, 1) : 0;

  return (
    <View style={[styles.reproductor, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Pressable
        onPress={onAlternar}
        style={[styles.botonPlay, { borderColor: c.gold }]}
        accessibilityRole="button"
        accessibilityLabel={reproduciendo ? 'Pausar' : 'Reproducir'}
        hitSlop={8}
      >
        {cargandoAudio && !reproduciendo ? (
          <ActivityIndicator color={c.goldInk} />
        ) : (
          <Icon name={reproduciendo ? 'pause' : 'play'} size={22} color={c.goldInk} />
        )}
      </Pressable>

      <View style={styles.avanceBloque}>
        <View style={[styles.barra, { backgroundColor: c.border }]}>
          <View style={[styles.barraLlena, { backgroundColor: c.gold, width: `${avance * 100}%` }]} />
        </View>
        <Text style={[t.small, { color: c.textSoft, marginTop: 6 }]}>
          {segundosAReloj(posicion)} / {segundosAReloj(duracion)}
          {cargandoAudio ? '  ·  cargando…' : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  // El fondo tocable ocupa lo que la hoja deja libre arriba: cerrar tocando afuera.
  zonaFondo: { flex: 1 },
  hoja: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    // Tope de alto para que la hoja no tape la pantalla entera en teléfonos altos (20:9).
    maxHeight: '88%',
    width: '100%',
    paddingTop: 8,
  },
  asa: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150,150,150,0.45)',
    marginBottom: 10,
  },
  contenido: { flexGrow: 1, paddingBottom: 36 },
  encabezado: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  tituloBloque: { flex: 1, flexShrink: 1, paddingRight: 12 },
  botonCerrar: { minWidth: 48, minHeight: 48, alignItems: 'flex-end', justifyContent: 'center' },
  centrado: { paddingVertical: 28, alignItems: 'center' },
  reproductor: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    flexWrap: 'wrap',
  },
  botonPlay: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avanceBloque: { flex: 1, flexShrink: 1, minWidth: 120 },
  barra: { height: 4, borderRadius: 2, width: '100%', overflow: 'hidden' },
  barraLlena: { height: 4, borderRadius: 2 },
  bloque: { marginTop: 20 },
  filaHecho: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  campo: {
    minHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
  },
  acciones: { flexDirection: 'row', alignItems: 'center', marginTop: 18, gap: 12, flexWrap: 'wrap' },
  botonSecundario: { flexGrow: 1, flexShrink: 1, minWidth: 120 },
  botonPrincipal: { flexGrow: 2, flexShrink: 1, minWidth: 140 },
});
