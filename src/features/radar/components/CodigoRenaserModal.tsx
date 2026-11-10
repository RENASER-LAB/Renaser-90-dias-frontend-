import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton } from '../../../components/GoldButton';
import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { MAXIMO_CARACTERES, PREGUNTAS_RADAR, type CampoRadar } from '../config/configRadar';
import type { BorradorRadar } from '../storage/borradorRadar';
import { useBorradorDelRadar } from '../hooks/useBorradorDelRadar';
import { useDictadoDelRadar } from '../hooks/useDictadoDelRadar';
import type { CheckInRadarApi } from '../types/radar.types';
import {
  huboDictado,
  marcarDictado,
  marcasDelBorrador,
  soltarCamposVacios,
  sumarDictado,
  textoMientrasDicta,
  type MarcasDeDictado,
} from '../utils/dictadoDelRadar';
import { faltantesDelRadar, textoDeLoQueFalta, type PiezaDelRadar } from '../utils/faltantesDelRadar';
import type { SlotRadar } from '../utils/slotsDelRadar';
import { EnergiaEnChips } from './EnergiaEnChips';
import { IndicadorDeGuardado } from './IndicadorDeGuardado';
import { PreguntaDelRadar } from './PreguntaDelRadar';

const CAMPOS_DEL_RADAR: readonly CampoRadar[] = PREGUNTAS_RADAR.map(p => p.campo);
const EN_BLANCO: Record<CampoRadar, string> = {
  whatAmIDoing: '',
  whatAmIThinking: '',
  whatAmIFeeling: '',
  whatAmIAvoiding: '',
};

/**
 * Las cinco preguntas del Código Renaser, a PANTALLA COMPLETA.
 *
 * Las preguntas y sus límites no se inventan acá: salen de `config/configRadar.ts`, que copia los
 * del dominio (`RegistroRadar`: textos de 2 000, energía 1-10). Agregar o quitar una pregunta es
 * tocar el contrato del backend, no este archivo.
 *
 * ## Obligatorio vs. opcional
 *
 * La misma pantalla para todos; cambia la salida:
 *
 *  - **`obligatorio`** (aprendiz) — sin botón de cerrar, el retroceso del sistema no la descarta
 *    y, al vivir por encima del navegador (`CodigoRenaserOverlay`), tampoco se escapa cambiando
 *    de pestaña. La única salida es registrar.
 *  - **opcional** (el resto del staff) — idéntica, con una X arriba a la derecha y el retroceso
 *    funcionando. Se vuelve a ofrecer en el slot siguiente.
 *
 * Bloquear el retroceso es exactamente lo que `useSystemBackHandler` permite: devolver `true` sin
 * hacer nada consume el evento, así que el gesto lateral de Android y el botón físico no sacan a
 * nadie de acá ni cierran la app.
 *
 * ## La voz (spec 030, 2026-10-31; rehecha el 2026-11-03)
 *
 * Cada pregunta de texto tiene un micrófono para «Dictar» DENTRO de su campo, abajo a la derecha (el reconocimiento de voz del
 * teléfono, el mismo del chat de SER; si el teléfono no lo tiene, el botón no está). Lo dictado se escribe en el campo mientras se
 * habla, se SUMA a lo que ya había y queda editable: nada se registra solo, solo «Registrar» con las reglas de siempre. Es el MISMO
 * formulario en las cuatro entradas (pantalla obligatoria, Hoy, Mi Radar y el aviso), así que la voz se ve y funciona igual en todas.
 * La energía no se dicta. Si algo de lo dictado queda en el texto, el registro viaja con `dictado: true` y quien acompaña lo ve
 * (decisión 030-2). **«Escuchar» ya no existe** (el dueño, 2026-11-03: «con solo leer ya basta»): ni el parlante ni las voces grabadas.
 *
 * ## Compacto (2026-11-03, pedido del dueño: «hay mucho texto y se extendió demasiado»; opción C de su maqueta)
 *
 * La cabecera es solo «Código Renaser · 11:00» (con la ✕ si se puede cerrar): sin título grande ni párrafo. Las cinco preguntas
 * —«¿Dónde estoy y qué estoy haciendo ahora?», «¿Qué estoy pensando?», «¿Qué estoy sintiendo?», «¿Qué estoy evitando?» y «¿Cuál
 * es mi nivel de energía?»— van sin línea de ayuda; cada respuesta es un campo multilínea que arranca en ~2 líneas y crece hasta 5
 * (`PreguntaDelRadar`), y la energía son diez chips del 1 al 10 (`EnergiaEnChips`). Bajo «Registrar» el formulario obligatorio no
 * dice nada. Lo escrito, lo dictado y la energía se guardan MIENTRAS se escriben (`useBorradorDelRadar`, 400 ms) y vuelven al reabrir
 * en la misma hora.
 */
