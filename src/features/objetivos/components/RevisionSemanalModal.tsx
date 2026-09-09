import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { useTheme } from '../../../theme/ThemeContext';
import type { CierreRocaSemanal, EjeObjetivo, RocaSemanalApi } from '../types/objetivos.types';
import { ETIQUETA_EJE } from '../types/objetivos.types';
import { Icon } from '../../../components/Icon';

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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={[estilos.fondo, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}>
          <View style={[estilos.encabezado, { borderBottomColor: c.divider }]}>
            <View style={{ flex: 1 }}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1, fontSize: 12 }]}>
                CERRAR LA SEMANA {eje ? `· ${ETIQUETA_EJE[eje].toUpperCase()}` : ''}
              </Text>
              {!!roca && (
                <Text style={[t.body, { color: c.textStrong, fontSize: 16, marginTop: 4 }]}>{roca.titulo}</Text>
              )}
            </View>
            <Pressable onPress={onCerrar} hitSlop={16} style={estilos.botonCerrar}>
              <Icon name="close" size={18} color={c.textSoft} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18, gap: 18 }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 8 }}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>
                ¿CÓMO TE FUE, DEL 1 AL 10?
              </Text>
              {roca?.autoevaluacionInicio != null && (
                <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>
                  Al empezar te habías puesto {roca.autoevaluacionInicio}.
                </Text>
              )}
              <View style={estilos.escala}>
                {Array.from({ length: AUTOEVALUACION_MAXIMA }, (_, i) => i + 1).map(valor => {
                  const elegido = autoevaluacion === valor;
                  return (
                    <Pressable
                      key={valor}
                      onPress={() => setAutoevaluacion(valor)}
                      style={[
                        estilos.puntoEscala,
                        { borderColor: elegido ? c.gold : c.border, backgroundColor: elegido ? c.gold : c.cardBgAlt },
                      ]}
                    >
                      <Text style={[t.body, { color: elegido ? c.onGold : c.textSoft, fontFamily: 'Jost_700Bold', fontSize: 15 }]}>
                        {valor}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>
                ¿QUÉ TE FRENÓ MÁS?
              </Text>
              <TextInput
                value={bloqueo}
                onChangeText={setBloqueo}
                multiline
                style={[estilos.entrada, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.textStrong }]}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>
                ¿QUÉ VAS A HACER DISTINTO?
              </Text>
              <TextInput
                value={correccion}
                onChangeText={setCorreccion}
                multiline
                style={[estilos.entrada, { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.textStrong }]}
              />
            </View>
          </ScrollView>

          <View style={[estilos.pie, { borderTopColor: c.divider }]}>
            <GoldButton
              label={guardando ? 'GUARDANDO…' : 'GUARDAR MI REVISIÓN'}
              onPress={() => autoevaluacion != null && onGuardar({
                autoevaluacionFin: autoevaluacion,
                bloqueoPrincipal: bloqueo.trim(),
                correccion: correccion.trim(),
              })}
              disabled={!listo || guardando}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'center', padding: 16 },
  tarjeta: { borderRadius: 16, borderWidth: 1, maxHeight: '92%', overflow: 'hidden' },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomWidth: 1 },
  botonCerrar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  entrada: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 88, textAlignVertical: 'top' },
  escala: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  puntoEscala: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pie: { padding: 18, borderTopWidth: 1 },
});
