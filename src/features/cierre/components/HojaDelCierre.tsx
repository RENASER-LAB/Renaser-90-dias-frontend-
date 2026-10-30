import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Alert } from '../../../components/Alerta';
import { GoldButton } from '../../../components/GoldButton';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { CURVA_SALIDA, DURACION_MS } from '../../../theme/movimiento';
import { tituloDelDia } from '../../training/utils/semanaDeTraining';
import {
  MOTIVOS,
  PLANES_DE_MANANA,
  PREGUNTA_DE_MANANA,
  PREGUNTA_DEL_MOTIVO,
  planEnFrase,
} from '../data/textosDelCierre';
import { useHojaDelCierre, type ResultadoDeGuardar } from '../hooks/useHojaDelCierre';
import type { AccionDelCierre, CierreDelDia } from '../types/cierre.types';
import { NOTA_MAXIMA, cumplidasDe, pendientesDe } from '../utils/borradorDelCierre';
import { horaDeUnInstante } from '../utils/itemDelCierre';
import { ChipDelCierre } from './ChipDelCierre';

export const TITULO_DE_LA_HOJA = 'Cierra tu día';
export const TEXTO_DE_DIA_CERRADO_TARDE = 'Ese día ya cerró y no se puede cerrar tarde. Tu cierre no se guardó.';
export const TEXTO_SIN_ACCIONES = 'Hoy no tenías acciones.';
export const TEXTO_DEL_CAMPO_DE_NOTA = 'Si quieres, cuéntalo con tus palabras';

/** «14 de 18 hechos hoy»: lo que Training ya sabe de los hábitos de hoy, sin contar el cierre. */
export function textoDeLosHabitos(hechos: number, total: number): string {
  return `${hechos} de ${total} ${total === 1 ? 'hecho' : 'hechos'} hoy. No hace falta responder nada.`;
}

/** «7 de 12 acciones cumplidas hasta hoy.» */
export function textoDeLaSemana(cumplidas: number, planificadas: number): string {
  return `${cumplidas} de ${planificadas} ${planificadas === 1 ? 'acción cumplida' : 'acciones cumplidas'} hasta hoy.`;
}

/**
 * LA hoja de «Cierra tu día» (spec 017), completa. De arriba abajo: lo que ya cumpliste (llega marcado y no se pregunta
 * nada), por cada acción que quedó pendiente «¿Qué pasó?», «¿Qué harás mañana?» y una nota si quieres, tus hábitos de
 * hoy y tu semana (solo lectura) y, fijo abajo, «Guardar mi cierre», que se apaga hasta tener las dos respuestas de cada
 * pendiente y dice qué falta.
 *
 * - **Guardar solo envía respuestas.** No completa nada, no paga puntos ni anuncia ninguno (`useHojaDelCierre`).
 * - **Ya cerrado, abre con lo guardado** y se puede cambiar mientras el día no termine.
 * - **Un día sin acciones** dice «Hoy no tenías acciones.»; con todo cumplido, no queda nada que preguntar. En los dos
 *   casos hay una nota del día, opcional.
 * - **Al guardar** el formulario da paso, con un fundido, a «Día cerrado» con lo que dijiste para mañana y «Ver mañana
 *   en Training» (no el domingo: mañana cae fuera de la semana).
 *
 * Movimiento (`emil-design-eng`, `animate-expo`): lo único que se mueve es ese fundido al guardar (`DURACION_MS.paso`,
 * ease-out, solo `opacity`); con «reducir movimiento» aparece al instante. Los chips no se animan.
 */
