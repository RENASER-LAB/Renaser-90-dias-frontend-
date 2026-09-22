import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { RuedaHoraPicker } from '../../habits/components/RuedaHoraPicker';
import { useTheme } from '../../../theme/ThemeContext';
import type { useRocasSemanales } from '../hooks/useRocasSemanales';
import type { EjeObjetivo, ItemPlanDiario } from '../types/objetivos.types';
import { EJES, ETIQUETA_EJE } from '../types/objetivos.types';
import type { AccionDelMapa, AccionesPorEje } from '../../mapa-renacimiento/hooks/useAccionesDelMapa';
import { diasEscritos, tocaHoy } from '../../mapa-renacimiento/hooks/useAccionesDelMapa';
import { FilaDeDiasDelPlan } from '../../habits/components/FilaDeDiasDelPlan';
import { DIAS_DEL_PLAN, fechasIsoDeLaSemana, type DiaDelPlan } from '../../habits/utils/semanaDelPlan';
import { diaAgendable } from '../utils/ventanasDePlanificacion';
import { posicionarPorEje } from '../hooks/useRocasDiarias';
import { Icon } from '../../../components/Icon';

/**
 * Elegir qué acciones críticas van hoy, y a qué hora.
 *
 * **De dónde salen las acciones.** No se escriben acá: son las que la persona declaró en el Mapa
 * el día 7. Esta pantalla solo decide **cuáles caen hoy y cuándo**, igual que con un hábito.
 * Escribir acciones nuevas acá rompería el hilo entre el objetivo de 90 días y el día.
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

/** `2026-09-23` → `MIÉ`. Reusa `fechasIsoDeLaSemana` para no recalcular el lunes por otro lado. */
function diaDeLaFecha(fechaIso: string): DiaDelPlan {
  const fechas = fechasIsoDeLaSemana();
  return DIAS_DEL_PLAN.find(d => fechas[d] === fechaIso) ?? DIAS_DEL_PLAN[0];
}

/** Todos los días existen para una acción: el candado lo pone `diaAgendable`, no el catálogo. */
const TODOS_LOS_DIAS: Record<DiaDelPlan, boolean> = DIAS_DEL_PLAN.reduce(
  (acc, dia) => ({ ...acc, [dia]: true }),
  {} as Record<DiaDelPlan, boolean>
);

/** Hasta tres pasos por objetivo del día. Mismo tope que el backend (`AccionDiaria.MAXIMO`). */
const MAXIMO_PASOS = 3;

interface AccionElegida {
  eje: EjeObjetivo;
  titulo: string;
  /** `HH:mm`, o vacío si la persona no le puso hora. */
  hora: string;
  /**
   * Los pasos con los que se logra ese objetivo del día. **Arranca vacío y es opcional.**
   *
   * Un objetivo puede ser una sola cosa que no necesita desglose ("pesarme en ayunas"), y obligar a
   * escribir tres es lo que llevaba a rellenar por rellenar — el motivo por el que dejaron de ser
   * obligatorias al bajar del nivel semanal al diario (V61).
   */
  pasos: string[];
}

interface AgendarAccionesModalProps {
  visible: boolean;
  semanal: ReturnType<typeof useRocasSemanales>;
  /**
   * `YYYY-MM-DD` que se va a mandar. Sale del reloj del dispositivo, que es lo único que hay, y
   * **puede no coincidir con el día del participante**: el servidor decide en qué día cae.
   */
  /**
   * La fecha que se propone al abrir. Deja de ser el destino fijo: la persona elige el día en la
   * fila de arriba y puede agendar cualquier día que quede de la semana.
   */
  fecha: string;
  /** Las acciones del Mapa, por eje: de ahí sale lo que se puede agendar. Ver `disponibles`. */
  accionesDelMapa: AccionesPorEje;
  guardando: boolean;
  onGuardar: (items: ItemPlanDiario[], fecha: string) => void;
  onCerrar: () => void;
}

