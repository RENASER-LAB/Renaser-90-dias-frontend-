import { fuentes } from '../../../theme/fuentes';
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { Alert } from '../../../components/Alerta';
import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { GoldButton } from '../../../components/GoldButton';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { space } from '../../../theme/tokens';
import { CURVA_SALIDA, DURACION_MS } from '../../../theme/movimiento';
import { tacto } from '../../../utils/tacto';
import type { UsoDeLaOferta } from '../hooks/useOfertaDeRepetirSemana';
import { fraseDeLaConfirmacion, fraseDeLaOferta, fraseDeLaSemana, resumenCorto } from '../utils/ofertaDeRepetir';
import { HojaDeRepetirSemana } from './HojaDeRepetirSemana';

/** La tarjeta entra con un fundido de las de siempre (ocasional: no se ve todos los días); con «reducir movimiento», al instante. */
const ENTRADA = FadeIn.duration(DURACION_MS.paso).easing(CURVA_SALIDA).reduceMotion(ReduceMotion.System);

/**
 * «Repetir tu semana» (spec 028, decisión del dueño 028-1 A), arriba de las dimensiones de «Tus prácticas».
 *
 * Tres estados, y solo uno a la vez:
 * - **La oferta**: «Tu semana del 26 oct al 1 nov, en la del 2 al 8 nov», con «Repetir», «Ahora no» y «Ver qué se repite». Si
 *   repetir reemplaza cambios que la persona ya hizo, «Repetir» abre el resumen (con su confirmación explícita) en vez de mandar.
 * - **Recién repetida**: «Tu semana del 2 al 8 nov quedó como esta» con «Deshacer» (FR-013). Es la confirmación en línea de la oferta.
 * - **Repetida antes** (se recuerda hasta que esa semana termina): «Volver al plan de siempre», con una pregunta antes.
 *
 * Mientras no se sabe (`lectura: 'cargando'`), o si no hay nada que ofrecer, no dibuja nada: ni un marco vacío ni un parpadeo.
 */