export function HojaDelCierre({
  visible,
  fecha,
  hoyIso,
  diaPrograma,
  habitosHechos,
  habitosTotal,
  puedeVerManana,
  onCerrar,
  alTerminarDeCerrar,
  alLeer,
  alGuardar,
  alSalirPorDiaCerrado,
  onVerManana,
}: {
  visible: boolean;
  fecha: string;
  hoyIso: string;
  diaPrograma: number | null;
  habitosHechos: number;
  habitosTotal: number;
  puedeVerManana: boolean;
  onCerrar: () => void;
  alTerminarDeCerrar?: () => void;
  alLeer?: (vista: CierreDelDia) => void;
  alGuardar?: (vista: CierreDelDia) => void;
  /** El día ya no es el de hoy: Training cierra la hoja, relee y avisa. */
  alSalirPorDiaCerrado: () => void;
  onVerManana: () => void;
}) {
  const { c, t } = useTheme();
  const insets = useSafeAreaInsets();
  const hoja = useHojaDelCierre({ visible, fecha, hoyIso, alLeer, alGuardar, alSalirPorDiaCerrado });
  const { fase, vista } = hoja;

  const alGuardarPresionado = async () => {
    const r: ResultadoDeGuardar = await hoja.guardar();
    if (r.resultado === 'dia-cambio' || r.resultado === 'dia-cerrado') {
      alSalirPorDiaCerrado();
    } else if (r.resultado === 'fallo') {
      Alert.alert('No se guardó tu cierre', r.mensaje, [
        { text: 'Ahora no', style: 'cancel' },
        { text: 'Reintentar', onPress: () => void alGuardarPresionado() },
      ]);
    }
  };

  const subtitulo = `${tituloDelDia(fecha)}${diaPrograma != null && diaPrograma > 0 ? ` · Día ${diaPrograma}` : ''}`;

  const pie =
    fase === 'guardado' ? (
      <View style={{ gap: 8 }}>
        {puedeVerManana ? (
          <Presionable onPress={onVerManana} accessibilityRole="button" accessibilityLabel="Ver mañana en Training" style={estilos.enlace}>
            <Text style={[t.body, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 16 }]}>Ver mañana en Training</Text>
            <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.goldInk} />
          </Presionable>
        ) : null}
        <GoldButton label="Listo" onPress={onCerrar} textStyle={estilos.textoDelBoton} />
      </View>
    ) : fase === 'formulario' || fase === 'guardando' ? (
      <View style={{ gap: 6 }}>
        <GoldButton
          label="Guardar mi cierre"
          onPress={() => void alGuardarPresionado()}
          disabled={!hoja.puedeGuardar}
          loading={fase === 'guardando'}
          textStyle={estilos.textoDelBoton}
        />
        {!hoja.puedeGuardar && hoja.textoDeLoQueFalta ? (
          <Text style={[t.small, { color: c.textSoft }]} accessibilityLiveRegion="polite">
            {hoja.textoDeLoQueFalta}
          </Text>
        ) : null}
      </View>
    ) : undefined;

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={onCerrar}
      alTerminarDeCerrar={alTerminarDeCerrar}
      titulo={TITULO_DE_LA_HOJA}
      subtitulo={subtitulo}
      tamano="completa"
      pie={pie}
    >
      {fase === 'cargando' ? (
        <Text style={[t.body, estilos.estado, { color: c.textSoft }]} accessibilityLiveRegion="polite">
          Cargando tu día…
        </Text>
      ) : fase === 'error' ? (
        <View style={estilos.estado}>
          <Text style={[t.body, { color: c.textSoft }]}>{hoja.errorDeLectura}</Text>
          <Presionable onPress={() => void hoja.reintentar()} accessibilityRole="button" accessibilityLabel="Reintentar" style={estilos.enlace}>
            <Text style={[t.body, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 16 }]}>Reintentar</Text>
          </Presionable>
        </View>
      ) : fase === 'guardado' && vista ? (
        <Aparece>
          <Guardado vista={vista} />
        </Aparece>
      ) : vista ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[estilos.cuerpo, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <Formulario
            vista={vista}
            hoja={hoja}
            habitosHechos={habitosHechos}
            habitosTotal={habitosTotal}
          />
        </ScrollView>
      ) : null}
    </HojaDesdeAbajo>
  );
}

