import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Presionable } from '../../../components/Presionable';
import { tacto } from '../../../utils/tacto';
import { useTheme } from '../../../theme/ThemeContext';
import type { CierreRocaSemanal, EjeObjetivo, RocaSemanalApi } from '../types/objetivos.types';
import { ETIQUETA_EJE } from '../types/objetivos.types';

/**
 * Cerrar la semana de un eje: la mitad que casi siempre se saltea.
 *
 * Planificar sin revisar es escribir una lista de deseos cada domingo. El backend obliga a los tres
 * campos (`CerrarSemanaRequest`) justamente por eso: una autoevaluación sin bloqueo ni corrección
 * es un número que no enseña nada.
 *
 * A diferencia de planificar, cerrar **no tiene ventana horaria**: se revisa cuando la persona
 * pueda sentarse a hacerlo.
 */

const AUTOEVALUACION_MAXIMA = 10;

interface RevisionSemanalModalProps {
  visible: boolean;
  eje: EjeObjetivo | null;
  roca: RocaSemanalApi | null;
  guardando: boolean;
  onGuardar: (cierre: CierreRocaSemanal) => void;
  onCerrar: () => void;
}

export function RevisionSemanalModal({
  visible,
  eje,
  roca,
  guardando,
  onGuardar,
  onCerrar,
}: RevisionSemanalModalProps) {
  const { c, t } = useTheme();
  const [autoevaluacion, setAutoevaluacion] = useState<number | null>(null);
  const [bloqueo, setBloqueo] = useState('');
  const [correccion, setCorreccion] = useState('');

  // Al reabrir sobre otra roca hay que partir en limpio: dejar la revisión del eje anterior sería
  // ofrecerle a la persona firmar un texto que no escribió para esta semana.
  useEffect(() => {
    if (!visible) return;
    setAutoevaluacion(roca?.autoevaluacionFin ?? null);
    setBloqueo(roca?.bloqueoPrincipal ?? '');
    setCorreccion(roca?.correccion ?? '');
  }, [visible, roca]);

  const listo = autoevaluacion != null && bloqueo.trim() !== '' && correccion.trim() !== '';

  const elegir = (valor: number) => {
    if (valor !== autoevaluacion) tacto.seleccion();
    setAutoevaluacion(valor);
  };

  /*
   * Hoja desde abajo (2026-10-05) en vez de la ventana centrada, con el mismo contenido. `grande`:
   * son dos campos de texto largos, y con el teclado abierto el cuerpo se acorta y el botón de
   * guardar queda a la vista.
   */
  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={onCerrar}
      titulo={eje ? `Cerrar la semana · ${ETIQUETA_EJE[eje]}` : 'Cerrar la semana'}
      tamano="grande"
      pie={
        <GoldButton
          label={guardando ? 'Guardando…' : 'Guardar mi revisión'}
          onPress={() => autoevaluacion != null && onGuardar({
            autoevaluacionFin: autoevaluacion,
            bloqueoPrincipal: bloqueo.trim(),
            correccion: correccion.trim(),
          })}
          disabled={!listo || guardando}
          textStyle={{ fontSize: 15, letterSpacing: 0 }}
        />
      }
    >
      <ScrollView contentContainerStyle={estilos.cuerpo} keyboardShouldPersistTaps="handled">
        {/* El objetivo entero, en el cuerpo y no como subtítulo: el subtítulo de la hoja va en un
            renglón y lo cortaría. */}
        {!!roca && <Text style={[t.body, { color: c.textStrong, fontSize: 16 }]}>{roca.titulo}</Text>}
        <View style={{ gap: 8 }}>
          <Text style={[t.small, estilos.etiqueta, { color: c.goldInk }]}>¿Cómo te fue, del 1 al 10?</Text>
          {roca?.autoevaluacionInicio != null && (
            <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>
              Al empezar te habías puesto {roca.autoevaluacionInicio}.
            </Text>
          )}
          <View style={estilos.escala} accessibilityRole="radiogroup">
            {Array.from({ length: AUTOEVALUACION_MAXIMA }, (_, i) => i + 1).map(valor => {
              const elegido = autoevaluacion === valor;
              return (
                <Presionable
                  key={valor}
                  onPress={() => elegir(valor)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: elegido }}
                  accessibilityLabel={`${valor}`}
                  style={[
                    estilos.puntoEscala,
                    { borderColor: elegido ? c.gold : c.border, backgroundColor: elegido ? c.gold : c.cardBgAlt },
                  ]}
                >
                  <Text style={[t.body, { color: elegido ? c.onGold : c.textSoft, fontFamily: 'Jost_700Bold', fontSize: 15 }]}>
                    {valor}
                  </Text>
                </Presionable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={[t.small, estilos.etiqueta, { color: c.goldInk }]}>¿Qué te frenó más?</Text>
          <TextInput
            value={bloqueo}
            onChangeText={setBloqueo}
            multiline
            style={[estilos.entrada, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.textStrong }]}
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={[t.small, estilos.etiqueta, { color: c.goldInk }]}>¿Qué vas a hacer distinto?</Text>
          <TextInput
            value={correccion}
            onChangeText={setCorreccion}
            multiline
            style={[estilos.entrada, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.textStrong }]}
          />
        </View>
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, gap: 18 },
  etiqueta: { fontFamily: 'Jost_500Medium', fontSize: 14, letterSpacing: 0 },
  entrada: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 88, textAlignVertical: 'top' },
  escala: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  puntoEscala: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
