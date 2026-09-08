import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { useTheme } from '../../../theme/ThemeContext';
import type { EjeObjetivo, ItemPlanSemanal, RocaMaestraApi } from '../types/objetivos.types';
import { EJES, ETIQUETA_EJE } from '../types/objetivos.types';
import { textoVentanaSemanal } from '../utils/ventanasDePlanificacion';

/**
 * Armar el plan de la semana: **un eje por pantalla**.
 *
 * **Por qué de a uno.** Son tres rocas con seis campos cada una: dieciocho campos juntos son un
 * muro, y el usuario de este programa tiene entre 50 y 60 años. Se avanza de a un eje, igual que el
 * Mapa de Renacimiento con sus vistas. El último paso resume y recién ahí se guarda: el backend
 * crea las tres de una sola vez (`POST /rocks/weekly`) o ninguna, así que guardar por eje no sería
 * ni siquiera posible.
 *
 * **Qué es obligatorio.** El título y las tres acciones críticas. Las tres, no "hasta tres": la
 * clave primaria de `acciones_criticas` las exige. El obstáculo, la contingencia y la autoevaluación
 * son opcionales — valen mucho, pero pedirlas como requisito haría que alguien abandone en el paso 1.
 */

const AUTOEVALUACION_MINIMA = 1;
const AUTOEVALUACION_MAXIMA = 10;

/** Lo que se está escribiendo para un eje, antes de convertirse en `ItemPlanSemanal`. */
interface BorradorDeEje {
  titulo: string;
  acciones: [string, string, string];
  obstaculo: string;
  contingencia: string;
  autoevaluacionInicio: number | null;
}

const BORRADOR_VACIO: BorradorDeEje = {
  titulo: '',
  acciones: ['', '', ''],
  obstaculo: '',
  contingencia: '',
  autoevaluacionInicio: null,
};

interface PlanSemanalModalProps {
  visible: boolean;
  numeroSemana: number;
  /** Para mostrar, en cada paso, a qué objetivo de 90 días sirve la roca de esta semana. */
  maestras: RocaMaestraApi[];
  guardando: boolean;
  onGuardar: (items: ItemPlanSemanal[]) => void;
  onCerrar: () => void;
}

