import { fuentes } from '../../../theme/fuentes';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { useTheme } from '../../../theme/ThemeContext';
import type { OfertaDeRepetirApi } from '../../habits/types/habits.types';
import { fraseDeLaOferta, motivoDeExclusion, resumenCorto, resumenDeLaOferta } from '../utils/ofertaDeRepetir';

/**
 * «Qué se repite» (spec 028): el resumen, hábito por hábito, de lo que la semana siguiente va a tomar de la semana en curso —los días y
 * qué cambia: hora, aviso, «no va» o cómo suena—, los hábitos que se dejan afuera con su motivo y, con «Repetir», el envío.
 *
 * Si la repetición reemplaza cambios que la persona ya hizo en esa semana (`replacesOwnChanges`), el aviso es claro y hace falta un
 * SEGUNDO toque explícito antes de mandar `replace: true`: nunca se pisa en silencio (FR-007). Es una hoja desde abajo de las de
 * siempre: se cierra arrastrando, con la ✕, tocando afuera o con el atrás del sistema.
 */
export function HojaDeRepetirSemana({
  visible,
  oferta,
  enviando,
  pedirConfirmacion,
  alCerrar,
  alRepetir,
}: {
  visible: boolean;
  oferta: OfertaDeRepetirApi | null;
  enviando: boolean;
  /** El servidor pidió confirmar (409) aunque la oferta no lo avisara: la hoja abre directo en la confirmación. */
  pedirConfirmacion: boolean;
  alCerrar: () => void;
  /** `replace` va en `true` solo después de la confirmación explícita. */
  alRepetir: (replace: boolean) => void;
}) {
  const { c, t } = useTheme();
  const [confirmando, setConfirmando] = useState(false);

  // Cada vez que se abre, vuelve a empezar: la confirmación de una vez no vale para la siguiente.
  useEffect(() => {
    if (visible) setConfirmando(pedirConfirmacion);
  }, [visible, pedirConfirmacion]);

  const reemplaza = oferta?.replacesOwnChanges === true || pedirConfirmacion;
  const resumen = oferta ? resumenDeLaOferta(oferta) : [];

  const alTocarRepetir = () => {
    if (reemplaza && !confirmando) {
      setConfirmando(true);
      return;
    }
    alRepetir(reemplaza);
  };

  const pie = oferta ? (
    <View style={{ gap: 8, width: '100%' }}>
      {confirmando ? (
        <Text accessibilityLiveRegion="polite" style={[t.body, { color: c.textStrong, fontFamily: fuentes.media, fontSize: 16 }]}>
          Esto reemplaza lo que ya cambiaste en esa semana. ¿Lo reemplazamos?
        </Text>
      ) : null}
      <GoldButton
        label={enviando ? 'Repitiendo…' : confirmando ? 'Sí, reemplazar y repetir' : 'Repetir'}
        onPress={alTocarRepetir}
        disabled={enviando}
        textStyle={{ fontSize: 16, letterSpacing: 0 }}
        style={{ width: '100%' }}
      />
      {confirmando ? (
        <Presionable
          onPress={() => (pedirConfirmacion ? alCerrar() : setConfirmando(false))}
          accessibilityRole="button"
          disabled={enviando}
          style={estilos.cancelar}
        >
          <Text style={[t.body, { color: c.goldInk, fontFamily: fuentes.media, fontSize: 16 }]}>No reemplazar</Text>
        </Presionable>
      ) : null}
    </View>
  ) : undefined;

  return (
    <HojaDesdeAbajo
      visible={visible && oferta !== null}
      alCerrar={alCerrar}
      titulo="Qué se repite"
      subtitulo={oferta ? fraseDeLaOferta(oferta) : undefined}
      tamano="grande"
      etiquetaCerrar="Cerrar el resumen"
      pie={pie}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.contenido}
      >
        {oferta ? (
          <>
            <Text style={[t.body, { color: c.textSoft }]}>{resumenCorto(oferta)}. Tu plan de siempre y lo ya registrado no cambian.</Text>

            {reemplaza ? (
              <View style={[estilos.aviso, { borderColor: c.gold, backgroundColor: c.goldWash }]}>
                <Icon name="clock" size={TAMANO_ICONO.normal} color={c.goldInk} />
                <Text style={[t.body, estilos.textoDelAviso, { color: c.textStrong }]}>
                  Reemplaza lo que ya cambiaste esa semana. Te lo vamos a confirmar antes de guardar.
                </Text>
              </View>
            ) : null}

            {resumen.map(h => (
              <View key={h.habitId} style={[estilos.habito, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                <Text style={[t.body, { color: c.textStrong, fontFamily: fuentes.media, fontSize: 17 }]}>{h.titulo}</Text>
                {h.dias.map(d => (
                  <View key={d.dia} style={estilos.dia} accessible accessibilityLabel={`${d.dia}: ${d.texto}${d.reemplaza ? ', reemplaza un cambio tuyo' : ''}`}>
                    <Text style={[t.small, estilos.nombreDelDia, { color: c.goldInk }]}>{d.dia}</Text>
                    <Text style={[t.small, estilos.textoDelDia, { color: c.textSoft }]}>
                      {d.texto}
                      {d.reemplaza ? ' · reemplaza lo tuyo' : ''}
                    </Text>
                  </View>
                ))}
              </View>
            ))}

            {oferta.excluded.length > 0 ? (
              <View style={{ gap: 6 }}>
                <Text style={[t.body, { color: c.textStrong, fontFamily: fuentes.media }]}>Se quedan afuera</Text>
                {oferta.excluded.map(x => (
                  <Text key={x.habitId} style={[t.small, { color: c.textSoft }]}>
                    {x.title}: {motivoDeExclusion(x.reason)}
                  </Text>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  contenido: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16, gap: 12 },
  aviso: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  textoDelAviso: { flex: 1, fontSize: 15, lineHeight: 21 },
  habito: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  dia: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', minHeight: 24 },
  nombreDelDia: { width: 34, fontFamily: fuentes.negrita, fontSize: 14, lineHeight: 20 },
  textoDelDia: { flex: 1, fontSize: 15, lineHeight: 20 },
  cancelar: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
