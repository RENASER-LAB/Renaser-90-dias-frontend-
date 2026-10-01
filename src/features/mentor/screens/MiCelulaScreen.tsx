import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { Aparicion } from '../../../components/Aparicion';
import { TituloDeSeccion } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { destinoDe } from '../api/avisosApi';
import { tituloDeAvisos } from '../utils/tituloDeAvisos';
import { useAvisosDeAcompanamiento } from '../hooks/useAvisosDeAcompanamiento';
import { useEvaluacionPropia } from '../hooks/useEvaluacionPropia';
import { useRankingDeGrupos } from '../hooks/useRankingDeGrupos';
import type { MesDelRanking } from '../utils/mesDelRanking';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { SeccionSemaforoDelGrupo } from '../../semaforo/components/SeccionSemaforoDelGrupo';
import { useSemaforoDelGrupo } from '../../semaforo/hooks/useLecturaPorSemana';
import { seOcultaLaSeccion } from '../../semaforo/utils/entradasDelSemaforo';
import { CargandoCelula, EstadoCelula } from '../components/EstadoCelula';
import { esOtroDeMisGrupos } from '../utils/entradaAlGrupo';
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
 * Desde el 26/09 (S-1) manda el semáforo: después de los avisos va «Necesitan tu ayuda esta
 * semana» (rojo y amarillo) y debajo el resto del grupo. Se quitaron las cifras («0 al día»,
 * «— cumplimiento», «— por revisar») y las listas «Requieren seguimiento / Sin avance registrado /
 * Al día»: salían de campos que el servidor nunca mandaba y decían «sin avance» de todo el mundo.
 * Si el semáforo no está disponible (404 o 403), se muestra la lista simple del grupo, sin estados.
 * El aviso del sábado al mentor (`/mentor/groups/{g}/semaforo`) abre esta pantalla con
 * `enfocarSemaforo`, y entonces el scroll baja hasta esa sección.
 *
 * Desde D-141 un mentor puede acompañar varios grupos en curso. Con más de uno, arriba hay una fila
 * de pastillas con sus nombres: la elegida es la que se mira (alumnos, avisos, semáforo, ranking).
 * Con uno solo no se dibuja nada y la pantalla queda como antes.
 */
