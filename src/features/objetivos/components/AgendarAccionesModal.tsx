import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { RuedaHoraPicker } from '../../habits/components/RuedaHoraPicker';
import { useTheme } from '../../../theme/ThemeContext';
import type { useRocasSemanales } from '../hooks/useRocasSemanales';
import type { EjeObjetivo, ItemPlanDiario } from '../types/objetivos.types';
import { EJES, ETIQUETA_EJE } from '../types/objetivos.types';
import { posicionarPorEje } from '../hooks/useRocasDiarias';
import { Icon } from '../../../components/Icon';

/**
 * Elegir qué acciones críticas van hoy, y a qué hora.
 *
 * **De dónde salen las acciones.** No se escriben acá: son las mismas tres que la persona ya
 * definió al armar su semana. Esta pantalla solo decide **cuáles caen hoy y cuándo**, igual que con
 * un hábito. Escribir acciones nuevas acá rompería el hilo entre el objetivo de 90 días y el día.
 *
 * **Por qué máximo tres por eje.** Es el tope del backend, y también la idea: el orden en que se
 * eligen define el color (1ª VERDE, 2ª AMARILLA, 3ª ROJA), y hasta completar la VERDE de un eje las
 * otras dos de ese eje llegan bloqueadas. No es un cupo arbitrario: es Pareto puesto en la agenda.
 *
 * La hora es **opcional**. El programa dio libertad total de horario —hay gente que trabaja de
 * noche y de madrugada—, y una acción sin hora es igual de válida que una agendada.
 *
 * **La rueda va adentro de este modal, no en uno propio.** Un `<Modal>` dentro de otro es la única
 * forma de modal que este repo no usa en ningún lado, y en iOS dos modales encimados se pelean por
 * la pantalla. Elegir la hora reemplaza el contenido: un paso por vez, que además es justo lo que
 * conviene con la audiencia de 50-60 años.
 */

const MAXIMO_POR_EJE = 3;

interface AccionElegida {
  eje: EjeObjetivo;
  titulo: string;
  /** `HH:mm`, o vacío si la persona no le puso hora. */
  hora: string;
}

interface AgendarAccionesModalProps {
  visible: boolean;
  semanal: ReturnType<typeof useRocasSemanales>;
  /**
   * `YYYY-MM-DD` que se va a mandar. Sale del reloj del dispositivo, que es lo único que hay, y
   * **puede no coincidir con el día del participante**: el servidor decide en qué día cae.
   */
  fecha: string;
  guardando: boolean;
  onGuardar: (items: ItemPlanDiario[]) => void;
  onCerrar: () => void;
}

