import { fuentes } from '../../../theme/fuentes';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Alert } from '../../../components/Alerta';
import { Icon } from '../../../components/Icon';
import { Aparicion } from '../../../components/Aparicion';
import { BotonSecundario } from '../../../components/Legible';
import { Presionable } from '../../../components/Presionable';
import { CodigoRenaserDelAlumno } from './CodigoRenaserDelAlumno';
import { AvatarConSemaforo } from './AvatarConSemaforo';
import { HojaDeNotas } from './HojaDeNotas';
import { BotonDeChat, BotonDeNota } from './IconosDeLaCabecera';
import { MesDeColores } from './MesDeColores';
import { PilarDeHabitos } from './PilarDeHabitos';
import { SemanaDeCirculos } from './SemanaDeCirculos';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { ChipDeCaja } from '../../caja/components/ChipDeCaja';
import { ObjetivosDeLaFicha } from '../../objetivos/components/ObjetivosDeLaFicha';
import { EvidenciaDeObligacion } from '../../lider-mentores/components/EvidenciaDeObligacion';
import { CierresDelDia } from '../../cierre/components/CierresDelDia';
import { OchentaVeinteDeLaFicha } from '../../ochenta-veinte/components/OchentaVeinteDeLaFicha';
import { SeccionDelDiagnosticoDeLaPersona } from '../../diagnostico/components/SeccionDelDiagnosticoDeLaPersona';
import { TiempoLibreDeLaSemana } from '../../huecos/components/TiempoLibreDeLaSemana';
import { fechaEnZona } from '../../eventos/utils/zonaHoraria';
import { mesDeLaFecha, type Mes } from '../../eventos/utils/calendarioDelMes';
import type { ColorSemaforo } from '../../semaforo/types/semaforo.types';
import { useAvisosDelAprendiz } from '../hooks/useAvisosDelAprendiz';
import { useDiasDelMes } from '../hooks/useDiasDelMes';
import { useEscribirleAlAprendiz } from '../hooks/useEscribirleAlAprendiz';
import { useNotasDelAprendiz } from '../hooks/useNotasDelAprendiz';
import { useSemanasDelAprendiz } from '../hooks/useSemanasDelAprendiz';
import { diasDeLaSemana, nombreDelMesDe, sePuedeElegir, tituloDelDia, viernesDeLaSemana } from '../utils/fechasDeLaFicha';
import { agruparPorPilar } from '../utils/habitosDelDia';
import { lecturasDeLaFicha, type OrigenDeLaFicha } from '../utils/lecturasDeLaFicha';
import { estadoDeLaSemana, motivoCorto } from '../utils/motivoDeLaFila';
import type { AlumnoConEstado } from '../types/mentor.types';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';

/** Lo que la ficha le cuenta a la ranura `pie`: la semana que se está viendo, para que un botón (Descargar semana) pida ESA. */
export interface ContextoDeLaFicha {
  /** El viernes de la semana a la vista, o `null` si es la que está en curso (el servidor la decide en la zona de la persona). */
  semanaHasta: string | null;
}