export function OfertaDeRepetirSemana({ uso }: { uso: UsoDeLaOferta }) {
  const { c, t } = useTheme();
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const [pidioConfirmar, setPidioConfirmar] = useState(false);
  /** La semana que se acaba de repetir en ESTA visita: se dice «quedó como esta» y se puede deshacer sin preguntar. */
  const [recien, setRecien] = useState<string | null>(null);
  const [deshecha, setDeshecha] = useState<{ clave: number; texto: string } | null>(null);

  const oferta = uso.oferta;
  /* La hoja se queda con la última oferta que vio: al repetir, la oferta se va y la hoja tiene que poder bajar con su contenido. */
  const ultimaOferta = useRef(oferta);
  if (oferta) ultimaOferta.current = oferta;

  const repetir = async (replace: boolean) => {
    const resultado = await uso.repetir(replace);
    if (resultado.ok) {
      tacto.logro();
      setHojaAbierta(false);
      setPidioConfirmar(false);
      setRecien(resultado.resultado.targetWeekStart);
      return;
    }
    if (resultado.motivo === 'confirmar') {
      // El servidor ve cambios propios que reemplazaría y la oferta no lo decía: se abre el resumen para confirmarlo.
      setPidioConfirmar(true);
      setHojaAbierta(true);
      return;
    }
    Alert.alert('No pudimos repetir tu semana', resultado.mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Reintentar', onPress: () => void repetir(replace) },
    ]);
  };

  const alTocarRepetir = () => {
    // Reemplazar lo ya cambiado pide el resumen y el segundo toque; lo demás es un toque.
    if (oferta?.replacesOwnChanges) {
      setPidioConfirmar(false);
      setHojaAbierta(true);
      return;
    }
    void repetir(false);
  };

  const deshacer = async () => {
    const semana = uso.repetida?.semana;
    const resultado = await uso.deshacer();
    if (resultado.ok) {
      tacto.logro();
      setRecien(null);
      if (semana) setDeshecha({ clave: Date.now(), texto: `Tu semana del ${fraseDeLaSemana(semana)} volvió al plan de siempre` });
      return;
    }
    Alert.alert('No pudimos volver al plan de siempre', resultado.mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Reintentar', onPress: () => void deshacer() },
    ]);
  };

  const preguntarAntesDeDeshacer = () => {
    Alert.alert(
      '¿Volver al plan de siempre?',
      'Tu semana vuelve a tu plan de siempre, y se pierden los cambios que hiciste solo para esa semana.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Volver al plan de siempre', onPress: () => void deshacer() },
      ],
    );
  };

  if (uso.lectura === 'cargando') return null;

  // Ya repetida: la confirmación (con «Deshacer») o, otro día, la línea de «Volver al plan de siempre».
  const repetida = uso.repetida && !oferta ? uso.repetida : null;
  const esRecien = repetida !== null && recien === repetida.semana;

  return (
    <>
      {deshecha ? (
        <ConfirmacionEnLinea key={deshecha.clave} texto={deshecha.texto} onTerminar={() => setDeshecha(null)} />
      ) : null}

      {repetida ? (
        <Animated.View
          entering={ENTRADA}
          accessibilityLiveRegion="polite"
          style={[estilos.repetida, { backgroundColor: c.goldWash, borderColor: c.border }]}
        >
          <View style={[estilos.marca, { backgroundColor: c.gold }]}>
            <Icon name="check" size={TAMANO_ICONO.chico} color={c.onGold} />
          </View>
          <Text style={[t.small, estilos.textoRepetida, { color: c.textStrong }]}>
            {esRecien
              ? fraseDeLaConfirmacion(repetida.semana)
              : `Tu semana del ${fraseDeLaSemana(repetida.semana)} se repitió de la anterior`}
          </Text>
          <Presionable
            onPress={esRecien ? () => void deshacer() : preguntarAntesDeDeshacer}
            disabled={uso.enviando}
            accessibilityRole="button"
            accessibilityLabel={esRecien ? 'Deshacer: volver al plan de siempre' : 'Volver al plan de siempre'}
            hitSlop={8}
            style={estilos.accion}
          >
            <Text style={[t.small, { color: c.goldInk, fontFamily: fuentes.negrita, textDecorationLine: 'underline' }]}>
              {esRecien ? 'Deshacer' : 'Volver al plan de siempre'}
            </Text>
          </Presionable>
        </Animated.View>
      ) : null}

      {oferta ? (
        <Animated.View
          entering={ENTRADA}
          testID="oferta-de-repetir-semana"
          style={[estilos.tarjeta, { borderColor: c.gold, backgroundColor: c.cardBg }]}
        >
          <View style={estilos.cabecera}>
            <View style={[estilos.medallon, { backgroundColor: c.goldWash }]}>
              <Icon name="calendarRange" size={TAMANO_ICONO.normal} color={c.goldInk} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 17, lineHeight: 22 }]}>Repetir tu semana</Text>
              <Text style={[t.body, { color: c.textSoft, fontSize: 15, lineHeight: 21 }]}>{fraseDeLaOferta(oferta)}</Text>
              <Text style={[t.small, { color: c.textSoft }]}>
                {resumenCorto(oferta)}
                {oferta.replacesOwnChanges ? ' · reemplaza lo que ya cambiaste' : ''}
              </Text>
            </View>
          </View>
          <View style={estilos.botones}>
            <GoldButton
              label={uso.enviando ? 'Repitiendo…' : 'Repetir'}
              onPress={alTocarRepetir}
              disabled={uso.enviando}
              textStyle={{ fontSize: 16, letterSpacing: 0 }}
              style={estilos.repetir}
            />
            <Presionable
              onPress={() => void uso.descartar()}
              disabled={uso.enviando}
              accessibilityRole="button"
              accessibilityLabel="Ahora no repetir la semana"
              style={estilos.ahoraNo}
            >
              <Text style={[t.body, { color: c.goldInk, fontFamily: fuentes.media, fontSize: 16 }]}>Ahora no</Text>
            </Presionable>
          </View>
          <Presionable
            onPress={() => {
              setPidioConfirmar(false);
              setHojaAbierta(true);
            }}
            accessibilityRole="button"
            style={estilos.ver}
          >
            <Text style={[t.small, { color: c.textSoft, textDecorationLine: 'underline', fontSize: 15 }]}>Ver qué se repite</Text>
            <Icon name="chevron" size={TAMANO_ICONO.chico} color={c.chevron} />
          </Presionable>
        </Animated.View>
      ) : null}

      {/* La hoja existe solo con una oferta: sin ella no hay nada que resumir (y no se monta nada de más). */}
      {ultimaOferta.current ? (
        <HojaDeRepetirSemana
          visible={hojaAbierta}
          oferta={ultimaOferta.current}
          enviando={uso.enviando}
          pedirConfirmacion={pidioConfirmar}
          alCerrar={() => {
            setHojaAbierta(false);
            setPidioConfirmar(false);
          }}
          alRepetir={replace => void repetir(replace)}
        />
      ) : null}
    </>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: space.radius, padding: space.cardPad, gap: 12 },
  cabecera: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  medallon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  botones: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  repetir: { minWidth: 140, minHeight: 48, flexGrow: 1 },
  ahoraNo: { minHeight: 48, minWidth: 96, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  ver: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  repetida: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, minHeight: 48, flexWrap: 'wrap' },
  marca: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  textoRepetida: { flex: 1, minWidth: 160, fontFamily: fuentes.media, fontSize: 14, lineHeight: 20 },
  accion: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 },
});
