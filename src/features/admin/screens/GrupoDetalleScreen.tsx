import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { MicroLabel } from '../../../components/ui';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import {
  agregarAprendiz,
  sumarAprendizAGrupo,
  aprendicesDisponibles,
  asignarMentor,
  mentoresDisponibles,
  obtenerGrupo,
  quitarMentor,
  retirarAprendiz,
} from '../api/adminApi';
import { filtrarCandidatos } from '../utils/filtrarCandidatos';
import type { AprendizCandidatoApi, GrupoDetalleApi, MentorCandidatoApi } from '../api/adminSchemas';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import { EstadoDeGrupo } from '../components/EstadoDeGrupo';
import { rangoDeFechas } from '../utils/fechas';
import { confirmar, avisar } from '../utils/dialogo';
import { mensajeDeFallo } from '../utils/mensajes';

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
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  const [grupo, setGrupo] = useState<GrupoDetalleApi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [eligiendo, setEligiendo] = useState<'mentor' | 'aprendiz' | null>(null);
  const [mentores, setMentores] = useState<MentorCandidatoApi[]>([]);
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
        setMentores(await mentoresDisponibles());
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
            <Text style={[t.body, { color: c.danger, fontSize: 14 }]}>{error}</Text>
            <Pressable onPress={cargar} accessibilityRole="button" style={estilos.accionTexto}>
              <Text style={[t.body, { color: c.goldInk, fontSize: 14, fontWeight: '500' }]}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        {grupo ? (
          <>
            <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border, gap: 8 }]}>
              <EstadoDeGrupo estado={grupo.status ?? null} />
              <Text style={[t.body, { color: c.text, fontSize: 14.5 }]}>
                {grupo.type === 'RECEPCION'
                  ? 'Bienvenida · sin tope de plazas'
                  : cupo
                    ? `${ocupadas} de ${cupo} plazas ocupadas`
                    : `${ocupadas} aprendices`}
              </Text>
              {cerrado ? (
                <Text style={[t.body, { color: c.textSoft, fontSize: 13, lineHeight: 18 }]}>
                  Este grupo terminó su período. Se conserva para consultarlo; para seguir, creá el
                  grupo siguiente y movés a su gente ahí.
                </Text>
              ) : null}
              {grupo.status === 'PROGRAMADO' ? (
                <Text style={[t.body, { color: c.textSoft, fontSize: 13, lineHeight: 18 }]}>
                  Todavía no arrancó. Puedes armarlo ahora: sus integrantes no tendrán acceso ni chat
                  hasta el día de comienzo.
                </Text>
              ) : null}
            </View>

            {/* ── Mentor ─────────────────────────────────────────────────── */}
            <View style={{ gap: 10 }}>
              <MicroLabel>Mentor</MicroLabel>
              {grupo.mentor ? (
                <View style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}>
                  <Text style={[t.body, { color: c.textStrong, fontSize: 15, flex: 1, flexShrink: 1 }]}>
                    {grupo.mentor.fullName ?? 'Sin nombre'}
                  </Text>
                  {!cerrado ? (
                    <Pressable
                      onPress={async () => {
                        if (await confirmar('Quitar mentor', '¿Dejar el grupo sin mentor asignado?', { ok: 'Quitar', destructivo: true })) {
                          void conAviso(() => quitarMentor(grupoId), 'No se pudo quitar');
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Quitar mentor"
                      style={estilos.accionTexto}
                    >
                      <Text style={[t.body, { color: c.danger, fontSize: 13.5 }]}>Quitar</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <Text style={[t.body, { color: c.textSoft, fontSize: 14 }]}>
                  Sin mentor asignado. El grupo sigue siendo un grupo.
                </Text>
              )}
              {!cerrado ? (
                <Pressable
                  onPress={abrirSelectorDeMentor}
                  accessibilityRole="button"
                  accessibilityLabel={grupo.mentor ? 'Cambiar mentor' : 'Asignar mentor'}
                  style={[estilos.boton, { borderColor: c.border }]}
                >
                  <Text style={[t.body, { color: c.textStrong, fontSize: 14, fontWeight: '500' }]}>
                    {grupo.mentor ? 'Cambiar mentor' : 'Asignar mentor'}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {/* ── Aprendices ─────────────────────────────────────────────── */}
            <View style={{ gap: 10 }}>
              <MicroLabel>Aprendices</MicroLabel>
              {grupo.members.length === 0 ? (
                <Text style={[t.body, { color: c.textSoft, fontSize: 14 }]}>Todavía no hay nadie.</Text>
              ) : null}
              {grupo.members.map(persona => (
                <View
                  key={persona.id}
                  style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}
                >
                  <Text style={[t.body, { color: c.textStrong, fontSize: 15, flex: 1, flexShrink: 1 }]}>
                    {persona.fullName ?? 'Sin nombre'}
                  </Text>
                  {!cerrado ? (
                    <Pressable
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
                      accessibilityRole="button"
                      accessibilityLabel={`Retirar a ${persona.fullName ?? 'esta persona'}`}
                      style={estilos.accionTexto}
                    >
                      <Text style={[t.body, { color: c.danger, fontSize: 13.5 }]}>Retirar</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
              {!cerrado ? (
                <Pressable
                  onPress={abrirSelectorDeAprendiz}
                  accessibilityRole="button"
                  accessibilityLabel="Agregar aprendiz"
                  style={[estilos.boton, { borderColor: c.border }]}
                >
                  <Text style={[t.body, { color: c.textStrong, fontSize: 14, fontWeight: '500' }]}>
                    Agregar aprendiz
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {/* ── Selector ───────────────────────────────────────────────── */}
            {eligiendo ? (
              <View style={{ gap: 10 }}>
                <MicroLabel>
                  {eligiendo === 'mentor' ? 'ELIGE UN MENTOR' : 'ELIGE UN APRENDIZ'}
                </MicroLabel>
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
                      estilos.buscadorCandidato,
                      { backgroundColor: c.cardBg, borderColor: c.border, color: c.text },
                      t.body,
                    ]}
                  />
                ) : null}
                {eligiendo === 'mentor'
                  ? mentores.map(m => (
                      <Pressable
                        key={m.userId}
                        testID="candidato-mentor"
                        disabled={trabajando}
                        onPress={() => void conAviso(() => asignarMentor(grupoId, m.userId), 'No se pudo asignar')}
                        accessibilityRole="button"
                        accessibilityLabel={m.fullName ?? 'Mentor'}
                        style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}
                      >
                        <View style={{ flex: 1, flexShrink: 1 }}>
                          <Text style={[t.body, { color: c.textStrong, fontSize: 15 }]}>
                            {m.fullName ?? 'Sin nombre'}
                          </Text>
                          <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, marginTop: 2 }]}>
                            {/* Null NO se rellena con ninguna de las tres: el administrador elige
                                por esto, y adivinarla sería decidir por él. */}
                            {m.specialty ? ESPECIALIDADES[m.specialty] ?? m.specialty : 'Sin especialidad definida'}
                            {/* "Otro" solo si de verdad es otro: el mentor de ESTE grupo aparece en
                                la lista y decirle que lidera otro es falso, y ademas asusta —
                                parece que reasignarlo se lo quitaria a alguien. */}
                            {m.cellId ? (m.cellId === grupoId ? ' · ya lidera este grupo' : ' · ya lidera otro grupo') : ''}
                          </Text>
                        </View>
                        <Icon name="chevron" size={16} color={c.chevron} />
                      </Pressable>
                    ))
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
                        <Text style={[t.body, { color: c.textStrong, fontSize: 15, flex: 1, flexShrink: 1 }]}>
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
                    <Text style={[t.body, { color: c.danger, fontSize: 14 }]}>{errorLista}</Text>
                    <Pressable
                      onPress={() => void traerCandidatos(eligiendo === 'mentor' ? 'mentor' : 'aprendiz')}
                      accessibilityRole="button"
                      style={estilos.accionTexto}
                    >
                      <Text style={[t.body, { color: c.goldInk, fontSize: 14, fontWeight: '500' }]}>Reintentar</Text>
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
                  <Text style={[t.body, { color: c.textSoft, fontSize: 14 }]}>
                    Ningún aprendiz coincide con «{busquedaCandidato.trim()}».
                  </Text>
                ) : null}
                {!cargandoLista && !errorLista && (eligiendo === 'mentor' ? mentores : candidatos).length === 0 ? (
                  <Text style={[t.body, { color: c.textSoft, fontSize: 14 }]}>
                    {eligiendo === 'mentor'
                      ? 'No hay mentores activos con perfil creado.'
                      : 'No hay aprendices activos sin grupo.'}
                  </Text>
                ) : null}
                <Pressable
                  onPress={() => setEligiendo(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar la lista"
                  style={[estilos.boton, { borderColor: c.border }]}
                >
                  <Text style={[t.body, { color: c.textSoft, fontSize: 14 }]}>Cerrar</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  buscadorCandidato: { minHeight: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, width: '100%' },
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