export function CodigoRenaserModal({
  visible,
  slot,
  obligatorio,
  usuarioId,
  enviando,
  error,
  onEnviar,
  onCerrar,
  onLimpiarError,
  textoDelPie,
}: {
  visible: boolean;
  /** El slot que se está respondiendo. `null` mientras no hay ninguno abierto. */
  slot: SlotRadar | null;
  /** `true` = no se puede salir sin registrar. */
  obligatorio: boolean;
  /** De quién es el borrador. Sin sesión no se guarda nada. */
  usuarioId: string | null;
  enviando: boolean;
  error: string | null;
  onEnviar: (checkIn: CheckInRadarApi) => Promise<boolean>;
  onCerrar: () => void;
  onLimpiarError: () => void;
  /** Lo que dice bajo «Registrar» en los formularios que se pueden cerrar (Mi Radar dice otra cosa). El obligatorio no dice nada. */
  textoDelPie?: string;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  const [respuestas, setRespuestas] = useState<Record<CampoRadar, string>>({
    whatAmIDoing: '',
    whatAmIThinking: '',
    whatAmIFeeling: '',
    whatAmIAvoiding: '',
  });
  const [energia, setEnergia] = useState<number | null>(null);
  const [intentoEnvio, setIntentoEnvio] = useState(false);
  /** Qué respuestas llevan algo dictado (spec 030): es lo que declara el registro. */
  const [dictados, setDictados] = useState<MarcasDeDictado>([]);
  const respuestasActuales = useRef(respuestas);
  respuestasActuales.current = respuestas;

  /* Lo dictado se suma al campo que tenía el micrófono cuando este se cierra. Si no agregó nada (el campo ya estaba en el
     tope de 2 000), no cuenta como dictado. */
  const alDictar = useCallback((campo: CampoRadar, texto: string) => {
    if (sumarDictado(respuestasActuales.current[campo], texto) === respuestasActuales.current[campo]) return;
    setRespuestas(previas => ({ ...previas, [campo]: sumarDictado(previas[campo], texto) }));
    setDictados(marcas => marcarDictado(marcas, campo));
  }, []);
  const dictado = useDictadoDelRadar(alDictar);
  const detenerDictado = dictado.detener;

  /* Al cerrarse el formulario no queda el micrófono abierto. */
  useEffect(() => {
    if (visible) return;
    detenerDictado();
  }, [visible, detenerDictado]);

  /* Se empieza en blanco AL ABRIR, y sólo al abrir.

     La versión anterior también borraba al cambiar `slot.hora`, y eso era un bug con dientes: a
     las 11:00:00 en punto, a quien estuviera escribiendo desde las 10:55 se le vaciaban los
     cuatro campos de golpe, sin aviso y sin forma de recuperarlos. Con doce formularios al día
     durante siete días, alguien iba a estar tecleando justo en ese segundo.

     Que el texto sobreviva al cambio de hora no falsea nada: el registro se guarda con la hora
     del SERVIDOR, así que lo escrito a las 10:58 y enviado a las 11:00 queda donde de verdad
     pasó. Y la cabecera sí se actualiza sola, porque lee el slot en vivo — la persona ve que ya
     es el registro de las 11:00. `esperandoRespuesta` evita el otro extremo: que reabrir el
     formulario en la hora siguiente muestre lo que se escribió en la anterior.

     Esto va ANTES de `useBorradorDelRadar`: los dos corren al abrir y el borrador, que llega después, no puede quedar
     pisado por el «en blanco». */
  const estabaVisible = useRef(false);
  useEffect(() => {
    const seAcabaDeAbrir = visible && !estabaVisible.current;
    estabaVisible.current = visible;
    if (!seAcabaDeAbrir) return;
    setRespuestas(EN_BLANCO);
    setEnergia(null);
    setDictados([]);
    setIntentoEnvio(false);
    onLimpiarError();
  }, [visible, onLimpiarError]);

  /* Lo escrito, dictado o elegido se guarda mientras se hace (400 ms sin teclear) y vuelve al reabrir EN ESTA hora: un envío
     que falló por falta de red, la app cerrada a la fuerza o el formulario cerrado a medias. El borrador es de esta hora y de
     nadie más, así que si existe es exactamente lo que la persona estaba escribiendo. */
  const recuperar = useCallback((borrador: BorradorRadar) => {
    setRespuestas({ ...EN_BLANCO, ...borrador.respuestas });
    setEnergia(borrador.energia);
    setDictados(marcasDelBorrador(borrador.dictados, CAMPOS_DEL_RADAR));
  }, []);
  const { guardados, descartar: descartarElBorrador } = useBorradorDelRadar({
    visible,
    usuarioId,
    contenido: { respuestas, energia, dictados: [...dictados] },
    alRecuperar: recuperar,
  });

  /* Devolver `true` SIN cerrar consume el evento: ni el botón físico ni el gesto lateral sacan de
     acá, y tampoco cierran la app (que es lo que pasaría si devolviéramos `false`). */
  useSystemBackHandler(() => {
    if (!obligatorio) onCerrar();
    return true;
  }, visible);

  const escribir = useCallback((campo: CampoRadar, texto: string) => {
    const recortado = texto.slice(0, MAXIMO_CARACTERES);
    setRespuestas(previas => ({ ...previas, [campo]: recortado }));
    // Un campo que la persona dejó vacío ya no lleva nada dictado.
    if (recortado.trim().length === 0) {
      setDictados(marcas => soltarCamposVacios(marcas, { ...respuestasActuales.current, [campo]: recortado }));
    }
  }, []);

  /* Un toque en el micrófono de una pregunta: lo abre, lo cierra si ya era ese, o pasa de una pregunta a otra. Una vibración. */
  const dictarEn = useCallback(
    (campo: CampoRadar) => {
      dictado.alternar(campo);
      tacto.seleccion();
    },
    [dictado],
  );

  const textoDelPieFinal = textoDelPie ?? (obligatorio ? null : 'Puedes cerrarlo; vuelve a ofrecerse la hora que viene.');

  const faltan = useMemo(() => faltantesDelRadar(respuestas, energia), [respuestas, energia]);
  const completo = faltan.length === 0;

  /* Dónde queda cada pieza dentro del scroll, para llevar a la persona a la primera que falta.
     Sin esto, «Registrar» con el nivel de energía sin marcar no hacía nada a la vista: el selector
     y el aviso quedaban debajo del pliegue (visto en el emulador el 2026-09-28). */
  const scroll = useRef<ScrollView>(null);
  const posiciones = useRef<Partial<Record<PiezaDelRadar, number>>>({});
  const anotarPosicion = useCallback(
    (pieza: PiezaDelRadar) => (e: LayoutChangeEvent) => {
      posiciones.current[pieza] = e.nativeEvent.layout.y;
    },
    [],
  );

  const enviar = useCallback(async () => {
    /* Con el micrófono abierto, «Registrar» lo cierra y no registra: el texto dictado llega al cerrarse, y registrar antes lo
       dejaría afuera sin que la persona lo viera. Un segundo toque registra. */
    if (dictado.dictandoEn) {
      dictado.detener();
      return;
    }
    setIntentoEnvio(true);
    if (!completo || energia === null) {
      const y = faltan.length > 0 ? posiciones.current[faltan[0].pieza] : undefined;
      if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
      return;
    }
    const ok = await onEnviar({
      whatAmIDoing: respuestas.whatAmIDoing.trim(),
      whatAmIThinking: respuestas.whatAmIThinking.trim(),
      whatAmIFeeling: respuestas.whatAmIFeeling.trim(),
      energyLevel: energia,
      whatAmIAvoiding: respuestas.whatAmIAvoiding.trim(),
      // Solo viaja si es cierto: el pedido de quien escribe es idéntico al de siempre.
      ...(huboDictado(dictados, respuestas) ? { dictado: true } : {}),
    });
    if (ok) {
      // Registrado: el borrador ya no hace falta y el cierre del formulario no debe volver a escribirlo.
      descartarElBorrador();
      onCerrar();
    }
  }, [completo, faltan, energia, respuestas, dictados, dictado, descartarElBorrador, onEnviar, onCerrar]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      // Android dispara esto con el gesto/botón atrás. Cuando es innegociable NO cierra —el
      // manejador de arriba ya consumió el evento— y acá se deja explícito para que nadie
      // "arregle" el modal agregando un cierre por este camino.
      onRequestClose={obligatorio ? () => {} : onCerrar}
    >
      <SafeAreaView style={[styles.pantalla, { backgroundColor: c.bg }]}>
        {/* Cuatro campos de texto largos: en iOS el teclado tapa los de abajo y no hay forma de
            ver lo que se escribe. Mismo patrón que el resto de la app (ImageViewerModal,
            LoginScreen): en Android el ajuste lo hace el sistema, por eso va `undefined`. */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.columna, { maxWidth: contentMaxWidth, paddingHorizontal: horizontalPadding }]}
        >
          <View style={styles.encabezado}>
            <View style={styles.rotulo}>
              <MicroLabel>
                {slot ? `Código Renaser · ${slot.etiqueta}` : 'Código Renaser'}
                {obligatorio ? ' · Innegociable' : ''}
              </MicroLabel>
            </View>
            <IndicadorDeGuardado cuenta={guardados} />
            {!obligatorio ? (
              <Pressable
                onPress={onCerrar}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                style={styles.cerrar}
              >
                <View style={[styles.cerrarCirculo, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                  <Icon name="close" size={16} color={c.textSoft} />
                </View>
              </Pressable>
            ) : null}
          </View>

          {/* Spec 048 fase 3 (P8): sin señal el Código Renaser también se responde: se guarda en la cola con la hora real. */}
          <ScrollView
            ref={scroll}
            style={{ flex: 1 }}
            contentContainerStyle={styles.contenido}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {PREGUNTAS_RADAR.map(pregunta => {
              const valor = respuestas[pregunta.campo];
              const dictandoAqui = dictado.dictandoEn === pregunta.campo;
              return (
                <PreguntaDelRadar
                  key={pregunta.campo}
                  pregunta={pregunta}
                  textoVisible={dictandoAqui ? textoMientrasDicta(valor, dictado.parcial) : valor}
                  marcador={pregunta.marcador}
                  puedeDictar={dictado.disponible}
                  dictando={dictandoAqui}
                  enviando={enviando}
                  marcadaVacia={intentoEnvio && valor.trim().length === 0}
                  fallo={dictado.fallo?.campo === pregunta.campo ? dictado.fallo.mensaje : null}
                  alCambiar={texto => escribir(pregunta.campo, texto)}
                  alDictar={() => dictarEn(pregunta.campo)}
                  alMedir={anotarPosicion(pregunta.campo)}
                />
              );
            })}

            <View onLayout={anotarPosicion('energia')}>
              <EnergiaEnChips value={energia} onChange={setEnergia} deshabilitado={enviando} />
            </View>
          </ScrollView>

          <View style={styles.pie}>
            {/* El aviso va en el pie, pegado al botón, y no al final del scroll: ahí abajo quedaba
                fuera de la vista y «Registrar» parecía no responder (2026-09-28). */}
            {error ? (
              <View style={[styles.aviso, { borderColor: '#E06A66', backgroundColor: c.dangerWash }]}>
                <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 13.5 }]}>{error}</Text>
              </View>
            ) : intentoEnvio && !completo ? (
              <View style={[styles.aviso, { borderColor: '#E06A66', backgroundColor: c.dangerWash }]}>
                <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 13.5 }]}>
                  {textoDeLoQueFalta(faltan)}
                </Text>
              </View>
            ) : null}
            <GoldButton
              label={enviando ? 'Guardando…' : dictado.dictandoEn ? 'Terminar de dictar' : 'Registrar'}
              onPress={() => void enviar()}
              loading={enviando}
              disabled={enviando}
            />
            {/* El formulario obligatorio de los días 1 a 7 ya no lleva texto bajo «Registrar» (2026-11-03, el dueño: se quitó «Completa
                las preguntas cada hora. Durante los primeros 7 días.»): «Registrar» queda solo. Los formularios que se pueden cerrar
                siguen diciéndolo. */}
            {textoDelPieFinal ? (
              <Text style={[t.micro, { color: c.micro, fontSize: 11, textAlign: 'center' }]}>{textoDelPieFinal}</Text>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  columna: { flex: 1, width: '100%', alignSelf: 'center', paddingTop: 6, paddingBottom: 14 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, marginBottom: 4 },
  rotulo: { flex: 1, flexShrink: 1 },
  // Área táctil de 44; el círculo que se ve mide 32. Sale por la derecha lo que sobra, para que el círculo quede en el borde.
  cerrar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -6 },
  cerrarCirculo: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  contenido: { gap: 14, paddingTop: 4, paddingBottom: 16 },
  aviso: { borderWidth: 1, borderRadius: 12, padding: 12 },
  pie: { gap: 8, paddingTop: 10 },
});
