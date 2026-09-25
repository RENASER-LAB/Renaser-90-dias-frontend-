import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { Aparicion } from '../../../components/Aparicion';
import { MicroLabel } from '../../../components/ui';
import { CodigoRenaserDelAlumno } from '../components/CodigoRenaserDelAlumno';
import { HabitosDelAlumno } from '../components/HabitosDelAlumno';
import { RejillaSemanal } from '../components/RejillaSemanal';
import { irAPestana } from '../../../navigation/navegacionRef';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { TarjetaSemaforoDeAprendiz } from '../../semaforo/components/TarjetaSemaforoDeAprendiz';
import { abrirConversacionDirecta } from '../../chat/api/chatApi';
import { urlDeEvidencia } from '../../evidence/api/evidenceApi';
import { useSemanaDelAlumno } from '../hooks/useSemanaDelAlumno';
import { diasDesde, etiquetaDeMotivo } from '../reglas';
import type { AlumnoConEstado } from '../types/mentor.types';

/**
 * El detalle de un aprendiz, para que el mentor sepa QUÉ decirle antes de escribirle.
 *
 * La semana viene de `GET /mentor/groups/{g}/learners/{u}/progress`, que devuelve la
 * programación que ese aprendiz tenía ESE día — no la de hoy proyectada hacia atrás. Es la
 * diferencia entre mostrar lo que pasó y reconstruir una semana que nunca existió.
 *
 * En 320–360 px no hay tabla de siete columnas: un selector de día y una sola columna. Los
 * estados van en palabras además de en color, porque verde y rojo solos no alcanzan.
 */
