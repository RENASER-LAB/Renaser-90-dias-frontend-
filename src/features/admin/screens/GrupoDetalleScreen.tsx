import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { useAuth } from '../../../context/AuthContext';
import { BotonPeligro, BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { obtenerFotoDelGrupo, type FotoDelGrupo } from '../../community/api/fotoDelGrupoApi';
import { CambiarFotoDelGrupo } from '../../community/components/CambiarFotoDelGrupo';
import { esAdministracionDeGrupos } from '../../chat/utils/infoDelChat';
import {
  agregarAprendiz,
  sumarAprendizAGrupo,
  aprendicesDisponibles,
  asignarMentor,
  mentoresDisponibles,
  nombresDeTodosLosGrupos,
  obtenerGrupo,
  quitarMentor,
  retirarAprendiz,
  sumarMentorAGrupo,
} from '../api/adminApi';
import { filtrarCandidatos } from '../utils/filtrarCandidatos';
import type { AprendizCandidatoApi, GrupoDetalleApi, MentorCandidatoApi } from '../api/adminSchemas';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import { EstadoDeGrupo } from '../components/EstadoDeGrupo';
import { fechaCorta, rangoDeFechas } from '../utils/fechas';
import { confirmar, avisar } from '../utils/dialogo';
import { mensajeDeFallo } from '../utils/mensajes';
import {
  avisoDeTrasladoDeMentor,
  nombresDeLosGrupos,
  otrosGruposDelMentor,
  planParaAsignarMentor,
  preguntaDeAsignarMentor,
  yaLideraEsteGrupo,
  listaDeNombres,
} from '../utils/asignarMentor';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';

const ESPECIALIDADES: Record<string, string> = {
  NEGOCIO: 'Negocio',
  MENTE: 'Mente',
  RELACIONES: 'Relaciones',
};

/**
 * La composición de un grupo: quién lo acompaña y quiénes lo cursan.
 *
 * Cada alta y cada baja es UNA operación del servidor con todos sus efectos —intervalo, punteros,
 * cupo y aviso al chat—; acá no se compone nada a mano ni se manda más de una llamada por acción.
 * Después de cada cambio se recarga el detalle en vez de parchear el estado local: el servidor
 * puede haber hecho más de lo que la pantalla pidió (cerrar la pertenencia anterior, dejar sin
 * mentor a otro grupo) y mostrar una versión optimista escondería justamente eso.
 *
 * Un grupo CERRADO se consulta pero no se compone: administración conserva la historia y no la
 * reescribe (ARF-18).
 */
export function GrupoDetalleScreen({
  grupoId,
  onVolver,
  onEditar,
}: {
  grupoId: string;
  onVolver: () => void;
  onEditar: (grupoId: string) => void;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  const [grupo, setGrupo] = useState<GrupoDetalleApi | null>(null);
  /* D-212: la foto del grupo la cambian el ADMIN, el Alquimista y el mentor de ese grupo. Acá, ADMIN y
     Alquimista.
     > Corregido 2026-09-27: decía «Acá, el ADMIN: el Alquimista entra a este panel pero el dueño no lo
     > nombró». En la página de decisiones el dueño lo sumó («sí»). */
  const { user } = useAuth();
  const esAdmin = esAdministracionDeGrupos(user?.role);
  const [fotoDelGrupo, setFotoDelGrupo] = useState<FotoDelGrupo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [eligiendo, setEligiendo] = useState<'mentor' | 'aprendiz' | null>(null);
  const [mentores, setMentores] = useState<MentorCandidatoApi[]>([]);
  /* E-372: el nombre de cada grupo, para decir cuáles conserva un mentor que se suma o cuáles se quedan sin
     mentor si se lo traslada. Si esa lectura falla, se cuentan en vez de nombrarse. */
  const [nombresDeGrupos, setNombresDeGrupos] = useState<Record<string, string>>({});
  const [candidatos, setCandidatos] = useState<AprendizCandidatoApi[]>([]);
  /**
   * Si la lista de candidatos se está trayendo todavía.
   *
   * Sin esto, el selector se abría con la lista vacía y el cartel «No hay aprendices activos sin
   * grupo» aparecía ANTES de que llegara la respuesta: la pantalla afirmaba que no hay nadie
   * cuando lo cierto es que todavía no lo sabía. Es el mismo error que ARF-02 prohíbe —una carga
   * convertida en cero—, y el más creíble de todos: nadie sospecha de una lista vacía. Lo destapó
   * E04, que tomaba esa rama y luego no encontraba el cartel porque ya habían llegado los veinte.
   */
  const [cargandoLista, setCargandoLista] = useState(false);
  /**
   * Por qué falló la lista del selector, o `null` si no falló.
   *
   * Antes, cualquier fallo al traer candidatos hacía dos cosas malas juntas: cerraba el selector
   * y avisaba con `mensajeDeFallo(e, '')`, que para un 500 o un 404 devuelve CADENA VACÍA. O sea
   * que el aviso salía sin texto —y en el build web, con los diálogos silenciados, no salía nada—
   * y lo único que veía el administrador era que la lista no aparecía. Indistinguible de "no hay
   * aprendices disponibles", que es justo lo que se reportó. Mismo error que ARF-02 prohíbe: un
   * fallo convertido en vacío.
   */
  const [errorLista, setErrorLista] = useState<string | null>(null);

  /** Lo escrito en el buscador del selector. Se limpia al abrirlo o cerrarlo. */
  const [busquedaCandidato, setBusquedaCandidato] = useState('');
  /* Se filtra en el cliente: la lista llega ENTERA del servidor, asi que buscar es recorrer un
     arreglo que ya esta en memoria. Ver `utils/filtrarCandidatos.ts`. */
  const candidatosVisibles = useMemo(
    () => filtrarCandidatos(candidatos, busquedaCandidato),
    [candidatos, busquedaCandidato],
  );

  useSystemBackHandler(() => {
    // El selector abierto se cierra primero: el gesto sube un nivel, no sale de la pantalla.
    if (eligiendo) {
      setEligiendo(null);
      return true;
    }
    onVolver();
    return true;
  });

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setGrupo(await obtenerGrupo(grupoId));
    } catch (e) {
      setError(mensajeDeFallo(e, 'No se pudo cargar el grupo.'));
    } finally {
      setCargando(false);
    }
  }, [grupoId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /** Si el grupo tiene foto propia. Si no se pudo saber, el control igual deja cambiarla. */
  const cargarFoto = useCallback(async () => {
    if (!esAdmin) return;
    try {
      setFotoDelGrupo(await obtenerFotoDelGrupo(grupoId));
    } catch {
      setFotoDelGrupo(null);
    }
  }, [esAdmin, grupoId]);

  useEffect(() => {
    void cargarFoto();
  }, [cargarFoto]);

  const conAviso = async (accion: () => Promise<unknown>, queFalla: string) => {
    setTrabajando(true);
    try {
      await accion();
      await cargar();
      setEligiendo(null);
    } catch (e) {
      avisar(queFalla, mensajeDeFallo(e, 'Inténtalo de nuevo en un momento.'));
    } finally {
      setTrabajando(false);
    }
  };

  /** Trae los candidatos del selector. El fallo se QUEDA en pantalla, con su motivo y un
   *  reintento, igual que la carga del grupo — no se cierra el selector ni se pierde el error. */
  const traerCandidatos = async (tipo: 'mentor' | 'aprendiz') => {
    setEligiendo(tipo);
    setCargandoLista(true);
    setErrorLista(null);
    setBusquedaCandidato('');
    try {
      if (tipo === 'mentor') {
        const [candidatos, nombres] = await Promise.all([
          mentoresDisponibles(),
          nombresDeTodosLosGrupos().catch(() => ({}) as Record<string, string>),
        ]);
        setMentores(candidatos);
        setNombresDeGrupos(nombres);
      } else {
        setCandidatos(await aprendicesDisponibles());
      }
    } catch (e) {
      // El texto por defecto NO puede ser vacío: es el que se usa justamente cuando el error no
      // trae nada legible (un 500, un 404), que es el caso en que más falta hace decir algo.
      setErrorLista(
        mensajeDeFallo(
          e,
          tipo === 'mentor'
            ? 'No pudimos traer la lista de mentores. Inténtalo de nuevo.'
            : 'No pudimos traer la lista de aprendices. Inténtalo de nuevo.',
        ),
      );
    } finally {
      setCargandoLista(false);
    }
  };

  const abrirSelectorDeMentor = () => void traerCandidatos('mentor');

  /**
   * «Asignar» SUMA por defecto (E-372; ver `utils/asignarMentor.ts`): el mentor conserva los grupos que ya
   * acompaña. Antes el panel trasladaba siempre y dejaba esos grupos sin mentor, en silencio (ADM-13). Si el
   * grupo tiene otro mentor y el elegido lidera otros grupos son dos operaciones —quitar al actual y
   * sumar—: si la segunda falla, el grupo queda sin mentor, y se dice para que se vuelva a elegir.
   */
  const asignarSumando = async (mentor: MentorCandidatoApi) => {
    if (!grupo) return;
    const quien = mentor.fullName ?? 'Esta persona';
    const plan = planParaAsignarMentor({ grupoId, mentorDelGrupoId: grupo.mentor?.id ?? null, mentor });
    if (plan.tipo === 'nada') {
      avisar('Ya es su mentor', `${quien} ya acompaña a ${grupo.name}.`);
      return;
    }
    const otros = nombresDeLosGrupos(otrosGruposDelMentor(mentor, grupoId), nombresDeGrupos);
    const acepto = await confirmar(
      otros.length > 0 ? 'Sumar mentor' : 'Asignar mentor',
      preguntaDeAsignarMentor(mentor.fullName, grupo.name, otros),
      { ok: otros.length > 0 ? 'Sumar' : 'Asignar' },
    );
    if (!acepto) return;
    void conAviso(async () => {
      if (plan.tipo === 'asignar') return asignarMentor(grupoId, mentor.userId);
      if (plan.quitarAlActual) await quitarMentor(grupoId);
      try {
        return await sumarMentorAGrupo(grupoId, mentor.userId);
      } catch (e) {
        if (!plan.quitarAlActual) throw e;
        throw new Error(`${grupo.name} quedó sin mentor: no se pudo sumar a ${quien}. Vuelve a elegirlo.`);
      }
    }, 'No se pudo asignar');
  };

  /**
   * El traslado, aparte y con aviso (E-372): lo saca de sus otros grupos, que se quedan sin mentor, y el aviso
   * los nombra. Es la única forma de llegar al `PUT …/mentor` cuando el mentor lidera otros grupos.
   */
  const trasladarAqui = async (mentor: MentorCandidatoApi) => {
    if (!grupo) return;
    const otros = nombresDeLosGrupos(otrosGruposDelMentor(mentor, grupoId), nombresDeGrupos);
    const acepto = await confirmar('Trasladar mentor', avisoDeTrasladoDeMentor(mentor.fullName, grupo.name, otros), {
      ok: 'Trasladar',
      destructivo: true,
    });
    if (acepto) void conAviso(() => asignarMentor(grupoId, mentor.userId), 'No se pudo trasladar');
  };
  const abrirSelectorDeAprendiz = () => void traerCandidatos('aprendiz');

  const cerrado = grupo?.status === 'CERRADO';
  const cupo = grupo?.capacity ?? null;
  const ocupadas = grupo?.learnerCount ?? grupo?.members.length ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin
        titulo={grupo?.name ?? 'Grupo'}
        subtitulo={grupo ? rangoDeFechas(grupo.periodStart ?? null, grupo.periodEnd ?? null) : null}
        onVolver={onVolver}
        accion={{ etiqueta: 'Editar', onPress: () => onEditar(grupoId) }}
      />
      <ScrollView
        {...barraAlDesplazar}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 16,
        }}
      >
        {cargando ? <ActivityIndicator color={c.goldInk} style={{ marginTop: 24 }} /> : null}

        {error ? (
          <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}>
            <Text style={[t.body, { color: c.danger, fontSize: 16 }]}>{error}</Text>
            <Pressable onPress={cargar} accessibilityRole="button" style={estilos.accionTexto}>
              <Text style={[t.body, { color: c.goldInk, fontSize: 16, fontWeight: '500' }]}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        {grupo ? (
          <>
            <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border, gap: 8 }]}>
              <EstadoDeGrupo estado={grupo.status ?? null} />
              <Text style={[t.body, { color: c.text, fontSize: 16 }]}>
                {grupo.type === 'RECEPCION'
                  ? 'Grupo de bienvenida · sin tope de plazas'
                  : cupo
                    ? `${ocupadas} de ${cupo} plazas ocupadas`
                    : `${ocupadas} aprendices`}
              </Text>
              {cerrado ? (
                <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
                  Este grupo terminó su período. Se conserva para consultarlo; para seguir, crea el
                  grupo siguiente y mueves a su gente ahí.
                </Text>
              ) : null}
              {grupo.status === 'PROGRAMADO' ? (
                <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
                  Todavía no arrancó. Puedes armarlo ahora: sus integrantes no tendrán acceso ni chat
                  hasta el día de comienzo.
                </Text>
              ) : null}
            </View>

            {/* ── Foto del grupo (D-212), solo para el ADMIN ──────────────── */}
            {esAdmin ? (
              <View style={{ gap: 10 }}>
                <TituloDeSeccion>Foto del grupo</TituloDeSeccion>
                <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
                  {fotoDelGrupo?.photoChangedAt
                    ? `Tiene foto propia desde el ${fechaCorta(diaLocal(fotoDelGrupo.photoChangedAt))}. La ven sus integrantes en el chat del grupo.`
                    : 'Usa la foto de Renaser, la tarjeta que trae la app.'}
                </Text>
                <CambiarFotoDelGrupo
                  grupoId={grupoId}
                  tieneFotoPropia={!!fotoDelGrupo?.photoChangedAt}
                  onCambiada={() => void cargarFoto()}
                />
              </View>
            ) : null}

            {/* ── Mentor ─────────────────────────────────────────────────── */}
            <View style={{ gap: 10 }}>
              <TituloDeSeccion>Mentor</TituloDeSeccion>
              {grupo.mentor ? (
                <View style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}>
                  <Text style={[t.body, { color: c.textStrong, fontSize: 16, flex: 1, flexShrink: 1 }]}>
                    {grupo.mentor.fullName ?? 'Sin nombre'}
                  </Text>
                  {!cerrado ? (
                    <BotonPeligro
                      etiqueta="Quitar"
                      accessibilityLabel="Quitar mentor"
                      deshabilitado={trabajando}
                      onPress={async () => {
                        if (await confirmar('Quitar mentor', '¿Dejar el grupo sin mentor asignado?', { ok: 'Quitar', destructivo: true })) {
                          void conAviso(() => quitarMentor(grupoId), 'No se pudo quitar');
                        }
                      }}
                    />
                  ) : null}
                </View>
              ) : (
                <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>
                  Sin mentor asignado. El grupo sigue siendo un grupo.
                </Text>
              )}
              {!cerrado ? (
                <BotonSecundario
                  etiqueta={grupo.mentor ? 'Cambiar mentor' : 'Asignar mentor'}
                  onPress={abrirSelectorDeMentor}
                />
              ) : null}
            </View>

            {/* ── Aprendices ─────────────────────────────────────────────── */}
            <View style={{ gap: 10 }}>
              <TituloDeSeccion>Aprendices</TituloDeSeccion>
              {grupo.members.length === 0 ? (
                <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Todavía no hay nadie.</Text>
              ) : null}
              {grupo.members.map(persona => (
                <View
                  key={persona.id}
                  style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}
                >
                  <Text style={[t.body, { color: c.textStrong, fontSize: 16, flex: 1, flexShrink: 1 }]}>
                    {persona.fullName ?? 'Sin nombre'}
                  </Text>
                  {!cerrado ? (
                    <BotonPeligro
                      etiqueta="Retirar"
                      accessibilityLabel={`Retirar a ${persona.fullName ?? 'esta persona'}`}
                      deshabilitado={trabajando}
                      onPress={async () => {
                        if (
                          await confirmar(
                            'Retirar del grupo',
                            `${persona.fullName ?? 'Esta persona'} dejará de pertenecer a ${grupo.name}. Su historial se conserva.`,
                            { ok: 'Retirar', destructivo: true },
                          )
                        ) {
                          void conAviso(() => retirarAprendiz(grupoId, persona.id), 'No se pudo retirar');
                        }
                      }}
                    />
                  ) : null}
                </View>
              ))}
              {!cerrado ? (
                <BotonSecundario etiqueta="Agregar aprendiz" onPress={abrirSelectorDeAprendiz} />
              ) : null}
            </View>

            {/* ── Selector ───────────────────────────────────────────────── */}
            {eligiendo ? (
              <View style={{ gap: 10 }}>
                <TituloDeSeccion>
                  {eligiendo === 'mentor' ? 'Elige un mentor' : 'Elige un aprendiz'}
                </TituloDeSeccion>
                {/* Buscador solo para aprendices: los mentores activos son un puñado y caben en
                    pantalla, mientras que el padrón de aprendices crece con cada cohorte. Un campo
                    que siempre devuelve la lista entera es ruido, no ayuda. */}
                {eligiendo === 'aprendiz' && !cargandoLista && !errorLista && candidatos.length > 0 ? (
                  <TextInput
                    value={busquedaCandidato}
                    onChangeText={setBusquedaCandidato}
                    placeholder="Buscar por nombre"
                    placeholderTextColor={c.micro}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="Buscar aprendiz para agregar al grupo"
                    style={[
                      t.body,
                      estilos.buscadorCandidato,
                      { backgroundColor: c.cardBg, borderColor: c.border, color: c.text, fontSize: 16 },
                    ]}
                  />
                ) : null}
                {eligiendo === 'mentor'
                  ? mentores.map(m => {
                      const otros = otrosGruposDelMentor(m, grupoId);
                      const nombres = nombresDeLosGrupos(otros, nombresDeGrupos);
                      const yaEsDeEste = yaLideraEsteGrupo(m, grupoId);
                      return (
                        <View key={m.userId} style={{ gap: 6 }}>
                          <Pressable
                            testID="candidato-mentor"
                            disabled={trabajando}
                            /* A-5 (26/09): se pregunta antes. E-372: y lo que se hace es SUMAR. */
                            onPress={() => void asignarSumando(m)}
                            accessibilityRole="button"
                            accessibilityLabel={m.fullName ?? 'Mentor'}
                            style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}
                          >
                            <View style={{ flex: 1, flexShrink: 1 }}>
                              <Text style={[t.body, { color: c.textStrong, fontSize: 16 }]}>
                                {m.fullName ?? 'Sin nombre'}
                              </Text>
                              <Text style={[t.body, { color: c.textSoft, fontSize: 16, marginTop: 2 }]}>
                                {/* Null NO se rellena con ninguna de las tres: el administrador elige
                                    por esto, y adivinarla sería decidir por él. */}
                                {m.specialty ? ESPECIALIDADES[m.specialty] ?? m.specialty : 'Sin especialidad definida'}
                                {/* Con `cellIds` (D-141) y no con `cellId`, que es solo el primero: el mentor
                                    de ESTE grupo no aparece como «de otro», y los otros se nombran. */}
                                {yaEsDeEste
                                  ? ' · ya lidera este grupo'
                                  : otros.length > 0
                                    ? ` · también acompaña a ${listaDeNombres(nombres)}`
                                    : ''}
                              </Text>
                            </View>
                            <Icon name="chevron" size={16} color={c.chevron} />
                          </Pressable>
                          {!yaEsDeEste && otros.length > 0 ? (
                            <BotonPeligro
                              etiqueta="Trasladar aquí"
                              accessibilityLabel={`Trasladar a ${m.fullName ?? 'este mentor'}: ${listaDeNombres(nombres)} se quedan sin mentor`}
                              deshabilitado={trabajando}
                              onPress={() => void trasladarAqui(m)}
                            />
                          ) : null}
                        </View>
                      );
                    })
                  : candidatosVisibles.map(a => (
                      <Pressable
                        key={a.userId}
                        testID="candidato-aprendiz"
                        disabled={trabajando}
                        onPress={() =>
                          void conAviso(
                            /* Dos operaciones distintas, decididas con el dato que la lista YA
                               trae: a quien no tiene grupo se lo da de alta; a quien ya tiene uno
                               se lo SUMA sin sacarlo del anterior. Usar siempre `agregarAprendiz`
                               lo trasladaria en silencio, y sacar a alguien de su grupo no es algo
                               que deba pasar por elegirlo en una lista. */
                            () =>
                              a.cellId
                                ? sumarAprendizAGrupo(grupoId, a.userId)
                                : agregarAprendiz(grupoId, a.userId),
                            'No se pudo agregar',
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel={a.fullName ?? 'Aprendiz'}
                        style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}
                      >
                        <Text style={[t.body, { color: c.textStrong, fontSize: 16, flex: 1, flexShrink: 1 }]}>
                          {a.fullName ?? 'Sin nombre'}
                          {/* Mismo criterio que la fila de mentores, que ya avisa "ya lidera otro
                              grupo": quien elige tiene que saber que esta persona no esta libre
                              antes de tocarla, no despues. */}
                          {a.cellId ? (a.cellId === grupoId ? ' · ya está en este grupo' : ' · ya está en otro grupo') : ''}
                        </Text>
                        <Icon name="chevron" size={16} color={c.chevron} />
                      </Pressable>
                    ))}
                {cargandoLista ? <ActivityIndicator color={c.goldInk} style={{ marginVertical: 12 }} /> : null}
                {/* El cartel de «no hay nadie» SOLO cuando ya se sabe. Mientras la consulta viaja
                    se muestra el indicador: decir "no hay" antes de la respuesta es afirmar algo
                    que no se sabe, y suena igual de creíble que la verdad. */}
                {!cargandoLista && errorLista ? (
                  <View style={{ gap: 4 }}>
                    <Text style={[t.body, { color: c.danger, fontSize: 16 }]}>{errorLista}</Text>
                    <Pressable
                      onPress={() => void traerCandidatos(eligiendo === 'mentor' ? 'mentor' : 'aprendiz')}
                      accessibilityRole="button"
                      style={estilos.accionTexto}
                    >
                      <Text style={[t.body, { color: c.goldInk, fontSize: 16, fontWeight: '500' }]}>Reintentar</Text>
                    </Pressable>
                  </View>
                ) : null}
                {/* "No hay nadie" SOLO si de verdad no hay nadie. Si la consulta falló, lo que
                    corresponde decir es que falló — afirmar que la lista está vacía sería
                    convertir un error en un dato. */}
                {/* "No hay nadie" y "tu busqueda no encontro nada" son cosas distintas: la
                    primera dice que el grupo no tiene a quien sumar, la segunda que hay gente pero
                    no con ese nombre. Decir la primera cuando pasa la segunda manda a crear
                    aprendices que ya existen. */}
                {!cargandoLista && !errorLista && eligiendo === 'aprendiz'
                  && candidatos.length > 0 && candidatosVisibles.length === 0 ? (
                  <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>
                    Ningún aprendiz coincide con «{busquedaCandidato.trim()}».
                  </Text>
                ) : null}
                {!cargandoLista && !errorLista && (eligiendo === 'mentor' ? mentores : candidatos).length === 0 ? (
                  <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>
                    {eligiendo === 'mentor'
                      ? 'No hay mentores activos con perfil creado.'
                      : 'No hay aprendices activos sin grupo.'}
                  </Text>
                ) : null}
                <BotonSecundario etiqueta="Cerrar" accessibilityLabel="Cerrar la lista" onPress={() => setEligiendo(null)} />
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  buscadorCandidato: { minHeight: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 16, width: '100%' },
  tarjeta: { borderRadius: 14, borderWidth: 1, padding: 14, width: '100%' },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    flexWrap: 'wrap',
  },
  boton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  accionTexto: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 6 },
});

/** El día de un instante en el reloj del teléfono, como `AAAA-MM-DD`: el de UTC puede ser otro de noche. */
function diaLocal(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}