export function AgendarAccionesModal({
  visible,
  semanal,
  fecha,
  accionesDelMapa,
  guardando,
  onGuardar,
  onCerrar,
}: AgendarAccionesModalProps) {
  const { c, t } = useTheme();
  const [elegidas, setElegidas] = useState<AccionElegida[]>([]);
  const [eligiendoHoraDe, setEligiendoHoraDe] = useState<string | null>(null);
  /**
   * El día que se está agendando. Arranca en el que propone el servidor de reglas (`fecha`), o sea
   * hoy antes de las 18:00 y mañana después.
   */
  const [diaElegido, setDiaElegido] = useState<DiaDelPlan>(() => diaDeLaFecha(fecha));
  const fechasIso = fechasIsoDeLaSemana();
  const fechaAGuardar = fechasIso[diaElegido] ?? fecha;
  // Lo que marca la rueda antes de confirmar. Vive acá y no en la rueda porque `RuedaHoraPicker`
  // avisa por `onCambiar` y no guarda nada: es un selector, no un formulario.
  const [horaEnCurso, setHoraEnCurso] = useState({ hora: 6, minuto: 0 });

  /**
   * Al abrir vienen marcadas **las que tocan hoy**, según los días que la persona le puso a cada
   * acción en el Mapa.
   *
   * Es lo mismo que hace Training: no te pregunta qué hábitos van hoy, lo sabe por su horario. Acá
   * el horario ya estaba —`Caminar 40 minutos, 3×/semana, L·X·V`— y no lo miraba nadie; la persona
   * tenía que acordarse y tildarlas a mano todos los días. Pedido del dueño: *"dale con lo de los
   * días del mapa, tipo training"*.
   *
   * **Marcadas, no impuestas.** Se pueden destildar, y se puede agregar una que hoy no tocaba: un
   * martes libre es un buen día para adelantar algo. Lo que cambia es de qué lado empieza el
   * trabajo.
   */
  useEffect(() => {
    if (!visible) return;
    const deHoy: AccionElegida[] = [];
    for (const eje of EJES) {
      for (const accion of aElegirDe(eje)) {
        if (semanal.deEje(eje) && tocaHoy(accion) && deHoy.filter(e => e.eje === eje).length < MAXIMO_POR_EJE) {
          deHoy.push({ eje, titulo: accion.texto, hora: '', pasos: [] });
        }
      }
    }
    setElegidas(deHoy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, accionesDelMapa]);

  /**
   * Lo que se puede agendar hoy, por eje: el objetivo de la semana y las acciones entre las que
   * elegir.
   *
   * > **Corregido el 2026-09-22.** Las acciones salían de `roca.accionesCriticas`, las tres que se
   * > escribían el domingo. Pasaron al objetivo diario (V61), así que una semana nueva llega **sin
   * > ninguna** y esta pantalla quedaba vacía: nadie podía planificar su día. Ahora salen del Mapa,
   * > que es de donde la persona las sacaba igual, y las de la semana se siguen ofreciendo para los
   * > planes viejos que las tienen.
   */
  const disponibles = useMemo(
    () =>
      EJES.map(eje => ({ eje, roca: semanal.deEje(eje), acciones: aElegirDe(eje) }))
        .filter(
          (x): x is { eje: EjeObjetivo; roca: NonNullable<typeof x.roca>; acciones: AccionDelMapa[] } =>
            x.roca !== null && x.acciones.length > 0
        ),
    [semanal, accionesDelMapa]
  );

  /**
   * Las del Mapa primero —son las que la persona eligió sostener— y después las de la semana, sin
   * repetir. Así quien ya tenía un plan semanal viejo sigue viendo lo suyo.
   *
   * Las del Mapa traen sus días; las viejas de la semana no tenían ninguno y por eso van sin.
   */
  function aElegirDe(eje: EjeObjetivo): AccionDelMapa[] {
    const delMapa = accionesDelMapa[eje] ?? [];
    const textosDelMapa = delMapa.map(a => a.texto);
    const deLaSemana = (semanal.deEje(eje)?.accionesCriticas ?? [])
      .filter(a => !textosDelMapa.includes(a))
      .map(texto => ({ texto, dias: [], frecuenciaSemanal: 0 }));
    return [...delMapa, ...deLaSemana];
  }

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
    setElegidas(previas => [...previas, { eje, titulo, hora: '', pasos: [] }]);
  };

  /** Agrega un campo de paso vacío a ese objetivo, hasta el tope. */
  const agregarPaso = (clave: string) => {
    setElegidas(previas =>
      previas.map(e =>
        `${e.eje}|${e.titulo}` === clave && e.pasos.length < MAXIMO_PASOS
          ? { ...e, pasos: [...e.pasos, ''] }
          : e
      )
    );
  };

  const cambiarPaso = (clave: string, indice: number, texto: string) => {
    setElegidas(previas =>
      previas.map(e => {
        if (`${e.eje}|${e.titulo}` !== clave) return e;
        const pasos = [...e.pasos];
        pasos[indice] = texto;
        return { ...e, pasos };
      })
    );
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
          /* Los pasos en blanco se saltean acá y no en el servidor: un campo vacío es "no escribí
             nada", no "un paso sin texto" — que el dominio rechazaría con un 400. */
          acciones: e.pasos.map(p => p.trim()).filter(p => p !== ''),
        }))
      ),
      fechaAGuardar
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
              {/* QUÉ DÍA. La misma fila que el planificador de hábitos de Training —el dueño pidió
                  esa interfaz— pero con la regla de las acciones: hoy SÍ se agenda mientras la
                  ventana nocturna no haya abierto. Ver `diaAgendable`. */}
              <View style={{ gap: 4 }}>
                <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>
                  ¿QUÉ DÍA?
                </Text>
                <FilaDeDiasDelPlan
                  corre={TODOS_LOS_DIAS}
                  enEdicion={[diaElegido]}
                  planificable={dia => diaAgendable(dia)}
                  onAlternarDia={setDiaElegido}
                />
                <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5, marginTop: 5, lineHeight: 14 }]}>
                  Puedes agendar cualquier día que quede de la semana, y corregirlo hasta que llegue.
                  La semana que viene se arma el domingo.
                </Text>
              </View>

              {disponibles.map(({ eje, roca, acciones }) => (
                <View key={eje} style={{ gap: 10 }}>
                  <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 12 }]}>
                    {ETIQUETA_EJE[eje].toUpperCase()}  ·  {cuantasDe(eje)}/{MAXIMO_POR_EJE}
                  </Text>
                  <Text style={[t.small, { color: c.textSoft, fontSize: 14, lineHeight: 20 }]}>{roca.titulo}</Text>
                  {acciones.map(accion => {
                    const indice = indiceDe(eje, accion.texto);
                    const elegida = indice >= 0;
                    const clave = `${eje}|${accion.texto}`;
                    const hora = elegida ? elegidas[indice].hora : '';
                    const pasos = elegida ? elegidas[indice].pasos : [];
                    const tope = !elegida && cuantasDe(eje) >= MAXIMO_POR_EJE;
                    const dias = diasEscritos(accion.dias);
                    return (
                      <View key={accion.texto} style={{ gap: 6 }}>
                        <Pressable
                          onPress={() => alternar(eje, accion.texto)}
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
                          <View style={{ flex: 1 }}>
                            <Text style={[t.body, { color: c.textStrong, fontSize: 15, lineHeight: 21 }]}>
                              {accion.texto}
                            </Text>
                            {/* El ritmo que la persona le puso en el Mapa. Sin esto, "por qué viene
                                marcada" no se puede contestar mirando la pantalla. */}
                            {!!dias && (
                              <Text style={[t.micro, { color: tocaHoy(accion) ? c.goldInk : c.micro, fontSize: 12, marginTop: 2 }]}>
                                {dias}{tocaHoy(accion) ? '  ·  hoy' : ''}
                              </Text>
                            )}
                          </View>
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

                        {/* LOS PASOS (V61). Aparecen solo si la persona los pide: arranca sin
                            ningún campo y cada toque agrega uno, hasta tres.

                            Es deliberado que no haya tres cajas esperando. Un objetivo del día
                            puede ser una sola cosa que no necesita desglose, y tres campos vacíos
                            en pantalla se leen como una obligación — que es exactamente lo que
                            llevaba a rellenar por rellenar cuando estas acciones vivían, de a tres
                            y obligatorias, colgando de la semana. */}
                        {elegida && (
                          <View style={{ gap: 6, marginLeft: 38 }}>
                            {pasos.map((paso, indice) => (
                              <TextInput
                                key={indice}
                                value={paso}
                                onChangeText={texto => cambiarPaso(clave, indice, texto)}
                                placeholder={`Paso ${indice + 1}`}
                                placeholderTextColor={c.chevron}
                                style={[
                                  estilos.paso,
                                  { borderColor: c.border, backgroundColor: c.cardBg, color: c.textStrong },
                                ]}
                              />
                            ))}
                            {pasos.length < MAXIMO_PASOS && (
                              <Pressable onPress={() => agregarPaso(clave)} hitSlop={10}>
                                <Text style={[t.small, { color: c.goldInk, fontSize: 14, fontFamily: 'Jost_700Bold' }]}>
                                  {pasos.length === 0 ? '+ Desglosarla en pasos (opcional)' : '+ Otro paso'}
                                </Text>
                              </Pressable>
                            )}
                          </View>
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
              Se agendan para el {fechaAGuardar} y aparecen en Entrenamiento, en Vida y Negocio
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
  paso: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  pie: { padding: 18, borderTopWidth: 1 },
});
