import { fuentes } from '../../../theme/fuentes';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Alert } from '../../../components/Alerta';
import { Icon } from '../../../components/Icon';
import { Aparicion } from '../../../components/Aparicion';
import { BotonSecundario } from '../../../components/Legible';
import { Presionable } from '../../../components/Presionable';
import { CodigoRenaserDelAlumno } from '../components/CodigoRenaserDelAlumno';
import { AvatarConSemaforo } from '../components/AvatarConSemaforo';
import { HojaDeNotas } from '../components/HojaDeNotas';
import { BotonDeChat, BotonDeNota } from '../components/IconosDeLaCabecera';
import { MesDeColores } from '../components/MesDeColores';
import { PilarDeHabitos } from '../components/PilarDeHabitos';
import { SemanaDeCirculos } from '../components/SemanaDeCirculos';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { ChipDeCaja } from '../../caja/components/ChipDeCaja';
import { EvidenciaDeObligacion } from '../../lider-mentores/components/EvidenciaDeObligacion';
import { obtenerRadarDeAlumno } from '../api/mentorApi';
import { obtenerCierresDeAlumno } from '../../cierre/api/cierreApi';
import { CierresDelDia } from '../../cierre/components/CierresDelDia';
import { obtenerOchentaVeinteDeUnAlumno } from '../../ochenta-veinte/api/ochentaVeinteApi';
import { OchentaVeinteDeLaFicha } from '../../ochenta-veinte/components/OchentaVeinteDeLaFicha';
import type { CargarOchentaVeinte } from '../../ochenta-veinte/types/ochentaVeinte.types';
import { lecturaParaElMentor } from '../../diagnostico/api/diagnosticoLecturaApi';
import { SeccionDelDiagnosticoDeLaPersona } from '../../diagnostico/components/SeccionDelDiagnosticoDeLaPersona';
import type { CargarLecturaDelDiagnostico } from '../../diagnostico/hooks/useLecturaDelDiagnostico';
import type { CargarCierres } from '../../cierre/types/cierre.types';
import { obtenerHuecosDeAlumno } from '../../huecos/api/huecosApi';
import { TiempoLibreDeLaSemana } from '../../huecos/components/TiempoLibreDeLaSemana';
import type { CargarHuecos } from '../../huecos/types/huecos.types';
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
import { estadoDeLaSemana } from '../utils/motivoDeLaFila';
import type { AlumnoConEstado } from '../types/mentor.types';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';

/**
 * La ficha de un aprendiz para su mentor (spec 055, historia 2; bocetos aprobados por el dueño el 17/11). Todo en un solo scroll:
 *
 * 1. Arriba: la foto con el color de su semáforo en el borde, el nombre, «Día N · motivo», el lápiz de notas (con un puntito si hay)
 *    y el chat.
 * 2. La semana en siete círculos (sábado a viernes) con el color de cada día y el día elegido con un anillo dorado; «<Mes> ⌄»
 *    despliega el mes en el mismo lugar y «Ver solo la semana» lo pliega.
 * 3. El título del día con «N de M» y los pilares (Cuerpo, Mente, Espíritu, Emociones) como secciones; cada hábito con su estado, el
 *    ojo de la evidencia y su hora.
 * 4. Al final, lo que ya existía y se queda: Código Renaser (si está encendido), Diagnóstico, 80/20 de SER, Tiempo libre, los cierres
 *    del día y la caja. Cada uno se dibuja solo cuando tiene algo que mostrar: nada de huecos.
 *
 * Las semanas vienen de `GET …/semana` (la caché y el adelanto de la anterior viven en `useSemanasDelAprendiz`) y los colores de `GET
 * …/dias`. Los días y las horas son los del aprendiz, no los del teléfono. Si el servidor dice que ya no lo acompaña, se vuelve a
 * «Mis grupos» con ese motivo (`onYaNoAcompana`) y no queda nada del aprendiz en pantalla.
 */