export function AgendarAccionesModal({
  visible,
  semanal,
  fecha,
  guardando,
  onGuardar,
  onCerrar,
}: AgendarAccionesModalProps) {
  const { c, t } = useTheme();
  const [elegidas, setElegidas] = useState<AccionElegida[]>([]);
  const [eligiendoHoraDe, setEligiendoHoraDe] = useState<string | null>(null);
  // Lo que marca la rueda antes de confirmar. Vive acá y no en la rueda porque `RuedaHoraPicker`
  // avisa por `onCambiar` y no guarda nada: es un selector, no un formulario.
  const [horaEnCurso, setHoraEnCurso] = useState({ hora: 6, minuto: 0 });

  useEffect(() => {
    if (visible) setElegidas([]);
  }, [visible]);

  /** Las nueve acciones de la semana, agrupadas por eje. */
  const disponibles = useMemo(
    () =>
      EJES.map(eje => ({ eje, roca: semanal.deEje(eje) })).filter(
        (x): x is { eje: EjeObjetivo; roca: NonNullable<typeof x.roca> } => x.roca !== null
      ),
    [semanal]
  );

  const indiceDe = (eje: EjeObjetivo, titulo: string) =>
    elegidas.findIndex(e => e.eje === eje && e.titulo === titulo);

  const cuantasDe = (eje: EjeObjetivo) => elegidas.filter(e => e.eje === eje).length;

  const alternar = (eje: EjeObjetivo, titulo: string) => {
    const indice = indiceDe(eje, titulo);
    if (indice >= 0) {
      setElegidas(previas => previas.filter((_, i) => i !== indice));
      return;
    }
    if (cuantasDe(eje) >= MAXIMO_POR_EJE) return;
    setElegidas(previas => [...previas, { eje, titulo, hora: '' }]);
  };

  const abrirRueda = (clave: string, horaActual: string) => {
    // `''.split(':')` da `['']` y `Number('')` es 0, no NaN: sin este corte la rueda abría en 00:00
    // para una acción sin hora en vez de en un horario razonable. Se vio probando en el desplegado.
    const [h, m] = horaActual ? horaActual.split(':').map(Number) : [NaN, NaN];
    setHoraEnCurso({
      hora: Number.isFinite(h) ? h : 6,
      // Los pasos de la rueda son de 5 minutos: se redondea al más cercano para no arrancar en un
      // valor que la rueda no puede representar.
      minuto: Number.isFinite(m) ? (Math.round(m / 5) * 5) % 60 : 0,
    });
    setEligiendoHoraDe(clave);
  };

  const confirmarHora = () => {
    const texto = `${String(horaEnCurso.hora).padStart(2, '0')}:${String(horaEnCurso.minuto).padStart(2, '0')}`;
    setElegidas(previas =>
      previas.map(e => (`${e.eje}|${e.titulo}` === eligiendoHoraDe ? { ...e, hora: texto } : e))
    );
    setEligiendoHoraDe(null);
  };

  const quitarHora = () => {
    setElegidas(previas => previas.map(e => (`${e.eje}|${e.titulo}` === eligiendoHoraDe ? { ...e, hora: '' } : e)));
    setEligiendoHoraDe(null);
  };

  const guardar = () => {
    onGuardar(
      posicionarPorEje(
        elegidas.map(e => ({
          eje: e.eje,
          titulo: e.titulo,
          // El backend guarda `LocalTime`; sin segundos lo parsea igual. Sin hora va ausente, no "".
          horaInicio: e.hora || undefined,
        }))
      )
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={[estilos.fondo, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}>
          <View style={[estilos.encabezado, { borderBottomColor: c.divider }]}>
            <View style={{ flex: 1 }}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1, fontSize: 12 }]}>
                {eligiendoHoraDe ? 'ELEGIR HORA' : 'AGENDAR MIS ACCIONES'}
              </Text>
              <Text style={[t.small, { color: c.textSoft, fontSize: 14, marginTop: 2 }]} numberOfLines={2}>
                {eligiendoHoraDe ? eligiendoHoraDe.split('|')[1] : 'Elige hasta tres por eje. La hora es opcional.'}
              </Text>
            </View>
            <Pressable
              onPress={() => (eligiendoHoraDe ? setEligiendoHoraDe(null) : onCerrar())}
              hitSlop={16}
              style={estilos.botonCerrar}
            >
              <Icon name="close" size={18} color={c.textSoft} />
            </Pressable>
          </View>

          {eligiendoHoraDe ? (
            <View style={{ padding: 18, gap: 14 }}>
              <Text style={[t.body, { color: c.textStrong, fontSize: 30, textAlign: 'center' }]}>
                {String(horaEnCurso.hora).padStart(2, '0')}:{String(horaEnCurso.minuto).padStart(2, '0')}
              </Text>
              <RuedaHoraPicker
                horaInicial={horaEnCurso.hora}
                minutoInicial={horaEnCurso.minuto}
                onCambiar={(hora, minuto) => setHoraEnCurso({ hora, minuto })}
              />
              <Pressable onPress={quitarHora} style={[estilos.botonHora, { borderColor: c.border, marginLeft: 0 }]}>
                <Text style={[t.body, { color: c.textSoft, fontSize: 15 }]}>Dejarla sin hora</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 18, gap: 18 }}>
              {disponibles.map(({ eje, roca }) => (
                <View key={eje} style={{ gap: 10 }}>
                  <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>
                    {ETIQUETA_EJE[eje].toUpperCase()}  ·  {cuantasDe(eje)}/{MAXIMO_POR_EJE}
                  </Text>
                  <Text style={[t.small, { color: c.textSoft, fontSize: 14, lineHeight: 20 }]}>{roca.titulo}</Text>
                  {roca.accionesCriticas.map(accion => {
                    const indice = indiceDe(eje, accion);
                    const elegida = indice >= 0;
                    const clave = `${eje}|${accion}`;
                    const hora = elegida ? elegidas[indice].hora : '';
                    const tope = !elegida && cuantasDe(eje) >= MAXIMO_POR_EJE;
                    return (
                      <View key={accion} style={{ gap: 6 }}>
                        <Pressable
                          onPress={() => alternar(eje, accion)}
                          disabled={tope}
                          style={[
                            estilos.opcion,
                            {
                              borderColor: elegida ? c.gold : c.border,
                              backgroundColor: elegida ? c.cardBgAlt : c.cardBg,
                              opacity: tope ? 0.45 : 1,
                            },
                          ]}
                        >
                          <View
                            style={[
                              estilos.casilla,
                              { borderColor: elegida ? c.gold : c.border, backgroundColor: elegida ? c.gold : 'transparent' },
                            ]}
                          >
                            {elegida && <Text style={{ color: c.onGold, fontSize: 14, fontFamily: 'Jost_700Bold' }}>✓</Text>}
                          </View>
                          <Text style={[t.body, { color: c.textStrong, fontSize: 15, flex: 1, lineHeight: 21 }]}>
                            {accion}
                          </Text>
                        </Pressable>
                        {elegida && (
                          <Pressable
                            onPress={() => abrirRueda(clave, hora)}
                            style={[estilos.botonHora, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}
                          >
                            <Text style={[t.body, { color: hora ? c.goldInk : c.textSoft, fontSize: 15, fontFamily: 'Jost_700Bold' }]}>
                              {hora ? `A las ${hora}` : 'Ponerle hora (opcional)'}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          )}

          <View style={[estilos.pie, { borderTopColor: c.divider }]}>
            {eligiendoHoraDe ? (
              <GoldButton label="LISTO" onPress={confirmarHora} />
            ) : (
              <GoldButton
                label={guardando ? 'AGENDANDO…' : `AGENDAR ${elegidas.length > 0 ? `(${elegidas.length})` : ''}`.trim()}
                onPress={guardar}
                disabled={elegidas.length === 0 || guardando}
              />
            )}
            {!eligiendoHoraDe && (
              <Text style={[t.small, { color: c.textSoft, fontSize: 13, marginTop: 8, textAlign: 'center' }]}>
                {/* Se muestra la fecha exacta que se va a mandar, en vez de decir "hoy": el
                  dispositivo puede estar en otro día que el participante. */}
              Se agendan para el {fecha} y aparecen en Entrenamiento, en Vida y Negocio
              </Text>
            )}
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
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 56 },
  casilla: { width: 26, height: 26, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  botonHora: { minHeight: 48, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 38 },
  pie: { padding: 18, borderTopWidth: 1 },
});