export interface PropsDeFichaDePersona {
  /** Quién la abre y por qué puerta lee: el mentor desde su grupo, o el líder con o sin grupo (`lecturasDeLaFicha`). */
  origen: OrigenDeLaFicha;
  /** La persona de la ficha (`alumnoDesdeLaInfo` arma uno desde lo que ya se sabe de ella). */
  alumno: AlumnoConEstado;
  onVolver: () => void;
  /** El servidor respondió que ya no lo acompaña: quien llama vuelve a la lista (con `motivo` a la vista). Sin esto, se vuelve atrás con un aviso. */
  onYaNoAcompana?: (motivo: string) => void;
  rotuloDeVolver?: string;
  /** Botones de más en la cabecera, entre el lápiz de notas y el chat (por ejemplo, la estrella de la ficha de un mentor). */
  accionesDeCabecera?: React.ReactNode;
  /** Contenido propio de quien abre la ficha, DESPUÉS de las secciones del final (por ejemplo, «Como mentor»). Sin contenido no deja hueco. */
  despues?: React.ReactNode;
  /**
   * Spec 056 FR-034: una línea de confirmación (`ConfirmacionEnLinea`) que queda FIJA entre la flecha y el scroll, a la vista en cualquier parte de la página. Los botones
   * van al final de una ficha larga: una confirmación puesta ahí (en `pie`) quedaba fuera de pantalla al cerrarse la hoja. Sin contenido no deja hueco.
   */
  aviso?: React.ReactNode;
  /** Lo último de la ficha, para los botones («Descargar semana», «Avisar a su mentor»). Con función, recibe la semana a la vista. Sin contenido no deja hueco. */
  pie?: React.ReactNode | ((contexto: ContextoDeLaFicha) => React.ReactNode);
  /**
   * Spec 056 FR-022: la persona no sigue su programa (un mentor que no lo activó). En lugar de la semana y los pilares va este contenido (una línea que lo
   * dice) y no se pide ni la semana ni nada que dependa del programa. Sin esto, la ficha es la de siempre.
   */
  sinSemana?: React.ReactNode;
  /** Spec 056 FR-023: sin el lápiz de las notas (las notas privadas son sobre aprendices; la ficha de un mentor lleva la estrella en su lugar). */
  sinNotas?: boolean;
  /** La línea bajo el nombre, si no es «Día N · motivo» (la ficha de un mentor dice su nivel). */
  subtitulo?: string | null;
}

/**
 * La ficha de una persona (spec 055, historia 2; bocetos aprobados por el dueño el 17/11) para quien la acompaña: su mentor o, desde la
 * spec 056, el líder de su formación. Todo en un solo scroll:
 *
 * 1. Arriba: la foto con el color de su semáforo en el borde, el nombre, «Día N · motivo», el lápiz de notas (con un puntito si hay)
 *    y el chat.
 * 2. La semana en siete círculos (sábado a viernes) con el color de cada día y el día elegido con un anillo dorado; «<Mes> ⌄»
 *    despliega el mes en el mismo lugar y «Ver solo la semana» lo pliega.
 * 3. El título del día con «N de M» y los pilares (Cuerpo, Mente, Espíritu, Emociones) como secciones; cada hábito con su estado, el
 *    ojo de la evidencia y su hora.
 * 4. Al final, lo que ya existía y se queda: Objetivos (solo el líder los lee), Código Renaser (si está encendido), Diagnóstico, 80/20 de
 *    SER, Tiempo libre, los cierres del día y la caja. Cada uno se dibuja solo cuando tiene algo que mostrar: nada de huecos.
 *
 * Las semanas vienen de `…/semana` (la caché y el adelanto de la anterior viven en `useSemanasDelAprendiz`) y los colores de `…/dias`.
 * De dónde lee cada cosa lo decide `lecturasDeLaFicha(origen, persona)`. Los días y las horas son los de la persona, no los del
 * teléfono. Si el servidor dice que ya no lo acompaña, se vuelve a «Mis grupos» con ese motivo (`onYaNoAcompana`) y no queda nada de
 * la persona en pantalla. El líder lee las notas privadas pero no las escribe.
 *
 * Las ranuras (`accionesDeCabecera`, `despues`, `pie`) son de quien la abre: `AlumnoScreen` es el envoltorio del mentor.
 */