/** El fundido de entrada del «Día cerrado» (solo `opacity`; con «reducir movimiento», al instante). */
function Aparece({ children }: { children: React.ReactNode }) {
  const opacidad = useSharedValue(0);
  useEffect(() => {
    opacidad.set(withTiming(1, { duration: DURACION_MS.paso, easing: CURVA_SALIDA, reduceMotion: ReduceMotion.System }));
  }, [opacidad]);
  const estilo = useAnimatedStyle(() => ({ opacity: opacidad.get() }));
  return <Animated.View style={[{ flex: 1 }, estilo]}>{children}</Animated.View>;
}

function Formulario({
  vista,
  hoja,
  habitosHechos,
  habitosTotal,
}: {
  vista: CierreDelDia;
  hoja: ReturnType<typeof useHojaDelCierre>;
  habitosHechos: number;
  habitosTotal: number;
}) {
  const { c, t } = useTheme();
  const cumplidas = cumplidasDe(vista);
  const pendientes = pendientesDe(vista);

  return (
    <>
      {vista.acciones.length === 0 ? (
        <Text style={[t.body, { color: c.textSoft }]}>{TEXTO_SIN_ACCIONES}</Text>
      ) : (
        <View style={{ gap: 8 }}>
          <MicroLabel>Tus acciones de hoy</MicroLabel>
          {cumplidas.map(accion => (
            <LineaCumplida key={accion.id} accion={accion} />
          ))}
          {pendientes.map(accion => (
            <TarjetaPendiente key={accion.id} accion={accion} hoja={hoja} />
          ))}
          {pendientes.length === 0 ? (
            <Text style={[t.body, { color: c.textSoft }]}>No te quedó nada pendiente. No hace falta responder nada.</Text>
          ) : null}
        </View>
      )}

      {pendientes.length === 0 ? (
        <View style={{ gap: 6 }}>
          <MicroLabel>Tu nota del día</MicroLabel>
          <CampoDeNota
            valor={hoja.borrador.notaDelDia}
            alCambiar={hoja.escribirNotaDelDia}
            etiqueta="Nota del día"
          />
        </View>
      ) : null}

      {habitosTotal > 0 ? (
        <View style={{ gap: 4 }}>
          <MicroLabel>Tus hábitos</MicroLabel>
          <Text style={[t.body, { color: c.textSoft }]}>{textoDeLosHabitos(habitosHechos, habitosTotal)}</Text>
        </View>
      ) : null}

      {vista.semana ? (
        <View style={{ gap: 4 }}>
          <MicroLabel>Tu semana</MicroLabel>
          <Text style={[t.body, { color: c.textSoft }]}>{textoDeLaSemana(vista.semana.cumplidas, vista.semana.planificadas)}</Text>
        </View>
      ) : null}
    </>
  );
}

function LineaCumplida({ accion }: { accion: AccionDelCierre }) {
  const { c, t } = useTheme();
  const hora = horaDeUnInstante(accion.cumplidaEn);
  return (
    <View
      style={[estilos.lineaCumplida, { backgroundColor: c.successWash }]}
      accessible
      accessibilityLabel={`${accion.titulo}, cumplida${hora ? ` a las ${hora}` : ''}`}
    >
      <Icon name="check" size={TAMANO_ICONO.chico} color={c.success} />
      <Text style={[t.body, { flex: 1, color: c.textStrong, fontSize: 16 }]}>{accion.titulo}</Text>
      {hora ? <Text style={[t.small, { color: c.textSoft, fontVariant: ['tabular-nums'] }]}>{hora}</Text> : null}
    </View>
  );
}