export function AlumnoScreen({
  alumno,
  grupoId,
  onVolver,
}: {
  alumno: AlumnoConEstado;
  grupoId: string | null;
  onVolver: () => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth, isTablet } = useResponsive();

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const nombre = alumno.nombre?.trim() || 'Aprendiz sin nombre';
  const dias = diasDesde(alumno.ultimaActividadEn);
  const { semana, diasConContenido, cargando, fallo, desplazar } = useSemanaDelAlumno(
    grupoId,
    alumno.participanteId,
  );
  const [diaElegido, setDiaElegido] = useState<string | null>(null);

  /* Al cambiar de semana se vuelve al primer día con contenido. Conservar el día anterior
     dejaría seleccionada una fecha que ya no está en la lista y la pantalla quedaría vacía. */
  useEffect(() => {
    setDiaElegido(diasConContenido[0]?.fecha ?? null);
  }, [diasConContenido]);

  const detalleDelDia = diasConContenido.find(d => d.fecha === diaElegido) ?? diasConContenido[0] ?? null;
  const [abriendoChat, setAbriendoChat] = useState(false);
  const [abriendoEvidencia, setAbriendoEvidencia] = useState<string | null>(null);

  /*
   * La URL se pide en el momento de abrir, nunca antes. Vence a los diez minutos, así que
   * traerlas por adelantado para las obligaciones de la semana dejaría casi todas vencidas sin
   * usarse — y cada una es una llave que abre el archivo sin volver a pasar por el backend.
   */
  const verEvidencia = async (evidenciaId: string) => {
    setAbriendoEvidencia(evidenciaId);
    try {
      const url = await urlDeEvidencia(evidenciaId);
      if (!url) {
        Alert.alert('Sin archivo', 'Esta evidencia es de texto: no hay archivo que abrir.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('No se pudo abrir', 'Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setAbriendoEvidencia(null);
    }
  };

  /*
   * Abre el 1 a 1 que ya existe con esta persona (o lo crea) y NO manda nada. El SDD es
   * explícito: escribirle es una decisión del mentor, no un efecto de tocar un botón — así que
   * acá termina en una conversación lista y vacía, y el mensaje lo escribe él.
   */
  /**
   * Abre el chat PRIVADO con este aprendiz, no el del grupo: `POST /chat/conversations/direct`,
   * que es idempotente — si ya existe, devuelve la misma.
   *
   * <p>Y lleva hasta ella. Antes creaba la conversación y mostraba un aviso que decía dónde
   * buscarla; el mentor tenía que salir, entrar a Comunidad, elegir Miembros y encontrarla a mano.
   * Se usa el mismo mecanismo con el que Training abre la Clase Diaria dentro de Comunidad
   * (`irAPestana` con parámetros), en vez de inventar una ruta nueva para el chat.
   *
   * <p>No se envía ningún mensaje: el mentor escribe y manda él. Eso es a propósito y no una
   * funcionalidad a medias — un botón que manda algo en nombre de alguien es otra cosa.
   */
  const escribirle = async () => {
    setAbriendoChat(true);
    try {
      const conversacion = await abrirConversacionDirecta(alumno.participanteId);
      const navego = irAPestana('Comunidad', { abrirChatConversacionId: conversacion.id });
      if (!navego) {
        /* `irAPestana` devuelve false cuando el navegador todavía no montó. Es raro, pero si
           pasa hay que decir algo: la conversación SÍ quedó creada, y callarse dejaría al mentor
           creyendo que el botón no hizo nada. */
        Alert.alert(
          'Conversación lista',
          `Tu chat con ${nombre} está en Comunidad → Miembros. No se envió ningún mensaje.`,
        );
      }
    } catch {
      Alert.alert('No se pudo abrir el chat', 'Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setAbriendoChat(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[estilos.barra, { paddingHorizontal: horizontalPadding }]}>
        <Pressable
          onPress={onVolver}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver a mi grupo"
          style={estilos.volver}
        >
          <Icon name="arrowLeft" size={15} color={c.goldInk} />
          <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
            MI GRUPO
          </Text>
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          estilos.contenido,
          {
            paddingHorizontal: horizontalPadding,
            maxWidth: contentMaxWidth,
            alignSelf: isTablet ? 'center' : 'stretch',
            width: isTablet ? '100%' : undefined,
          },
        ]}
      >
        <Aparicion>
          <Text style={[t.screenTitle, { color: c.text, fontSize: 21 }]} numberOfLines={2}>
            {nombre}
          </Text>
          <Text style={[t.body, { color: c.textSoft, fontSize: 13, marginTop: 4 }]}>
            {alumno.diaPrograma === null ? 'Día por confirmar'
              : alumno.diaPrograma <= 0 ? 'Todavía no arrancó su programa'
              : `Día ${alumno.diaPrograma} de 90`}
            {dias !== null ? ` · última actividad hace ${dias === 0 ? 'menos de un día' : dias === 1 ? '1 día' : `${dias} días`}` : ''}
          </Text>
        </Aparicion>

        <Aparicion retardo={70} style={{ marginTop: 20 }}>
          <View style={estilos.filaSemana}>
            <MicroLabel>Semana</MicroLabel>
            {semana ? (
              <View style={estilos.navegacion}>
                <Pressable
                  onPress={() => desplazar(-1)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Semana anterior"
                  style={[estilos.flecha, { borderColor: c.border }]}
                >
                  <Icon name="arrowLeft" size={14} color={c.goldInk} />
                </Pressable>
                <Pressable
                  onPress={() => desplazar(1)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Semana siguiente"
                  style={[estilos.flecha, { borderColor: c.border }]}
                >
                  <Icon name="arrow" size={14} color={c.goldInk} />
                </Pressable>
              </View>
            ) : null}
          </View>

          <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
            {cargando ? (
              <Text style={[t.body, { color: c.textSoft, fontSize: 13 }]}>Cargando la semana…</Text>
            ) : fallo ? (
              <Text style={[t.body, { color: c.textSoft, fontSize: 13, lineHeight: 19 }]}>
                {fallo === 'sin_permiso'
                  ? 'Ya no tienes acceso al avance de este aprendiz.'
                  : fallo === 'sin_red'
                    ? 'No se pudo conectar. Revisa tu conexión y vuelve a entrar.'
                    : 'No se pudo cargar la semana de este aprendiz.'}
              </Text>
            ) : semana ? (
              <>
                <Text style={[t.body, { color: c.text, fontSize: 13.5, fontFamily: 'Jost_500Medium' }]}>
                  {rangoLegible(semana.inicioDeSemana, semana.finDeSemana)}
                </Text>

                {semana.cobertura === 'SIN_DATOS' ? (
                  /* No es "no cumplió nada": es que no hay registro de esa semana. Decirlo
                     distinto importa — de esto salen conversaciones con una persona. */
                  <Text style={[t.body, { color: c.textSoft, fontSize: 13, marginTop: 10, lineHeight: 19 }]}>
                    No hay hábitos registrados para esta semana. No significa que no haya cumplido:
                    significa que no hay datos.
                  </Text>
                ) : (
                  <>
                    <Text style={[t.micro, { color: c.textSoft, fontSize: 11.5, marginTop: 6 }]}>
                      {semana.resumen.cumplidas} cumplidos · {semana.resumen.sinCumplir} sin cumplir ·{' '}
                      {semana.resumen.pendientes} pendientes · {semana.resumen.conEntrega} con evidencia
                    </Text>

                    {/*
                      La rejilla SUMA, no reemplaza. En tablet da la vista de conjunto —los
                      huecos se leen mejor en la forma que en una lista— y debajo sigue el
                      detalle del dia, que es donde estan las acciones: abrir la evidencia,
                      leer el estado de revision. Ponerla en lugar del detalle dejaba una
                      pantalla bonita desde la que no se podia hacer nada.

                      En telefono va solo el detalle: siete columnas en 360 px dan titulos
                      recortados y casillas de 8 px (AGENTS.md §2, plan.md §10). No es
                      simplificar el movil, es que ahi la rejilla miente por ilegible.
                    */}
                    {/* Sin condicion de ancho: la rejilla ya trae su forma compacta para
                        movil. Antes esto era `isTablet ? ... : null` y en telefono la semana
                        entera desaparecia -- que es donde mas se mira. */}
                    <RejillaSemanal dias={semana.dias} />

                    <View style={estilos.chips}>
                      {diasConContenido.map(dia => {
                        const activo = detalleDelDia?.fecha === dia.fecha;
                        return (
                          <Pressable
                            key={dia.fecha}
                            onPress={() => setDiaElegido(dia.fecha)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: activo }}
                            accessibilityLabel={diaLargo(dia.fecha)}
                            style={[
                              estilos.chip,
                              {
                                borderColor: activo ? c.goldInk : c.border,
                                backgroundColor: activo ? c.goldWash : 'transparent',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                t.micro,
                                {
                                  color: activo ? c.goldInk : c.textSoft,
                                  fontSize: 11.5,
                                  fontFamily: activo ? 'Jost_700Bold' : 'Jost_400Regular',
                                },
                              ]}
                            >
                              {diaCorto(dia.fecha)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {detalleDelDia ? (
                      <View style={estilos.detalleDia}>
                        <Text style={[t.body, { color: c.text, fontSize: 14, fontFamily: 'Jost_500Medium' }]}>
                          {diaLargo(detalleDelDia.fecha)}
                        </Text>
                        {detalleDelDia.obligaciones.length === 0 ? (
                          <Text style={[t.body, { color: c.textSoft, fontSize: 13, marginTop: 6 }]}>
                            Sin hábitos programados este día.
                          </Text>
                        ) : (
                          detalleDelDia.obligaciones.map(o => (
                            <View key={o.registroId} style={[estilos.obligacion, { borderColor: c.border }]}>
                              <Text style={[t.body, { color: c.text, fontSize: 13.5, flexShrink: 1 }]}>
                                {o.titulo}
                              </Text>
                              <View style={estilos.estados}>
                                <Text
                                  style={[
                                    t.micro,
                                    { color: colorDeEstado(o.estadoHabito, c), fontSize: 11.5,
                                      fontFamily: 'Jost_500Medium' },
                                  ]}
                                >
                                  {etiquetaDeEstado(o.estadoHabito)}
                                </Text>
                                {o.entrega !== 'NO_REQUERIDA' ? (
                                  <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>
                                    {etiquetaDeEntrega(o.entrega, o.revision)}
                                  </Text>
                                ) : null}
                                {o.evidenciaId ? (
                                  <Pressable
                                    onPress={() => void verEvidencia(o.evidenciaId as string)}
                                    disabled={abriendoEvidencia === o.evidenciaId}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Ver la evidencia de ${o.titulo}`}
                                    style={[estilos.verEvidencia, { borderColor: c.goldInk }]}
                                  >
                                    <Icon name="image" size={13} color={c.goldInk} />
                                    <Text style={[t.micro, { color: c.goldInk, fontSize: 11,
                                      fontFamily: 'Jost_500Medium' }]}>
                                      {abriendoEvidencia === o.evidenciaId ? 'Abriendo…' : 'Ver evidencia'}
                                    </Text>
                                  </Pressable>
                                ) : null}
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    ) : null}
                  </>
                )}
              </>
            ) : null}
          </View>
        </Aparicion>

        <Aparicion retardo={110} style={{ marginTop: 16 }}>
          <Pressable
            onPress={() => void escribirle()}
            disabled={abriendoChat}
            accessibilityRole="button"
            accessibilityLabel={`Escribirle a ${nombre}`}
            accessibilityState={{ disabled: abriendoChat }}
            style={[
              estilos.escribir,
              { borderColor: c.goldInk, backgroundColor: c.goldWash, opacity: abriendoChat ? 0.6 : 1 },
            ]}
          >
            <Icon name="chat" size={16} color={c.goldInk} />
            <Text style={[t.body, { color: c.goldInk, fontSize: 14, fontFamily: 'Jost_500Medium' }]}>
              {abriendoChat ? 'Abriendo…' : 'Escribirle'}
            </Text>
          </Pressable>
        </Aparicion>

        <Aparicion retardo={140} style={{ marginTop: 20 }}>
          <MicroLabel>{alumno.requiereSeguimiento ? 'QUÉ NECESITA' : 'ESTADO'}</MicroLabel>
          <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg, gap: 10 }]}>
            {alumno.requiereSeguimiento ? (
              alumno.motivos.map((m, i) => (
                <View key={`${m.clase}-${i}`} style={estilos.motivo}>
                  <Icon
                    name={m.clase === 'sin_actividad' ? 'clock' : m.clase === 'habitos_pendientes' ? 'diamond' : 'camera'}
                    size={15}
                    color={c.danger}
                  />
                  <Text style={[t.body, { color: c.text, fontSize: 13.5, flex: 1 }]}>
                    {etiquetaDeMotivo(m)}
                  </Text>
                </View>
              ))
            ) : (
              /*
               * Esto habla de la SEMANA que se acaba de cargar arriba, no del resumen del
               * listado —que viene sin avance y hacia decir "va al dia" a cualquiera—. La
               * pantalla llego a mostrar "0 cumplidos · 2 sin cumplir" y, tres centimetros
               * mas abajo, "Va al dia. No hay nada pendiente esta semana".
               */
              <View style={estilos.motivo}>
                <Icon
                  name={semana && semana.resumen.sinCumplir > 0 ? 'clock' : 'checkCircle'}
                  size={16}
                  color={semana && semana.resumen.sinCumplir > 0 ? c.danger : c.success}
                />
                <Text style={[t.body, { color: c.text, fontSize: 13.5, flex: 1 }]}>
                  {!semana || semana.cobertura === 'SIN_DATOS'
                    ? 'No hay actividad registrada esta semana. No significa que no haya cumplido: significa que no hay datos.'
                    : semana.resumen.sinCumplir > 0
                      ? `${semana.resumen.sinCumplir} ${semana.resumen.sinCumplir === 1 ? 'obligación' : 'obligaciones'} sin cumplir esta semana.`
                      : semana.resumen.pendientes > 0
                        ? `${semana.resumen.pendientes} ${semana.resumen.pendientes === 1 ? 'pendiente' : 'pendientes'} esta semana, nada vencido.`
                        : 'Va al día. No hay nada pendiente esta semana.'}
                </Text>
              </View>
            )}
          </View>
        </Aparicion>

        {/*
          Semáforo de cumplimiento (D-168): su vigente con palabra y porcentaje, los 7 días con su
          desglose y las semanas cerradas — lo mismo que ve la persona, sin la pausa. Va después de
          lo que ya estaba arriba (la semana, escribirle, qué necesita), que no se movió. Si el
          servidor no tiene la ruta (404) o ya no acompaña a esta persona (403), no se dibuja.
        */}
        <TarjetaSemaforoDeAprendiz
          origen={grupoId ? { quien: 'mentor', grupoId, aprendizId: alumno.participanteId } : null}
          retardo={160}
          margenArriba={20}
        />

        {/*
          Las dos lecturas que explican lo de arriba, en el orden en que se necesitan: primero
          CÓMO tiene armado su plan (horarios, recordatorios, desbloqueos), después QUÉ escribió
          hora por hora en sus primeros días.

          Cada una se dibuja sola o no se dibuja: piden sus datos por su cuenta y, mientras el
          backend no las sirva, devuelven `null` sin tocar nada de lo que ya funciona en esta
          pantalla. Van al final a propósito — son lectura larga, y lo que el mentor necesita
          para decidir a quién escribirle ya está resuelto más arriba.
        */}
        <HabitosDelAlumno grupoId={grupoId} alumnoId={alumno.participanteId} />
        <CodigoRenaserDelAlumno grupoId={grupoId} alumnoId={alumno.participanteId} />

      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Formato de fechas ─────────────────────────────────────────────────────
   Se construyen con UTC a mano y no con `toLocaleDateString` del dispositivo: las fechas
   llegan como YYYY-MM-DD en la zona del ALUMNO, y dejar que el teléfono las interprete en su
   propio huso corre el día una casilla para un mentor que viaja. */

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];

function comoFecha(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function diaCorto(iso: string): string {
  const d = comoFecha(iso);
  return `${DIAS_CORTOS[d.getUTCDay()]} ${d.getUTCDate()}`;
}

function diaLargo(iso: string): string {
  const d = comoFecha(iso);
  return `${DIAS_LARGOS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

function rangoLegible(desde: string, hasta: string): string {
  const a = comoFecha(desde);
  const b = comoFecha(hasta);
  return a.getUTCMonth() === b.getUTCMonth()
    ? `Del ${a.getUTCDate()} al ${b.getUTCDate()} de ${MESES[b.getUTCMonth()]}`
    : `Del ${a.getUTCDate()} de ${MESES[a.getUTCMonth()]} al ${b.getUTCDate()} de ${MESES[b.getUTCMonth()]}`;
}

/** Palabras además de color: verde y rojo solos no alcanzan (AGENTS.md §4). */
function etiquetaDeEstado(estado: string): string {
  switch (estado) {
    case 'COMPLETADO':
      return 'Cumplido';
    case 'FALLIDO':
      return 'No cumplido';
    case 'EXPIRADO':
      return 'Venció';
    case 'EN_CURSO':
      return 'En curso';
    default:
      return 'Pendiente';
  }
}

function colorDeEstado(estado: string, c: ReturnType<typeof useTheme>['c']): string {
  if (estado === 'COMPLETADO') return c.success;
  if (estado === 'FALLIDO' || estado === 'EXPIRADO') return c.danger;
  return c.textSoft;
}

/** La entrega y su revisión son dos hechos: se dicen los dos, no uno mezclado. */
function etiquetaDeEntrega(entrega: string, revision: string | null): string {
  if (entrega === 'SIN_ENTREGA') return 'Evidencia sin entregar';
  switch (revision) {
    case 'VALIDA':
      return 'Evidencia entregada · verificada';
    case 'RECHAZADA':
      return 'Evidencia entregada · rechazada';
    case 'REVISION_MANUAL':
      return 'Evidencia entregada · en revisión';
    default:
      return 'Evidencia entregada · pendiente de revisión';
  }
}

const estilos = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44 },
  contenido: { flexGrow: 1, paddingTop: 8, paddingBottom: ESPACIO_PARA_LANZADOR },
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 8 },
  grande: { fontFamily: 'Jost_500Medium', fontSize: 26, lineHeight: 30, fontVariant: ['tabular-nums'] },
  riel: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 12 },
  relleno: { height: '100%', borderRadius: 3 },
  motivo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nota: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 14, padding: 14 },
  // 52 px: acción principal del detalle, pulsable con el pulgar.
  // 44 px: pulsable sin apuntar, dentro de una fila de obligacion.
  verEvidencia: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
  },
  escribir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
  },
  filaSemana: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navegacion: { flexDirection: 'row', gap: 8 },
  // 44 px de lado: pulsable con el pulgar sin apuntar (AGENTS.md §4).
  flecha: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  detalleDia: { marginTop: 16 },
  obligacion: { borderTopWidth: 1, paddingTop: 10, marginTop: 10, gap: 4 },
  estados: { gap: 2 },
});
