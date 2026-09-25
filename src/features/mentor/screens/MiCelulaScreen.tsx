import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { Aparicion } from '../../../components/Aparicion';
import { MicroLabel } from '../../../components/ui';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { destinoDe } from '../api/avisosApi';
import { useAvisosDeAcompanamiento } from '../hooks/useAvisosDeAcompanamiento';
import { useEvaluacionPropia } from '../hooks/useEvaluacionPropia';
import { useRankingDeGrupos } from '../hooks/useRankingDeGrupos';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { SeccionSemaforoDelGrupo } from '../../semaforo/components/SeccionSemaforoDelGrupo';
import { CargandoCelula, EstadoCelula } from '../components/EstadoCelula';
import { FilaAlumno } from '../components/FilaAlumno';
import type { FalloCelula, VistaCelula } from '../hooks/useCelulaQueAcompano';
import type { AlumnoConEstado } from '../types/mentor.types';

/**
 * La célula del mentor: quién necesita algo hoy, y quién va al día.
 *
 * Un scroll único, como pide AGENTS.md §2. La lista de aprendices se recorre con `map` y NO
 * con `FlatList` a propósito: una lista virtualizada dentro de un `ScrollView` es exactamente
 * el doble scroll que la guía prohíbe, y una célula tiene diez personas —no mil— así que la
 * virtualización no compra nada y sí rompe el gesto.
 *
 * Desde el semáforo (D-168) suma la sección «Semáforo del grupo», debajo de las cifras. El aviso
 * del sábado al mentor (`/mentor/groups/{g}/semaforo`) abre esta pantalla con `enfocarSemaforo`, y
 * entonces el scroll baja hasta esa sección.
 */