export function MiCelulaScreen({
  onSalir,
  onAbrirAlumno,
  vista,
  cargando,
  fallo,
  detalle,
  recargar,
  onElegirGrupo,
  enfocarSemaforo = false,
}: {
  onSalir: () => void;
  onAbrirAlumno: (alumno: AlumnoConEstado) => void;
  vista: VistaCelula | null;
  cargando: boolean;
  fallo: FalloCelula | null;
  detalle: string | null;
  recargar: () => void;
  /** Pasar a otro de sus grupos. Resuelve con la vista de ese grupo (o `null` si no llegó). */
  onElegirGrupo: (grupoId: string) => Promise<VistaCelula | null>;
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

  const { evaluacion, disponible: hayEvaluacion } = useEvaluacionPropia(vista != null);
  const { avisos, disponible: hayAvisos, marcarLeido } = useAvisosDeAcompanamiento(vista != null);
  const [mesDelRanking, setMesDelRanking] = useState<MesDelRanking>('actual');
  const { ranking, miFila, total: gruposEnCohorte, disponible: hayRanking } = useRankingDeGrupos(
    vista?.celula.cohorteId ?? null,
    vista?.celula.id ?? null,
    mesDelRanking,
  );
  const semaforo = useSemaforoDelGrupo(vista ? { quien: 'mentor', grupoId: vista.celula.id } : null);
  const sinSemaforo = seOcultaLaSeccion(semaforo);

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
          <Text style={[t.body, { color: c.goldInk, fontFamily: 'Jost_500Medium', fontSize: 16 }]}>
            Volver
          </Text>
        </Pressable>
        <View style={[estilos.insignia, { borderColor: c.gold, backgroundColor: c.goldWash }]}>
          <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 14 /* metadato */ }]}>
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
          {vista && vista.grupos.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={estilos.pildoras}
              style={{ marginBottom: 12 }}
            >
              {vista.grupos.map(g => (
                <Pildora
                  key={g.id}
                  texto={g.nombre}
                  activa={g.id === vista.celula.id}
                  onPress={() => {
                    if (g.id !== vista.celula.id) void onElegirGrupo(g.id);
                  }}
                />
              ))}
            </ScrollView>
          ) : null}
          <Text style={[t.screenTitle, { color: c.text, fontSize: 21 }]} numberOfLines={2}>
            {vista?.celula.nombre ?? 'Mi grupo'}
          </Text>
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, marginTop: 4 }]}>
            {vista
              ? [
                  vista.celula.cohorte,
                  /* Los DOS se nombran, no solo la recepción. Antes el grupo estable no
                     llevaba etiqueta, y un mentor que acompaña los dos no podía distinguirlos:
                     la ausencia de etiqueta no dice "estable", solo dice nada. */
                  vista.celula.tipo === 'recepcion' ? 'Grupo de bienvenida' : 'Grupo estable',
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
                    fontSize: 16,
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
            {/* Avisos sin leer, arriba de todo (SIN_ACTIVIDAD, EVIDENCIA_VENCIDA…). Salen de la
                bandeja general filtrada por tipo: no hay lista paralela de alertas. Cada uno dice su
                causa y lleva al alumno. */}
            {hayAvisos ? (
              <Aparicion retardo={20} style={{ marginBottom: 4 }}>
                <TituloDeSeccion>{tituloDeAvisos(avisos.length, (vista?.grupos.length ?? 1) > 1)}</TituloDeSeccion>
                <View style={[estilos.evaluacion, { borderColor: c.border, backgroundColor: c.cardBg,
                  paddingVertical: 6 }]}>
                  {avisos.map((aviso, i) => {
                    const destino = destinoDe(aviso);
                    const alumno = destino
                      ? vista.todos.find(a => a.participanteId === destino.alumnoId)
                      : undefined;
                    /* Alumno de otro de sus grupos (D-141): se pasa a ese grupo y se abre su ficha. */
                    const deOtroGrupo = destino !== null && !alumno && esOtroDeMisGrupos(destino.grupoId, vista);
                    return (
                      <Pressable
                        key={aviso.id}
                        onPress={() => {
                          void marcarLeido(aviso.id);
                          /* Solo se abre si el alumno sigue en el grupo. Un aviso viejo de
                             alguien que ya rotó queda legible pero no lleva a ningún lado:
                             sus datos ya no son de este mentor (plan.md §10). */
                          if (alumno) onAbrirAlumno(alumno);
                          else if (deOtroGrupo && destino) {
                            void onElegirGrupo(destino.grupoId).then(nueva => {
                              const enSuGrupo = nueva?.todos.find(a => a.participanteId === destino.alumnoId);
                              if (enSuGrupo) onAbrirAlumno(enSuGrupo);
                            });
                          }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={aviso.body}
                        style={[estilos.aviso, i > 0 ? { borderTopWidth: 1, borderTopColor: c.border } : null]}
                      >
                        <Icon name="clock" size={16} color={c.goldInk} />
                        <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23, flex: 1 }]}>
                          {aviso.body}
                        </Text>
                        {alumno || deOtroGrupo ? <Icon name="chevron" size={14} color={c.chevron} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </Aparicion>
            ) : null}

            {/* El semáforo manda (26/09, S-1): «Necesitan tu ayuda esta semana» y el resto del
                grupo, persona por persona, con palabra y color. La envoltura mide dónde cae, para
                poder llevar el scroll hasta acá desde el aviso del sábado. */}
            <View onLayout={alMedirSemaforo}>
              <SeccionSemaforoDelGrupo
                lectura={semaforo}
                onAbrirAprendiz={aprendizId => {
                  /* Solo si sigue en el padrón: la ficha necesita al alumno entero, y alguien
                     que ya rotó no es de este mentor (mismo criterio que los avisos). */
                  const alumno = vista.todos.find(a => a.participanteId === aprendizId);
                  return alumno ? () => onAbrirAlumno(alumno) : undefined;
                }}
              />
            </View>

            {/* Sin semáforo (servidor sin la ruta, o sin permiso) queda la lista simple del grupo:
                los nombres, para poder abrir a cada uno. Sin estados inventados. */}
            {sinSemaforo ? (
              <Aparicion retardo={60} style={{ marginTop: 18 }}>
                <TituloDeSeccion>Tu grupo</TituloDeSeccion>
                <View style={[estilos.lista, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                  {vista.todos.map(a => (
                    <FilaAlumno key={a.participanteId} alumno={a} onPress={() => onAbrirAlumno(a)} />
                  ))}
                </View>
              </Aparicion>
            ) : null}

            {/* Mi evaluación. El porcentaje llega calculado del servidor: la app no lo
                recalcula, para que nunca diga un número distinto del que ve el administrador. */}
            {hayEvaluacion && evaluacion ? (
              <Aparicion retardo={80} style={{ marginTop: 22 }}>
                <TituloDeSeccion>Mi evaluación</TituloDeSeccion>
                <View style={[estilos.evaluacion, { borderColor: c.border, backgroundColor: c.cardBg }]}>
                  <View style={estilos.filaEvaluacion}>
                    <Text style={[estilos.cifraValor, { color: c.textStrong, fontSize: 28 }]}>
                      {evaluacion.porcentaje === null
                        ? '—'
                        : `${Math.round(evaluacion.porcentaje)}%`}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[t.body, { color: c.text, fontSize: 16, fontFamily: 'Jost_500Medium' }]}>
                        {textoDeEstado(evaluacion.estado)}
                      </Text>
                      {evaluacion.estado === 'CALCULADA' ? (
                        <Text style={[t.body, { color: c.textSoft, fontSize: 16, marginTop: 2 }]}>
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
                  {hayRanking ? (
                    <View style={[estilos.posicion, { borderTopColor: c.border }]}>
                      {/* Este mes o cómo terminó el anterior (dueño, 2026-10-01). */}
                      <View style={[estilos.pildoras, { marginBottom: 6 }]}>
                        <Pildora texto="Este mes" activa={mesDelRanking === 'actual'} onPress={() => setMesDelRanking('actual')} />
                        <Pildora texto="Mes anterior" activa={mesDelRanking === 'anterior'} onPress={() => setMesDelRanking('anterior')} />
                      </View>
                      {miFila ? (
                        <>
                          <Text style={[t.body, { color: c.text, fontSize: 16 }]}>
                            {mesDelRanking === 'actual'
                              ? `Tu grupo va en el puesto ${miFila.posicion} de ${gruposEnCohorte} en la generación`
                              : `Tu grupo terminó en el puesto ${miFila.posicion} de ${gruposEnCohorte} en la generación`}
                          </Text>
                          <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>
                            {miFila.porcentaje === null
                              ? mesDelRanking === 'actual'
                                ? 'Todavía sin actividad para medir este mes'
                                : 'Sin actividad para medir ese mes'
                              : `${Math.round(miFila.porcentaje)}% del grupo · ${miFila.muestra} ${
                                  miFila.muestra === 1 ? 'aprendiz medido' : 'aprendices medidos'
                                }`}
                          </Text>
                        </>
                      ) : ranking ? (
                        <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>
                          {mesDelRanking === 'actual'
                            ? 'Tu grupo todavía no figura en el ranking de este mes'
                            : 'Tu grupo no figuró en el ranking de ese mes'}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  <Text style={[t.body, { color: c.textSoft, fontSize: 14 /* metadato */, marginTop: 10, lineHeight: 20 }]}>
                    Se promedia el porcentaje de cada aprendiz, no el total de evidencias. Cuenta la
                    entrega dentro de tu período; la verificación se informa aparte
                    {evaluacion.verificadas > 0 ? ` (${evaluacion.verificadas} verificadas)` : ''}.
                  </Text>
                </View>
              </Aparicion>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Una opción de los selectores de la pantalla (grupo, mes). 44 px de alto: se toca con el pulgar. */
function Pildora({ texto, activa, onPress }: { texto: string; activa: boolean; onPress: () => void }) {
  const { c, t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: activa }}
      hitSlop={4}
      style={[
        estilos.pildora,
        { borderColor: activa ? c.gold : c.border, backgroundColor: activa ? c.goldWash : 'transparent' },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[t.body, { color: activa ? c.goldInk : c.textSoft, fontFamily: activa ? 'Jost_700Bold' : 'Jost_500Medium', fontSize: 16 }]}
      >
        {texto}
      </Text>
    </Pressable>
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
      return 'Cuánto cumplieron tus aprendices este mes';
    case 'SIN_MUESTRA':
      return 'Este mes todavía no vencieron evidencias que medir';
    default:
      return 'Todavía sin actividad para medir en este período';
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
  volver: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 48 },
  insignia: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  contenido: { flexGrow: 1, paddingTop: 8, paddingBottom: ESPACIO_PARA_LANZADOR },
  cifraValor: {
    fontFamily: 'Jost_500Medium', fontSize: 23, lineHeight: 27,
    fontVariant: ['tabular-nums'],
  },
  lista: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, marginTop: 8 },
  pildoras: { flexDirection: 'row', gap: 8 },
  pildora: {
    minHeight: 44, maxWidth: 240, justifyContent: 'center',
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 14,
  },
});