export function AlumnoScreen({
  alumno,
  grupoId,
  onVolver,
  onYaNoAcompana,
  rotuloDeVolver = 'Mi grupo',
}: {
  alumno: AlumnoConEstado;
  grupoId: string | null;
  onVolver: () => void;
  /** El servidor respondió que ya no lo acompaña: quien llama vuelve a la lista (con `motivo` a la vista). Sin esto, se vuelve atrás con un aviso. */
  onYaNoAcompana?: (motivo: string) => void;
  rotuloDeVolver?: string;
}) {
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
  const semanas = useSemanasDelAprendiz(grupoId, aprendizId, avisarQueYaNoLoAcompana);
  const colores = useDiasDelMes(grupoId, aprendizId);
  const { motivoDelAviso } = useAvisosDelAprendiz(grupoId ? aprendizId : null);
  const { escribiendoId, escribirle } = useEscribirleAlAprendiz();
  const notas = useNotasDelAprendiz(grupoId ? { quien: 'mentor', grupoId, aprendizId } : null);

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
      : motivoDelAviso ?? estadoDeLaSemana(colorDeLaCabecera, diasDeColorDeLaSemanaEnCurso, enCurso.etiqueta ?? null);
  const subtituloDeLaCabecera = [diaDePrograma && diaDePrograma > 0 ? `Día ${diaDePrograma}` : null, motivo].filter(Boolean).join(' · ');

  /* Las lecturas de las secciones del final (las de siempre, por la ruta del mentor): estables por persona. */
  const cargarRadar = useMemo(() => (grupoId ? (cursor?: string | null) => obtenerRadarDeAlumno(grupoId, aprendizId, cursor) : null), [grupoId, aprendizId]);
  const cargarHuecos = useMemo<CargarHuecos | null>(() => (grupoId ? (lunes?: string | null) => obtenerHuecosDeAlumno(grupoId, aprendizId, lunes) : null), [grupoId, aprendizId]);
  const cargarCierres = useMemo<CargarCierres | null>(() => (grupoId ? (lunes?: string | null) => obtenerCierresDeAlumno(grupoId, aprendizId, lunes) : null), [grupoId, aprendizId]);
  const cargarDiagnostico = useMemo<CargarLecturaDelDiagnostico | null>(() => (grupoId ? () => lecturaParaElMentor(grupoId, alumno.participanteId) : null), [grupoId, aprendizId]);
  const cargarOchentaVeinte = useMemo<CargarOchentaVeinte | null>(
    () => (grupoId ? (tipo, inicio) => obtenerOchentaVeinteDeUnAlumno(grupoId, aprendizId, tipo, inicio) : null),
    [grupoId, aprendizId],
  );

  const falloDeLaSemana = viernes ? semanas.falloDe(viernes) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[estilos.barra, { paddingHorizontal: horizontalPadding }]}>
        <Presionable onPress={onVolver} hitSlop={12} accessibilityRole="button" accessibilityLabel={`Volver a ${rotuloDeVolver.toLowerCase()}`} style={estilos.volver}>
          <Icon name="arrowLeft" size={15} color={c.goldInk} />
          <Text style={[t.body, { color: c.goldInk, fontFamily: fuentes.media, fontSize: 16 }]}>{rotuloDeVolver}</Text>
        </Presionable>
      </View>

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
                <Text style={[t.body, { color: c.textSoft, fontSize: 14.5, lineHeight: 20 }]} numberOfLines={2}>
                  {subtituloDeLaCabecera}
                </Text>
              ) : null}
            </View>
            <BotonDeNota nombre={nombre} conNotas={notas.hayNotas} onPress={() => setNotasAbiertas(true)} />
            <BotonDeChat nombre={nombre} ocupado={escribiendoId !== null} onPress={() => void escribirle(aprendizId, alumno.nombre)} />
          </View>
        </Aparicion>

        {/* La primera lectura: cargando o con su motivo, nunca un hueco. */}
        {!enCurso ? (
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
                    <Text style={[t.body, { color: c.textSoft, fontSize: 15, fontVariant: ['tabular-nums'] }]}>
                      {cumplidosDelDia} de {totalDelDia}
                    </Text>
                  ) : null}
                </View>

                {!dentroDelPrograma ? (
                  <Text style={[t.body, { color: c.textSoft, fontSize: 15.5, lineHeight: 22 }]}>
                    {diaUno === null ? `${nombre} todavía no empieza su programa.` : 'Este día queda fuera de su programa.'}
                  </Text>
                ) : semana ? (
                  pilares.length === 0 ? (
                    <Text style={[t.body, { color: c.textSoft, fontSize: 15.5 }]}>Sin hábitos programados este día.</Text>
                  ) : (
                    pilares.map(p => <PilarDeHabitos key={`${diaElegido}-${p.clave}`} pilar={p} onVerEvidencia={setEvidenciaAbierta} />)
                  )
                ) : falloDeLaSemana ? (
                  <View style={{ gap: 10 }}>
                    <Text style={[t.body, { color: c.textSoft, fontSize: 15.5, lineHeight: 22 }]}>{falloDeLaSemana.mensaje}</Text>
                    {viernes ? <BotonSecundario etiqueta="Reintentar" onPress={() => semanas.reintentar(viernes)} /> : null}
                  </View>
                ) : (
                  <Text style={[t.body, { color: c.textSoft, fontSize: 15.5 }]}>
                    {estadoDeLaSemanaElegida === 'cargando' || estadoDeLaSemanaElegida === 'sin_pedir' ? 'Cargando los hábitos…' : 'No se pudo cargar este día.'}
                  </Text>
                )}
              </View>
            ) : null}
          </>
        )}

        {/* 4. Lo que ya existía, al final. Cada sección se dibuja sola o no se dibuja. */}
        <ChipDeCaja origen={{ quien: 'mentor', aprendizId: alumno.participanteId }} margenArriba={18} />
        <CodigoRenaserDelAlumno cargar={cargarRadar} />
        <TiempoLibreDeLaSemana cargar={cargarHuecos} />
        <CierresDelDia cargar={cargarCierres} />
        <OchentaVeinteDeLaFicha cargar={cargarOchentaVeinte} />
        <SeccionDelDiagnosticoDeLaPersona cargar={cargarDiagnostico} />
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

      <HojaDeNotas
        visible={notasAbiertas}
        alCerrar={() => setNotasAbiertas(false)}
        nombre={nombre}
        soloLectura={false}
        notas={notas.notas}
        cargando={notas.cargando}
        fallo={notas.fallo}
        guardando={notas.guardando}
        falloAlGuardar={notas.falloAlGuardar}
        onGuardar={notas.guardar}
        onCorregir={notas.corregir}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  volver: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 48 },
  contenido: { flexGrow: 1, paddingTop: 8, paddingBottom: ESPACIO_PARA_LANZADOR },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quien: { flex: 1, minWidth: 0, gap: 2 },
  enlaceDelMes: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, alignSelf: 'flex-start' },
  tituloDelDia: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
});
