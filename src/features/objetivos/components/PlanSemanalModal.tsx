import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { GoldButton } from '../../../components/GoldButton';
import { useTheme } from '../../../theme/ThemeContext';
import type { EjeObjetivo, ItemPlanSemanal, RocaMaestraApi } from '../types/objetivos.types';
import { EJES, ETIQUETA_EJE } from '../types/objetivos.types';
import { conPrincipalPrimero } from '../hooks/usePrioridadPrincipal';
import { textoVentanaSemanal } from '../utils/ventanasDePlanificacion';
import { Icon } from '../../../components/Icon';

/**
 * Armar el plan de la semana: **un eje por pantalla**.
 *
 * **Por qué de a uno.** Son tres rocas con seis campos cada una: dieciocho campos juntos son un
 * muro, y el usuario de este programa tiene entre 50 y 60 años. Se avanza de a un eje, igual que el
 * Mapa de Renacimiento con sus vistas. El último paso resume y recién ahí se guarda: el backend
 * crea todas de una sola llamada (`POST /rocks/weekly`), así que guardar eje por eje no sería ni
 * siquiera posible.
 *
 * **Nada bloquea el avance** (2026-09-21, pedido del dueño). Se recorren los cuatro pasos sin
 * escribir una palabra, y se vuelve a cualquiera de ellos. Antes «Siguiente» quedaba apagado hasta
 * llenar el eje que estaba en pantalla, y eso obligaba a completar los cuatro pasos de corrido o
 * cerrar el formulario.
 *
 * **Lo que sí exige el backend, y por eso se pide recién al guardar.** Un título no vacío en el eje
 * principal, y nada más. El botón de guardar se puede tocar siempre, y si falta algo un `Alert` dice
 * **qué** falta y **en qué eje**, que es lo que pide AGENTS.md §5. El obstáculo, la contingencia y
 * la autoevaluación son opcionales de verdad, también al guardar.
 *
 * > **Corregido el 2026-09-22.** Acá decía que `POST /rocks/weekly` abre **los tres ejes de una
 * > sola vez** (`@Size(min = 3, max = 3)`) y que cada uno necesita *"exactamente tres acciones
 * > críticas no vacías"*. Las dos cosas dejaron de ser ciertas el mismo día: alcanza con un eje
 * > (RK-12) y las acciones pasaron al objetivo diario (RK-13, V61). Este formulario pedía doce
 * > campos mínimos; ahora pide uno.
 *
 * **Vocabulario.** En pantalla ya no se dice «roca» sino «objetivo semanal». Los nombres internos
 * —`RocaSemanalApi`, `rocaMaestraId`, `ItemPlanSemanal`, `/rocks/weekly`— NO se tocaron: son el
 * contrato con el backend, que sigue llamándolas rocas.
 */

const AUTOEVALUACION_MINIMA = 1;
const AUTOEVALUACION_MAXIMA = 10;

/** Lo que se está escribiendo para un eje, antes de convertirse en `ItemPlanSemanal`. */
interface BorradorDeEje {
  titulo: string;
  obstaculo: string;
  contingencia: string;
  autoevaluacionInicio: number | null;
}

const BORRADOR_VACIO: BorradorDeEje = {
  titulo: '',
  obstaculo: '',
  contingencia: '',
  autoevaluacionInicio: null,
};

interface PlanSemanalModalProps {
  visible: boolean;
  numeroSemana: number;
  /** Para mostrar, en cada paso, a qué objetivo de 90 días sirve el de esta semana. */
  maestras: RocaMaestraApi[];
  /**
   * El eje que eligió como principal en el Mapa. Va primero y es **el único obligatorio**: los
   * otros dos se suman cuando quiera, no cuando el formulario lo exija.
   */
  ejePrincipal: EjeObjetivo | null;
  guardando: boolean;
  onGuardar: (items: ItemPlanSemanal[]) => void;
  onCerrar: () => void;
}