function TarjetaPendiente({ accion, hoja }: { accion: AccionDelCierre; hoja: ReturnType<typeof useHojaDelCierre> }) {
  const { c, t } = useTheme();
  const respuesta = hoja.borrador.porAccion[accion.id];
  const cuando = accion.horaInicio ? `Era a las ${accion.horaInicio} · quedó pendiente` : 'Quedó pendiente';
  return (
    <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17 }]}>{accion.titulo}</Text>
      <Text style={[t.small, { color: c.textSoft, fontVariant: ['tabular-nums'] }]}>{cuando}</Text>

      <Text style={[t.body, estilos.pregunta, { color: c.textStrong }]}>{PREGUNTA_DEL_MOTIVO}</Text>
      <View style={estilos.chips} accessibilityRole="radiogroup" accessibilityLabel={`${PREGUNTA_DEL_MOTIVO} ${accion.titulo}`}>
        {MOTIVOS.map(m => (
          <ChipDelCierre
            key={m.valor}
            etiqueta={m.texto}
            elegido={respuesta?.motivo === m.valor}
            onPress={() => hoja.elegirMotivo(accion.id, m.valor)}
          />
        ))}
      </View>

      <Text style={[t.body, estilos.pregunta, { color: c.textStrong }]}>{PREGUNTA_DE_MANANA}</Text>
      <View style={estilos.chips} accessibilityRole="radiogroup" accessibilityLabel={`${PREGUNTA_DE_MANANA} ${accion.titulo}`}>
        {PLANES_DE_MANANA.map(p => (
          <ChipDelCierre
            key={p.valor}
            etiqueta={p.texto}
            elegido={respuesta?.manana === p.valor}
            onPress={() => hoja.elegirManana(accion.id, p.valor)}
          />
        ))}
      </View>

      <CampoDeNota
        valor={respuesta?.nota ?? ''}
        alCambiar={nota => hoja.escribirNota(accion.id, nota)}
        etiqueta={`Nota sobre ${accion.titulo}`}
      />
    </View>
  );
}

function CampoDeNota({ valor, alCambiar, etiqueta }: { valor: string; alCambiar: (nota: string) => void; etiqueta: string }) {
  const { c } = useTheme();
  return (
    <TextInput
      value={valor}
      onChangeText={alCambiar}
      placeholder={TEXTO_DEL_CAMPO_DE_NOTA}
      placeholderTextColor={c.tabInactive}
      accessibilityLabel={etiqueta}
      accessibilityHint={`Opcional, hasta ${NOTA_MAXIMA} caracteres`}
      multiline
      style={[estilos.campo, { color: c.textStrong, borderColor: c.border, backgroundColor: c.cardBgAlt }]}
    />
  );
}

/** «Día cerrado»: lo que quedó guardado, con lo que se dijo para mañana. */
function Guardado({ vista }: { vista: CierreDelDia }) {
  const { c, t } = useTheme();
  const pendientes = pendientesDe(vista).filter(a => planEnFrase(a.cierre?.manana));
  return (
    <View style={estilos.guardado} accessibilityLiveRegion="polite">
      <Icon name="checkCircle" size={TAMANO_ICONO.grande} color={c.success} />
      <Text style={[t.screenTitle, { color: c.textStrong, textAlign: 'center' }]}>Día cerrado</Text>
      {pendientes.length > 0 ? (
        <View style={{ gap: 6, alignSelf: 'stretch' }}>
          {pendientes.map(a => (
            <Text key={a.id} style={[t.body, { color: c.textSoft, textAlign: 'center' }]}>
              Mañana: «{a.titulo}», {planEnFrase(a.cierre?.manana)}.
            </Text>
          ))}
        </View>
      ) : (
        <Text style={[t.body, { color: c.textSoft, textAlign: 'center' }]}>Tu día quedó cerrado.</Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { paddingHorizontal: 20, paddingTop: 4, gap: 20 },
  estado: { paddingHorizontal: 20, paddingVertical: 24, gap: 12 },
  lineaCumplida: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 12, borderRadius: 12 },
  tarjeta: { gap: 6, padding: 14, borderWidth: 1, borderRadius: 16 },
  pregunta: { marginTop: 10, fontFamily: 'Jost_700Bold', fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  campo: {
    marginTop: 12,
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'Jost_400Regular',
    textAlignVertical: 'top',
  },
  guardado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 28 },
  enlace: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 48, alignSelf: 'center' },
  textoDelBoton: { fontSize: 16, letterSpacing: 0 },
});