export function MiCelulaScreen({
  onSalir,
  onAbrirAlumno,
  vista,
  cargando,
  fallo,
  detalle,
  recargar,
  enfocarSemaforo = false,
}: {
  onSalir: () => void;
  onAbrirAlumno: (alumno: AlumnoConEstado) => void;
  vista: VistaCelula | null;
  cargando: boolean;
  fallo: FalloCelula | null;
  detalle: string | null;
  recargar: () => void;
  /** Llegó por el aviso del semáforo del grupo: abrir con esa sección a la vista. */
  enfocarSemaforo?: boolean;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth, isTablet } = useResponsive();

  /* Llevar el scroll hasta el semáforo cuando se llegó por su aviso. Se sigue a la sección
     mientras lo de arriba (avisos, evaluación) termina de cargar y la corre hacia abajo —cada
     cambio de su posición llega por `onLayout`—, y se deja de seguirla en cuanto la persona
     mueve la pantalla con el dedo: a partir de ahí manda ella. */
  const scroll = useRef<ScrollView>(null);
  const alturaDelSemaforo = useRef<number | null>(null);
  const seguirAlSemaforo = useRef(enfocarSemaforo);
  const irAlSemaforo = () => {
    if (!seguirAlSemaforo.current || alturaDelSemaforo.current === null) return;
    scroll.current?.scrollTo({ y: Math.max(0, alturaDelSemaforo.current - 8), animated: false });
  };
  const alMedirSemaforo = (e: LayoutChangeEvent) => {
    alturaDelSemaforo.current = e.nativeEvent.layout.y;
    irAlSemaforo();
  };
  useEffect(() => {
    if (!enfocarSemaforo) return;
    seguirAlSemaforo.current = true;
    irAlSemaforo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enfocarSemaforo]);

  useSystemBackHandler(() => {
    onSalir();
    return true;
  });

  const resumen = vista?.resumen;
  const { evaluacion, disponible: hayEvaluacion } = useEvaluacionPropia(vista != null);
  const { avisos, disponible: hayAvisos, marcarLeido } = useAvisosDeAcompanamiento(vista != null);
  const { miFila, total: gruposEnCohorte, disponible: hayRanking } = useRankingDeGrupos(
    vista?.celula.cohorteId ?? null,
    vista?.celula.id ?? null,
  );
  /** `—` y no `0`: que no se sepa no es que valga cero. */
  const pct = resumen?.cumplimiento;
  const cifras: Array<{ valor: string; etiqueta: string }> = [
    { valor: String(resumen?.total ?? '—'), etiqueta: 'aprendices' },
    { valor: String(resumen?.alDia ?? '—'), etiqueta: 'al día' },
    // Solo cuando hay alguien sin juzgar: en el caso normal la cabecera queda en cuatro cifras.
    ...(resumen && resumen.sinDatos > 0
      ? [{ valor: String(resumen.sinDatos), etiqueta: 'sin datos' }]
      : []),
    { valor: pct === null || pct === undefined ? '—' : `${Math.round(pct * 100)}%`, etiqueta: 'cumplimiento' },
    { valor: resumen?.evidenciasPendientes === null || resumen?.evidenciasPendientes === undefined
        ? '—' : String(resumen.evidenciasPendientes), etiqueta: 'por revisar' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[estilos.barra, { paddingHorizontal: horizontalPadding }]}>
        <Pressable
          onPress={onSalir}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={estilos.volver}
        >
          <Icon name="arrowLeft" size={15} color={c.goldInk} />
          <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', letterSpacing: 1 }]}>
            VOLVER
          </Text>
        </Pressable>
        <View style={[estilos.insignia, { borderColor: c.gold, backgroundColor: c.goldWash }]}>
          <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 10.5 }]}>
            MENTOR
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => {
          seguirAlSemaforo.current = false;
        }}
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
            {vista?.celula.nombre ?? 'Mi grupo'}
          </Text>
          <Text style={[t.body, { color: c.textSoft, fontSize: 13, marginTop: 4 }]}>
            {vista
              ? [
                  vista.celula.cohorte,
                  /* Los DOS se nombran, no solo la recepción. Antes el grupo estable no
                     llevaba etiqueta, y un mentor que acompaña los dos no podía distinguirlos:
                     la ausencia de etiqueta no dice "estable", solo dice nada. */
                  vista.celula.tipo === 'recepcion' ? 'Recepción' : 'Grupo estable',
                  ocupacion(vista.resumen.total, vista.celula.cupo),
                ]
                  .filter(Boolean)
                  .join(' · ')
              : 'Acompañamiento de tu grupo'}
          </Text>

          {/* Que falte mentor no borra el grupo: se dice quién lo cubre, no "no tienes grupo"
              (plan.md §10). Con mentor presente no se muestra nada: sería ruido. */}
          {vista && vista.celula.cobertura !== 'con_mentor' ? (
            <View
              style={[
                estilos.avisoCobertura,
                {
                  backgroundColor: vista.celula.cobertura === 'soporte' ? c.goldWash : c.dangerWash,
                  borderColor: vista.celula.cobertura === 'soporte' ? c.goldInk : c.danger,
                },
              ]}
            >
              <Text
                style={[
                  t.body,
                  {
                    color: vista.celula.cobertura === 'soporte' ? c.goldInk : c.danger,
                    fontSize: 12.5,
                    fontFamily: 'Jost_500Medium',
                  },
                ]}
              >
                {vista.celula.cobertura === 'soporte'
                  ? 'Grupo acompañado por soporte'
                  : 'Este grupo todavía no tiene quien lo acompañe'}
              </Text>
            </View>
          ) : null}
        </Aparicion>

        {cargando ? <CargandoCelula /> : null}

        {!cargando && (fallo || (vista && vista.todos.length === 0)) ? (
          <EstadoCelula
            fallo={fallo}
            vacia={!fallo && vista?.todos.length === 0}
            detalle={detalle}
            onReintentar={recargar}
          />
        ) : null}

        {!cargando && vista && vista.todos.length > 0 ? (
          <>
            {/* Avisos sin leer. Salen de la bandeja general filtrada por tipo: no hay lista
                paralela de alertas. Cada uno dice su causa y lleva al alumno. */}
            {hayAvisos ? (
              <Aparicion retardo={20} style={{ marginBottom: 4 }}>
                <MicroLabel>
                  {avisos.length === 1 ? '1 AVISO' : `${avisos.length} AVISOS`}
                </MicroLabel>
                <View style={[estilos.evaluacion, { borderColor: c.border, backgroundColor: c.cardBg,
                  paddingVertical: 6 }]}>
                  {avisos.map((aviso, i) => {
                    const destino = destinoDe(aviso);
                    const alumno = destino
                      ? vista.todos.find(a => a.participanteId === destino.alumnoId)
                      : undefined;
                    return (
                      <Pressable
                        key={aviso.id}
                        onPress={() => {
                          void marcarLeido(aviso.id);
                          /* Solo se abre si el alumno sigue en el grupo. Un aviso viejo de
                             alguien que ya rotó queda legible pero no lleva a ningún lado:
                             sus datos ya no son de este mentor (plan.md §10). */
                          if (alumno) onAbrirAlumno(alumno);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={aviso.body}
                        style={[estilos.aviso, i > 0 ? { borderTopWidth: 1, borderTopColor: c.border } : null]}
                      >
                        <Icon name="clock" size={15} color={c.goldInk} />
                        <Text style={[t.body, { color: c.text, fontSize: 13.5, flex: 1 }]}>
                          {aviso.body}
                        </Text>
                        {alumno ? <Icon name="chevron" size={14} color={c.chevron} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </Aparicion>
            ) : null}

            {/* Mi evaluación. El porcentaje llega calculado del servidor: la app no lo
                recalcula, para que nunca diga un número distinto del que ve el administrador. */}
            {hayEvaluacion && evaluacion ? (
              <Aparicion retardo={40} style={{ marginBottom: 4 }}>
                <MicroLabel>Mi evaluación</MicroLabel>
                <View style={[estilos.evaluacion, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                  <View style={estilos.filaEvaluacion}>
                    <Text style={[estilos.cifraValor, { color: c.textStrong, fontSize: 28 }]}>
                      {evaluacion.porcentaje === null
                        ? '—'
                        : `${Math.round(evaluacion.porcentaje)}%`}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[t.body, { color: c.text, fontSize: 13, fontFamily: 'Jost_500Medium' }]}>
                        {textoDeEstado(evaluacion.estado)}
                      </Text>
                      {evaluacion.estado === 'CALCULADA' ? (
                        <Text style={[t.micro, { color: c.textSoft, fontSize: 11.5, marginTop: 2 }]}>
                          {evaluacion.entregadas} de {evaluacion.esperadas} evidencias ·{' '}
                          {evaluacion.alumnosEvaluados}{' '}
                          {evaluacion.alumnosEvaluados === 1 ? 'aprendiz' : 'aprendices'}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {/* La posición del grupo es OTRA medida: cubre todo el mes sin filtrar por
                      quién acompañaba, así que puede no coincidir con la nota de arriba si el
                      mentor entró a mitad de mes. Se dice, no se disimula (plan.md §8). */}
                  {hayRanking && miFila ? (
                    <View style={[estilos.posicion, { borderTopColor: c.border }]}>
                      <Text style={[t.body, { color: c.text, fontSize: 13 }]}>
                        Tu grupo va en el puesto {miFila.posicion} de {gruposEnCohorte} en la cohorte
                      </Text>
                      <Text style={[t.micro, { color: c.textSoft, fontSize: 11 }]}>
                        {miFila.porcentaje === null
                          ? 'Sin muestra suficiente este mes'
                          : `${Math.round(miFila.porcentaje)}% del grupo · ${miFila.muestra} ${
                              miFila.muestra === 1 ? 'aprendiz medido' : 'aprendices medidos'
                            }`}
                      </Text>
                    </View>
                  ) : null}

                  <Text style={[t.micro, { color: c.chevron, fontSize: 10.5, marginTop: 10, lineHeight: 15 }]}>
                    Se promedia el porcentaje de cada aprendiz, no el total de evidencias. Cuenta la
                    entrega dentro de tu período; la verificación se informa aparte
                    {evaluacion.verificadas > 0 ? ` (${evaluacion.verificadas} verificadas)` : ''}.
                  </Text>
                </View>
              </Aparicion>
            ) : null}

            <Aparicion retardo={70}>
              {/* `flexWrap` y un ancho minimo: cuatro en linea donde cabe, 2x2 en pantallas
                  estrechas. Sin puntos de ruptura escritos a mano — la caja decide. */}
              <View style={estilos.cifras}>
                {cifras.map(cifra => (
                  <View
                    key={cifra.etiqueta}
                    style={[estilos.cifra, { borderColor: c.border, backgroundColor: c.cardBg }]}
                  >
                    <Text style={[estilos.cifraValor, { color: c.textStrong }]}>{cifra.valor}</Text>
                    <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5 }]} numberOfLines={2}>
                      {cifra.etiqueta}
                    </Text>
                  </View>
                ))}
              </View>
            </Aparicion>

            {/* Semáforo de cumplimiento (D-168): la semana del grupo, persona por persona, con
                palabra y color. Convive con las listas de abajo, que miden otra cosa (reglas.ts).
                Si el servidor no tiene la ruta (404) o el mentor ya no acompaña el grupo (403),
                la sección no aparece y la pantalla queda como estaba. La envoltura mide dónde
                cae, para poder llevar el scroll hasta acá desde el aviso del sábado. */}
            <View onLayout={alMedirSemaforo}>
              <SeccionSemaforoDelGrupo
                grupoId={vista.celula.id}
                onAbrirAprendiz={aprendizId => {
                  /* Solo si sigue en el padrón: la ficha necesita al alumno entero, y alguien
                     que ya rotó no es de este mentor (mismo criterio que los avisos). */
                  const alumno = vista.todos.find(a => a.participanteId === aprendizId);
                  return alumno ? () => onAbrirAlumno(alumno) : undefined;
                }}
              />
            </View>

            {vista.requierenSeguimiento.length > 0 ? (
              <Aparicion retardo={140} style={{ marginTop: 22 }}>
                <MicroLabel>Requieren seguimiento</MicroLabel>
                <View style={[estilos.lista, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                  {vista.requierenSeguimiento.map(a => (
                    <FilaAlumno key={a.participanteId} alumno={a} onPress={() => onAbrirAlumno(a)} />
                  ))}
                </View>
              </Aparicion>
            ) : vista.alDia.length > 0 ? (
              <Aparicion retardo={140} style={{ marginTop: 22 }}>
                <View style={[estilos.todoBien, { borderColor: c.border, backgroundColor: c.successWash }]}>
                  <Icon name="checkCircle" size={17} color={c.success} />
                  <Text style={[t.body, { color: c.text, fontSize: 13, flex: 1 }]}>
                    Nadie de tu grupo necesita seguimiento hoy.
                  </Text>
                </View>
              </Aparicion>
            ) : null}

            {/* Sin una sola señal no se afirma nada. El verde de "todo bien" solo aparece
                cuando hay datos que lo respalden; si no, se dice que faltan. */}
            {vista.sinDatos.length > 0 ? (
              <Aparicion retardo={175} style={{ marginTop: 22 }}>
                <MicroLabel>Sin avance registrado</MicroLabel>
                <View style={[estilos.lista, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                  {vista.sinDatos.map(a => (
                    <FilaAlumno key={a.participanteId} alumno={a} onPress={() => onAbrirAlumno(a)} />
                  ))}
                </View>
                <Text style={[t.micro, { color: c.chevron, fontSize: 10.5, marginTop: 8, lineHeight: 15 }]}>
                  Todavía no hay actividad registrada de estas personas. Abre a cada una para ver
                  su semana: que falte el resumen no significa que no haya cumplido.
                </Text>
              </Aparicion>
            ) : null}

            {vista.alDia.length > 0 ? (
              <Aparicion retardo={210} style={{ marginTop: 22 }}>
                <MicroLabel>Al día</MicroLabel>
                <View style={[estilos.lista, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                  {vista.alDia.map(a => (
                    <FilaAlumno key={a.participanteId} alumno={a} onPress={() => onAbrirAlumno(a)} />
                  ))}
                </View>
              </Aparicion>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * "8 de 10 aprendices" cuando hay tope, "8 aprendices" cuando no. La recepción no tiene tope
 * (D-05) y escribir "8 de null" o inventar un 15 sería peor que no decir nada.
 */
/** Por qué puede faltar el número. Ninguno de los tres casos es "0 %". */
function textoDeEstado(estado: string): string {
  switch (estado) {
    case 'CALCULADA':
      return 'Cumplimiento de tus aprendices este mes';
    case 'SIN_MUESTRA':
      return 'Este mes todavía no vencieron evidencias que medir';
    default:
      return 'Sin historial evaluable en este período';
  }
}

function ocupacion(total: number, cupo: number | null): string {
  return cupo === null ? `${total} aprendices` : `${total} de ${cupo} aprendices`;
}

const estilos = StyleSheet.create({
  evaluacion: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 8 },
  // 48 px de alto: pulsable con el pulgar (AGENTS.md §4).
  posicion: { borderTopWidth: 1, marginTop: 12, paddingTop: 10, gap: 2 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 10 },
  filaEvaluacion: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avisoCobertura: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
  },
  barra: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 10, paddingBottom: 6,
  },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44 },
  insignia: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  contenido: { flexGrow: 1, paddingTop: 8, paddingBottom: ESPACIO_PARA_LANZADOR },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 16 },
  /* `flexBasis: 132` es lo que hace que escale sola, sin puntos de ruptura escritos a mano:
     a 375px de ancho no caben cuatro, asi que se reparten 2x2 y cada etiqueta tiene sitio; en
     tablet (560 de contenido) las cuatro entran en una fila. Con 74 cabian las cuatro y
     "cumplimiento" se partia por la mitad. */
  cifra: {
    flexGrow: 1, flexBasis: 132, minWidth: 132,
    borderWidth: 1, borderRadius: 13, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center',
  },
  cifraValor: {
    fontFamily: 'Jost_500Medium', fontSize: 23, lineHeight: 27,
    fontVariant: ['tabular-nums'],
  },
  lista: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, marginTop: 8 },
  todoBien: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 14, padding: 14,
  },
});