export function PlanSemanalModal({
  visible,
  numeroSemana,
  maestras,
  ejePrincipal,
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

  /*
   * Se vuelve al paso 1 cada vez que se abre, y se siembran las acciones del Mapa.
   *
   * Reabrir a mitad de camino, con lo escrito de la vez anterior, es más confuso que empezar de
   * nuevo: no hay forma de saber qué quedó a medias. Lo que sí sobrevive es lo que la persona
   * escribió el día 7 — eso no es "a medias", es su plan.
   */
  useEffect(() => {
    if (!visible) return;
    setPaso(0);
    setBorradores({
      CUERPO: { ...BORRADOR_VACIO },
      TRABAJO: { ...BORRADOR_VACIO },
      RELACIONES: { ...BORRADOR_VACIO },
    });
  }, [visible]);

  /* El principal del Mapa va primero: es el que manda y el único que hay que llenar para guardar. */
  const ejesOrdenados = conPrincipalPrimero(EJES, ejePrincipal);
  const ejeObligatorio = ejesOrdenados[0];
  const ejeActual = ejesOrdenados[Math.min(paso, ejesOrdenados.length - 1)];
  const esResumen = paso >= ejesOrdenados.length;
  const borrador = borradores[ejeActual];
  const objetivoDelEje = maestras.find(m => m.eje === ejeActual)?.objetivo ?? null;

  const cambiar = (campo: keyof BorradorDeEje, valor: string | number | null) => {
    setBorradores(previos => ({ ...previos, [ejeActual]: { ...previos[ejeActual], [campo]: valor } }));
  };

  /**
   * Qué le falta a un eje para que el backend lo acepte, dicho como se le diría a la persona.
   * `null` cuando está listo. Es la única fuente de verdad: de acá salen `completo`, el aviso del
   * resumen y el `Alert` de guardar, así que los tres nombran exactamente lo mismo.
   */
  const loQueFalta = (b: BorradorDeEje): string | null =>
    b.titulo.trim() === '' ? 'falta el objetivo de la semana' : null;

  const completo = (b: BorradorDeEje) => loQueFalta(b) === null;

  /** Solo viajan los ejes completos. El backend acepta de 1 a 3 desde el 2026-09-22. */
  const guardar = () => {
    onGuardar(
      ejesOrdenados
        .filter(eje => completo(borradores[eje]))
        .map<ItemPlanSemanal>(eje => {
        const b = borradores[eje];
        return {
          eje,
          titulo: b.titulo.trim(),
          // Vacío se manda como ausente, no como "": el backend guarda el texto tal cual, y una
          // cadena vacía se vería después como un obstáculo escrito que no dice nada.
          obstaculo: b.obstaculo.trim() || undefined,
          contingencia: b.contingencia.trim() || undefined,
          autoevaluacionInicio: b.autoevaluacionInicio ?? undefined,
        };
      })
    );
  };

  /**
   * El botón de guardar se puede tocar siempre.
   *
   * > **Corregido el 2026-09-22.** Antes exigía **los tres ejes** y, si alguno estaba a medias, no
   * > mandaba nada: doce campos mínimos en una sentada, o la semana entera sin armar. El dueño lo
   * > cambió con el criterio del Mapa — alcanza con el eje que la persona eligió como principal, y
   * > los otros dos se suman cuando quiera. El texto decía *"Tu semana se abre con los tres ejes
   * > juntos"*, que ya no es cierto.
   *
   * Los ejes a medias no se mandan (el backend los rechazaría con un 400 igual de mudo), pero
   * tampoco bloquean: se guarda lo que esté completo.
   */
  const intentarGuardar = () => {
    const faltaElPrincipal = loQueFalta(borradores[ejeObligatorio]);
    if (faltaElPrincipal !== null) {
      Alert.alert(
        'Falta poco para guardar tu semana',
        `Con ${ETIQUETA_EJE[ejeObligatorio]} alcanza para abrir la semana, y le ${faltaElPrincipal}.`
          + '\n\nEn el resumen, toca ese eje para volver a él.'
      );
      return;
    }
    guardar();
  };

  const campo = (
    etiqueta: string,
    valor: string,
    alCambiar: (texto: string) => void,
    opciones: { ayuda?: string; largo?: boolean; obligatorio?: boolean } = {}
  ) => (
    <View style={{ gap: 6 }} key={etiqueta}>
      <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>
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
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1, fontSize: 12 }]}>
                PLAN DE LA SEMANA {String(numeroSemana).padStart(2, '0')}
              </Text>
              <Text style={[t.small, { color: c.textSoft, fontSize: 14, marginTop: 2 }]}>
                {esResumen ? 'Revisa antes de guardar' : `Paso ${paso + 1} de ${ejesOrdenados.length + 1} · ${ETIQUETA_EJE[ejeActual]}`}
              </Text>
            </View>
            <Pressable onPress={onCerrar} hitSlop={16} style={estilos.botonCerrar}>
              <Icon name="close" size={18} color={c.textSoft} />
            </Pressable>
          </View>

          {/* Un punto por paso: dónde está y cuánto falta, sin animación ni barra que se mueva. */}
          <View style={estilos.puntos}>
            {[...ejesOrdenados, 'resumen'].map((clave, indice) => (
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
                {ejesOrdenados.map(eje => {
                  const b = borradores[eje];
                  return (
                    <View key={eje} style={[estilos.bloqueResumen, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
                      <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>
                        {ETIQUETA_EJE[eje].toUpperCase()}
                      </Text>
                      <Text style={[t.body, { color: c.textStrong, fontSize: 16, marginTop: 4 }]}>
                        {b.titulo.trim() || 'Sin título'}
                      </Text>
                      {!completo(b) && (
                        <Pressable onPress={() => setPaso(ejesOrdenados.indexOf(eje))} style={estilos.enlaceCompletar} hitSlop={12}>
                          <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 15 }]}>
                            Le {loQueFalta(b)} · toca para volver
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

                {campo('TU OBJETIVO DE ESTA SEMANA', borrador.titulo, texto => cambiar('titulo', texto), {
                  ayuda: 'Lo más importante que vas a mover en este eje en los próximos siete días.',
                  obligatorio: true,
                })}

                {campo('QUÉ PODRÍA IMPEDIRLO', borrador.obstaculo, texto => cambiar('obstaculo', texto), {
                  ayuda: 'El obstáculo más probable. Nombrarlo ahora te ahorra la sorpresa el jueves.',
                  largo: true,
                })}

                {campo('QUÉ HACES SI PASA', borrador.contingencia, texto => cambiar('contingencia', texto), {
                  ayuda: 'Tu plan B, decidido en frío.',
                  largo: true,
                })}

                <View style={{ gap: 8 }}>
                  <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>
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
                              { color: elegido ? c.onGold : c.textSoft, fontFamily: 'Jost_700Bold', fontSize: 15 },
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
                <Text style={[t.body, { color: c.textSoft, fontFamily: 'Jost_700Bold', fontSize: 15 }]}>Atrás</Text>
              </Pressable>
            )}
            <View style={{ flex: 1 }}>
              {esResumen ? (
                /* Sin `disabled` por lo que falte: eso lo resuelve `intentarGuardar` diciendo qué
                   falta. Apagado solo mientras se está guardando, para no mandar dos veces. */
                <GoldButton
                  label={guardando ? 'GUARDANDO…' : 'GUARDAR MI SEMANA'}
                  onPress={intentarGuardar}
                  disabled={guardando}
                />
              ) : (
                /* Nunca apagado: se avanza con el eje vacío y se vuelve después. */
                <GoldButton label="SIGUIENTE" onPress={() => setPaso(p => p + 1)} />
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