export function FichaDePersona({
  origen,
  alumno,
  onVolver,
  onYaNoAcompana,
  rotuloDeVolver = 'Mi grupo',
  accionesDeCabecera,
  despues,
  pie,
  aviso,
  sinSemana,
  sinNotas = false,
  subtitulo,
}: PropsDeFichaDePersona) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth, isTablet } = useResponsive();

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const nombre = alumno.nombre?.trim() || 'Aprendiz sin nombre';
  const aprendizId = alumno.participanteId;

  const avisarQueYaNoLoAcompana = onYaNoAcompana ?? ((motivo: string) => {
    Alert.alert('Ya no acompañas a este aprendiz', motivo);
    onVolver();
  });
  /* Las lecturas son de este origen y esta persona, y estables: las secciones del final las usan como llave de lo que guardan. */
  const { quien, grupoId } = origen;
  const sinPrograma = sinSemana !== undefined && sinSemana !== null && sinSemana !== false;
  /* Una persona que no sigue su programa (`sinPrograma`) no tiene nada que pedirle al servidor: `lecturasDeLaFicha` no le da ninguna lectura. */
  const lecturas = useMemo(() => lecturasDeLaFicha({ quien, grupoId }, aprendizId, { sinPrograma }), [quien, grupoId, aprendizId, sinPrograma]);
  const semanas = useSemanasDelAprendiz(lecturas.cargarSemana, aprendizId, avisarQueYaNoLoAcompana);
  const colores = useDiasDelMes(lecturas.cargarDias, aprendizId);
  /* Los avisos de acompañamiento son del mentor: abrir la ficha los deja leídos. El líder no los recibe. */
  const { motivoDelAviso } = useAvisosDelAprendiz(quien === 'mentor' && grupoId ? aprendizId : null);
  const { escribiendoId, escribirle } = useEscribirleAlAprendiz();
  const notas = useNotasDelAprendiz(sinNotas ? null : lecturas.origenDeLasNotas);

  const enCurso = semanas.semanaEnCurso;
  const zona = enCurso?.zona ?? null;
  const hoy = enCurso ? fechaEnZona(Date.now(), zona) : null;
  const diaUno = enCurso?.diaUno ?? null;

  const [elegido, setElegido] = useState<string | null>(null);
  const [mesAbierto, setMesAbierto] = useState(false);
  const [mesVisible, setMesVisible] = useState<Mes | null>(null);
  const [notasAbiertas, setNotasAbiertas] = useState(false);
  const [evidenciaAbierta, setEvidenciaAbierta] = useState<string | null>(null);

  /* Al abrir, hoy (en la zona del aprendiz) queda elegido. */
  useEffect(() => {
    if (hoy && elegido === null) setElegido(hoy);
  }, [hoy, elegido]);

  const diaElegido = elegido ?? hoy;
  const viernes = diaElegido ? viernesDeLaSemana(diaElegido) : enCurso?.hasta ?? null;
  const fechasDeLaSemana = useMemo(() => (viernes ? diasDeLaSemana(viernes) : []), [viernes]);
  const semana = viernes ? semanas.semanaDe(viernes) : null;
  const estadoDeLaSemanaElegida = viernes ? semanas.estadoDe(viernes) : 'sin_pedir';

  /* Los colores de la semana a la vista, y del mes si está desplegado: un pedido por mes. */
  const asegurarMes = colores.asegurarMes;
  useEffect(() => {
    if (fechasDeLaSemana.length > 0) {
      asegurarMes(fechasDeLaSemana[0]);
      asegurarMes(fechasDeLaSemana[6]);
    }
  }, [fechasDeLaSemana, asegurarMes]);
  useEffect(() => {
    if (mesAbierto && mesVisible) asegurarMes(`${mesVisible.anio}-${String(mesVisible.mes).padStart(2, '0')}-01`);
  }, [mesAbierto, mesVisible, asegurarMes]);

  const colorDe = (fecha: string): ColorSemaforo | null => colores.diaDe(fecha)?.color ?? null;

  const elegir = (fecha: string) => {
    setElegido(fecha);
    semanas.pedirFecha(fecha);
  };

  const dentroDelPrograma = Boolean(diaElegido && hoy && sePuedeElegir(diaElegido, diaUno, hoy));
  const dia = semana?.dias.find(d => d.fecha === diaElegido) ?? null;
  const pilares = useMemo(() => agruparPorPilar(dia?.obligaciones ?? [], semana?.zona ?? zona), [dia, semana, zona]);
  const totalDelDia = pilares.reduce((s, p) => s + p.total, 0);
  const cumplidosDelDia = pilares.reduce((s, p) => s + p.cumplidos, 0);

  /* La evidencia: los hábitos del día con evidencia, en el orden en que se ven, para ir al anterior y al siguiente sin cerrar. */
  const conEvidencia = useMemo(() => pilares.flatMap(p => p.habitos.filter(h => h.conEvidencia).map(h => ({ ...h, pilar: p.titulo }))), [pilares]);
  const posicionDeLaEvidencia = conEvidencia.findIndex(h => h.obligacion.registroId === evidenciaAbierta);
  const habitoConEvidencia = posicionDeLaEvidencia >= 0 ? conEvidencia[posicionDeLaEvidencia] : null;

  /* Cabecera: el color de la semana en curso, «Día N» y el motivo. */
  const colorDeLaCabecera: ColorSemaforo = enCurso ? enCurso.color : 'SIN_DATOS';
  const diasDeColorDeLaSemanaEnCurso = enCurso ? diasDeLaSemana(enCurso.hasta).flatMap(f => (colores.diaDe(f) ? [colores.diaDe(f) as { color: ColorSemaforo }] : [])) : [];
  const diaDePrograma = enCurso?.dias.find(d => d.fecha === hoy)?.diaDePrograma ?? alumno.diaPrograma;
  const motivo = !enCurso
    ? null
    : diaUno === null
      ? 'Todavía no empieza su programa'
      : (motivoDelAviso ? motivoCorto(motivoDelAviso, nombre) : null) ?? estadoDeLaSemana(colorDeLaCabecera, diasDeColorDeLaSemanaEnCurso, enCurso.etiqueta ?? null);
  const subtituloDeLaCabecera = subtitulo ?? [diaDePrograma && diaDePrograma > 0 ? `Día ${diaDePrograma}` : null, motivo].filter(Boolean).join(' · ');

  const falloDeLaSemana = viernes ? semanas.falloDe(viernes) : null;

  /* El pie sabe qué semana se está viendo: la en curso se pide sin fecha; una anterior, por su viernes. */
  const semanaHasta = viernes && enCurso && viernes !== enCurso.hasta ? viernes : null;
  const contenidoDelPie = enCurso || sinPrograma ? (typeof pie === 'function' ? pie({ semanaHasta }) : pie) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[estilos.barra, { paddingHorizontal: horizontalPadding }]}>
        <Presionable onPress={onVolver} hitSlop={12} accessibilityRole="button" accessibilityLabel={`Volver a ${rotuloDeVolver.toLowerCase()}`} style={estilos.volver}>
          <Icon name="arrowLeft" size={15} color={c.goldInk} />
          <Text style={[t.body, { color: c.goldInk, fontFamily: fuentes.media, fontSize: 16 }]}>{rotuloDeVolver}</Text>
        </Presionable>
      </View>

      {aviso ? <View style={[estilos.aviso, { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: isTablet ? 'center' : 'stretch', width: isTablet ? '100%' : undefined }]}>{aviso}</View> : null}

      <ScrollView
        {...barraAlDesplazar}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          estilos.contenido,
          { paddingHorizontal: horizontalPadding, maxWidth: contentMaxWidth, alignSelf: isTablet ? 'center' : 'stretch', width: isTablet ? '100%' : undefined },
        ]}
      >
        {/* 1. La cabecera. */}
        <Aparicion>
          <View style={estilos.cabecera}>
            <AvatarConSemaforo nombre={nombre} avatarUrl={enCurso?.avatarUrl ?? null} color={colorDeLaCabecera} size={56} />
            <View style={estilos.quien}>
              <Text style={[t.screenTitle, { color: c.text, fontSize: 21 }]} numberOfLines={2}>
                {nombre}
              </Text>
              {subtituloDeLaCabecera ? (
                <Text style={[t.body, { color: c.textSoft, fontSize: 15 /* metadato */, lineHeight: 20 }]} numberOfLines={2}>
                  {subtituloDeLaCabecera}
                </Text>
              ) : null}
            </View>
            {sinNotas ? null : <BotonDeNota nombre={nombre} conNotas={notas.hayNotas} onPress={() => setNotasAbiertas(true)} />}
            {accionesDeCabecera}
            <BotonDeChat nombre={nombre} ocupado={escribiendoId !== null} onPress={() => void escribirle(aprendizId, alumno.nombre)} />
          </View>
        </Aparicion>

        {/* La primera lectura: cargando o con su motivo, nunca un hueco. Sin programa (un mentor que no lo sigue) va su línea en lugar de la semana y los pilares. */}
        {sinPrograma ? (
          <View style={{ marginTop: 18 }}>{sinSemana}</View>
        ) : !enCurso ? (
          semanas.falloDeLaPrimera ? (
            <View style={{ marginTop: 18, gap: 10 }}>
              <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>{semanas.falloDeLaPrimera.mensaje}</Text>
              <BotonSecundario etiqueta="Reintentar" onPress={semanas.reintentarLaPrimera} />
            </View>
          ) : (
            <Text style={[t.body, { color: c.textSoft, fontSize: 16, marginTop: 18 }]}>Cargando la ficha…</Text>
          )
        ) : (
          <>
            {/* 2. La semana o el mes. */}
            <Aparicion retardo={40} style={{ marginTop: 14 }}>
              {mesAbierto && mesVisible && hoy ? (
                <MesDeColores
                  mes={mesVisible}
                  hoy={hoy}
                  diaUno={diaUno}
                  elegido={diaElegido}
                  colorDe={colorDe}
                  onElegir={elegir}
                  onCambiarMes={setMesVisible}
                />
              ) : hoy ? (
                <SemanaDeCirculos fechas={fechasDeLaSemana} elegido={diaElegido} hoy={hoy} diaUno={diaUno} colorDe={colorDe} onElegir={elegir} />
              ) : null}
              {diaElegido ? (
                <Presionable
                  onPress={() => {
                    setMesVisible(mesDeLaFecha(diaElegido));
                    setMesAbierto(abierto => !abierto);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: mesAbierto }}
                  accessibilityLabel={mesAbierto ? 'Ver solo la semana' : `${nombreDelMesDe(diaElegido)}, ver el mes`}
                  style={estilos.enlaceDelMes}
                >
                  <Text style={[t.body, { color: c.goldInk, fontFamily: fuentes.media, fontSize: 16 }]}>
                    {mesAbierto ? 'Ver solo la semana' : nombreDelMesDe(diaElegido)}
                  </Text>
                  <View style={{ transform: [{ rotate: mesAbierto ? '270deg' : '90deg' }] }}>
                    <Icon name="chevron" size={14} color={c.goldInk} />
                  </View>
                </Presionable>
              ) : null}
            </Aparicion>

            {/* 3. El día elegido, por pilares. */}
            {diaElegido ? (
              <View style={{ marginTop: 6, gap: 10 }}>
                <View style={estilos.tituloDelDia}>
                  <Text accessibilityRole="header" style={[t.cardTitle, { color: c.textStrong, flexShrink: 1 }]}>
                    {tituloDelDia(diaElegido)}
                  </Text>
                  {dentroDelPrograma && semana && totalDelDia > 0 ? (
                    <Text style={[t.body, { color: c.textSoft, fontSize: 15 /* metadato */, fontVariant: ['tabular-nums'] }]}>
                      {cumplidosDelDia} de {totalDelDia}
                    </Text>
                  ) : null}
                </View>

                {!dentroDelPrograma ? (
                  <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>
                    {diaUno === null ? `${nombre} todavía no empieza su programa.` : 'Este día queda fuera de su programa.'}
                  </Text>
                ) : semana ? (
                  pilares.length === 0 ? (
                    <Text style={[t.body, { color: c.textSoft, fontSize: 16}]}>Sin hábitos programados este día.</Text>
                  ) : (
                    pilares.map(p => <PilarDeHabitos key={`${diaElegido}-${p.clave}`} pilar={p} onVerEvidencia={setEvidenciaAbierta} />)
                  )
                ) : falloDeLaSemana ? (
                  <View style={{ gap: 10 }}>
                    <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>{falloDeLaSemana.mensaje}</Text>
                    {viernes ? <BotonSecundario etiqueta="Reintentar" onPress={() => semanas.reintentar(viernes)} /> : null}
                  </View>
                ) : (
                  <Text style={[t.body, { color: c.textSoft, fontSize: 16}]}>
                    {estadoDeLaSemanaElegida === 'cargando' || estadoDeLaSemanaElegida === 'sin_pedir' ? 'Cargando los hábitos…' : 'No se pudo cargar este día.'}
                  </Text>
                )}
              </View>
            ) : null}
          </>
        )}

        {/* 4. Lo que ya existía, al final. Cada sección se dibuja sola o no se dibuja. */}
        <ObjetivosDeLaFicha cargar={lecturas.cargarObjetivos} />
        {quien === 'mentor' ? <ChipDeCaja origen={{ quien: 'mentor', aprendizId: alumno.participanteId }} margenArriba={18} /> : null}
        <CodigoRenaserDelAlumno cargar={lecturas.cargarRadar} />
        <TiempoLibreDeLaSemana cargar={lecturas.cargarHuecos} />
        <CierresDelDia cargar={lecturas.cargarCierres} />
        <OchentaVeinteDeLaFicha cargar={lecturas.cargarOchentaVeinte} />
        <SeccionDelDiagnosticoDeLaPersona cargar={lecturas.cargarDiagnostico} />

        {/* 5. Lo de quien abre la ficha: contenido propio y, al final, sus botones. Sin contenido, sin hueco. */}
        {despues ? <View style={estilos.ranura}>{despues}</View> : null}
        {contenidoDelPie ? <View style={estilos.ranura}>{contenidoDelPie}</View> : null}
      </ScrollView>

      {/* La evidencia de un hábito cumplido: foto, audio, video o texto, con anterior y siguiente dentro del día. */}
      {habitoConEvidencia ? (
        <EvidenciaDeObligacion
          titulo={habitoConEvidencia.obligacion.titulo}
          evidencias={habitoConEvidencia.obligacion.evidencias}
          respuestaTexto={habitoConEvidencia.obligacion.respuestaTexto}
          abierta
          alCerrar={() => setEvidenciaAbierta(null)}
          subtitulo={[habitoConEvidencia.hora, habitoConEvidencia.pilar].filter(Boolean).join(' · ') || 'Evidencia'}
          publicacionId={habitoConEvidencia.obligacion.publicacionId}
          navegacion={{
            alAnterior: posicionDeLaEvidencia > 0 ? () => setEvidenciaAbierta(conEvidencia[posicionDeLaEvidencia - 1].obligacion.registroId) : undefined,
            alSiguiente:
              posicionDeLaEvidencia < conEvidencia.length - 1 ? () => setEvidenciaAbierta(conEvidencia[posicionDeLaEvidencia + 1].obligacion.registroId) : undefined,
          }}
        />
      ) : null}

      {sinNotas ? null : <HojaDeNotas
        visible={notasAbiertas}
        alCerrar={() => setNotasAbiertas(false)}
        nombre={nombre}
        soloLectura={quien === 'lider'}
        notas={notas.notas}
        cargando={notas.cargando}
        fallo={notas.fallo}
        guardando={notas.guardando}
        falloAlGuardar={notas.falloAlGuardar}
        onGuardar={notas.guardar}
        onCorregir={notas.corregir}
      />}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  aviso: { paddingBottom: 6 },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 48 },
  contenido: { flexGrow: 1, paddingTop: 8, paddingBottom: ESPACIO_PARA_LANZADOR },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quien: { flex: 1, minWidth: 0, gap: 2 },
  enlaceDelMes: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, alignSelf: 'flex-start' },
  ranura: { marginTop: 20, gap: 12 },
  tituloDelDia: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
});