export function PlanSemanalModal({
  visible,
  numeroSemana,
  maestras,
  guardando,
  onGuardar,
  onCerrar,
}: PlanSemanalModalProps) {
  const { c, t } = useTheme();
  const [paso, setPaso] = useState(0);
  const [borradores, setBorradores] = useState<Record<EjeObjetivo, BorradorDeEje>>(() => ({
    CUERPO: { ...BORRADOR_VACIO },
    TRABAJO: { ...BORRADOR_VACIO },
    RELACIONES: { ...BORRADOR_VACIO },
  }));

  // Se vuelve al paso 1 cada vez que se abre. Reabrir a mitad de camino, con lo escrito de la vez
  // anterior, es más confuso que empezar de nuevo: no hay forma de saber qué quedó a medias.
  useEffect(() => {
    if (visible) setPaso(0);
  }, [visible]);

  const ejeActual = EJES[Math.min(paso, EJES.length - 1)];
  const esResumen = paso >= EJES.length;
  const borrador = borradores[ejeActual];
  const objetivoDelEje = maestras.find(m => m.eje === ejeActual)?.objetivo ?? null;

  const cambiar = (campo: keyof BorradorDeEje, valor: string | number | null) => {
    setBorradores(previos => ({ ...previos, [ejeActual]: { ...previos[ejeActual], [campo]: valor } }));
  };

  const cambiarAccion = (indice: number, texto: string) => {
    setBorradores(previos => {
      const acciones = [...previos[ejeActual].acciones] as [string, string, string];
      acciones[indice] = texto;
      return { ...previos, [ejeActual]: { ...previos[ejeActual], acciones } };
    });
  };

  const completo = (b: BorradorDeEje) => b.titulo.trim() !== '' && b.acciones.every(a => a.trim() !== '');
  const ejeListo = completo(borrador);
  const todosListos = useMemo(() => EJES.every(eje => completo(borradores[eje])), [borradores]);

  const guardar = () => {
    onGuardar(
      EJES.map<ItemPlanSemanal>(eje => {
        const b = borradores[eje];
        return {
          eje,
          titulo: b.titulo.trim(),
          accionCritica1: b.acciones[0].trim(),
          accionCritica2: b.acciones[1].trim(),
          accionCritica3: b.acciones[2].trim(),
          // Vacío se manda como ausente, no como "": el backend guarda el texto tal cual, y una
          // cadena vacía se vería después como un obstáculo escrito que no dice nada.
          obstaculo: b.obstaculo.trim() || undefined,
          contingencia: b.contingencia.trim() || undefined,
          autoevaluacionInicio: b.autoevaluacionInicio ?? undefined,
        };
      })
    );
  };

  const campo = (
    etiqueta: string,
    valor: string,
    alCambiar: (texto: string) => void,
    opciones: { ayuda?: string; largo?: boolean; obligatorio?: boolean } = {}
  ) => (
    <View style={{ gap: 6 }} key={etiqueta}>
      <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 12 }]}>
        {etiqueta}
        {opciones.obligatorio ? '' : '  ·  opcional'}
      </Text>
      {!!opciones.ayuda && (
        <Text style={[t.small, { color: c.textSoft, fontSize: 14, lineHeight: 20 }]}>{opciones.ayuda}</Text>
      )}
      <TextInput
        value={valor}
        onChangeText={alCambiar}
        multiline={opciones.largo}
        placeholder=""
        placeholderTextColor={c.chevron}
        style={[
          estilos.entrada,
          {
            borderColor: c.border,
            backgroundColor: c.cardBgAlt,
            color: c.textStrong,
            minHeight: opciones.largo ? 88 : 52,
            textAlignVertical: opciones.largo ? 'top' : 'center',
          },
        ]}
      />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={[estilos.fondo, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}>
          <View style={[estilos.encabezado, { borderBottomColor: c.divider }]}>
            <View style={{ flex: 1 }}>
              <Text style={[t.micro, { color: c.gold, fontWeight: '800', letterSpacing: 1, fontSize: 12 }]}>
                PLAN DE LA SEMANA {String(numeroSemana).padStart(2, '0')}
              </Text>
              <Text style={[t.small, { color: c.textSoft, fontSize: 14, marginTop: 2 }]}>
                {esResumen ? 'Revisa antes de guardar' : `Paso ${paso + 1} de ${EJES.length + 1} · ${ETIQUETA_EJE[ejeActual]}`}
              </Text>
            </View>
            <Pressable onPress={onCerrar} hitSlop={16} style={estilos.botonCerrar}>
              <Text style={[t.body, { color: c.textSoft, fontSize: 20 }]}>✕</Text>
            </Pressable>
          </View>

          {/* Un punto por paso: dónde está y cuánto falta, sin animación ni barra que se mueva. */}
          <View style={estilos.puntos}>
            {[...EJES, 'resumen'].map((clave, indice) => (
              <View
                key={clave}
                style={[
                  estilos.punto,
                  { backgroundColor: indice <= paso ? c.gold : c.border },
                ]}
              />
            ))}
          </View>

          <ScrollView contentContainerStyle={{ padding: 18, gap: 18 }} keyboardShouldPersistTaps="handled">
            {esResumen ? (
              <>
                {EJES.map(eje => {
                  const b = borradores[eje];
                  return (
                    <View key={eje} style={[estilos.bloqueResumen, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                      <Text style={[t.micro, { color: c.gold, fontWeight: '800', fontSize: 12 }]}>
                        {ETIQUETA_EJE[eje].toUpperCase()}
                      </Text>
                      <Text style={[t.body, { color: c.textStrong, fontSize: 16, marginTop: 4 }]}>
                        {b.titulo.trim() || 'Sin título'}
                      </Text>
                      {b.acciones.map((accion, indice) => (
                        <Text key={indice} style={[t.small, { color: c.textSoft, fontSize: 15, marginTop: 4 }]}>
                          {indice + 1}. {accion.trim() || '—'}
                        </Text>
                      ))}
                      {!completo(b) && (
                        <Pressable onPress={() => setPaso(EJES.indexOf(eje))} style={estilos.enlaceCompletar} hitSlop={12}>
                          <Text style={[t.small, { color: c.gold, fontWeight: '700', fontSize: 15 }]}>
                            Falta completarlo · toca para volver
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
                <Text style={[t.small, { color: c.textSoft, fontSize: 14, lineHeight: 20 }]}>
                  {textoVentanaSemanal()}
                </Text>
              </>
            ) : (
              <>
                {objetivoDelEje ? (
                  <View style={[estilos.recordatorio, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                    <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>TU OBJETIVO DE 90 DÍAS</Text>
                    <Text style={[t.body, { color: c.textStrong, fontSize: 15, marginTop: 4, lineHeight: 21 }]}>
                      {objetivoDelEje}
                    </Text>
                  </View>
                ) : null}

                {campo('LA ROCA DE ESTA SEMANA', borrador.titulo, texto => cambiar('titulo', texto), {
                  ayuda: 'Lo más importante que vas a mover en este eje en los próximos siete días.',
                  obligatorio: true,
                })}

                <View style={{ gap: 10 }}>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 12 }]}>
                    LAS TRES ACCIONES CRÍTICAS
                  </Text>
                  <Text style={[t.small, { color: c.textSoft, fontSize: 14, lineHeight: 20 }]}>
                    Tres, ni más ni menos. Son las que después vas a agendar con hora en tu día.
                  </Text>
                  {borrador.acciones.map((accion, indice) => (
                    <TextInput
                      key={indice}
                      value={accion}
                      onChangeText={texto => cambiarAccion(indice, texto)}
                      placeholder={`Acción ${indice + 1}`}
                      placeholderTextColor={c.chevron}
                      style={[
                        estilos.entrada,
                        { borderColor: c.border, backgroundColor: c.cardBgAlt, color: c.textStrong },
                      ]}
                    />
                  ))}
                </View>

                {campo('QUÉ PODRÍA IMPEDIRLO', borrador.obstaculo, texto => cambiar('obstaculo', texto), {
                  ayuda: 'El obstáculo más probable. Nombrarlo ahora te ahorra la sorpresa el jueves.',
                  largo: true,
                })}

                {campo('QUÉ HACÉS SI PASA', borrador.contingencia, texto => cambiar('contingencia', texto), {
                  ayuda: 'Tu plan B, decidido en frío.',
                  largo: true,
                })}

                <View style={{ gap: 8 }}>
                  <Text style={[t.micro, { color: c.gold, fontWeight: '700', fontSize: 12 }]}>
                    ¿QUÉ TAN CAPAZ TE VES DE CUMPLIRLA?  ·  opcional
                  </Text>
                  <View style={estilos.escala}>
                    {Array.from({ length: AUTOEVALUACION_MAXIMA }, (_, i) => i + AUTOEVALUACION_MINIMA).map(valor => {
                      const elegido = borrador.autoevaluacionInicio === valor;
                      return (
                        <Pressable
                          key={valor}
                          onPress={() => cambiar('autoevaluacionInicio', elegido ? null : valor)}
                          style={[
                            estilos.puntoEscala,
                            { borderColor: elegido ? c.gold : c.border, backgroundColor: elegido ? c.gold : c.cardBgAlt },
                          ]}
                        >
                          <Text
                            style={[
                              t.body,
                              { color: elegido ? c.onGold : c.textSoft, fontWeight: '700', fontSize: 15 },
                            ]}
                          >
                            {valor}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          <View style={[estilos.pie, { borderTopColor: c.divider }]}>
            {paso > 0 && (
              <Pressable onPress={() => setPaso(p => p - 1)} style={estilos.botonAtras} hitSlop={8}>
                <Text style={[t.body, { color: c.textSoft, fontWeight: '700', fontSize: 15 }]}>Atrás</Text>
              </Pressable>
            )}
            <View style={{ flex: 1 }}>
              {esResumen ? (
                <GoldButton
                  label={guardando ? 'GUARDANDO…' : 'GUARDAR MI SEMANA'}
                  onPress={guardar}
                  disabled={!todosListos || guardando}
                />
              ) : (
                <GoldButton
                  label="SIGUIENTE"
                  onPress={() => setPaso(p => p + 1)}
                  disabled={!ejeListo}
                />
              )}
            </View>
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
  // 48×48 es el piso de área táctil del proyecto, y con 50-60 años no es un detalle.
  botonCerrar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  puntos: { flexDirection: 'row', gap: 6, paddingHorizontal: 18, paddingTop: 14 },
  punto: { flex: 1, height: 4, borderRadius: 2 },
  entrada: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 52 },
  recordatorio: { borderWidth: 1, borderRadius: 12, padding: 14 },
  bloqueResumen: { borderWidth: 1, borderRadius: 12, padding: 14 },
  enlaceCompletar: { marginTop: 8, minHeight: 48, justifyContent: 'center' },
  escala: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  puntoEscala: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pie: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderTopWidth: 1 },
  botonAtras: { minWidth: 88, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
