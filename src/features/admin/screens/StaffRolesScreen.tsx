import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MicroLabel } from '../../../components/ui';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { cambiarRolDeUsuario, listarAprendices, listarStaff, mentoresDisponibles } from '../api/adminApi';
import type { RolAsignable } from '../api/adminApi';
import type { UsuarioStaffApi } from '../api/adminSchemas';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import { confirmar, avisar } from '../utils/dialogo';
import { mensajeDeFallo } from '../utils/mensajes';
import {
  mentoresQueFaltan,
  personaDeStaff,
  ROLES_SOLO_EN_STAFF,
  type PersonaDelPadron,
} from '../utils/staff';

const POR_PAGINA = 20;

/**
 * Cuántos líderes, administradores y alquimistas se piden de una.
 *
 * No son muchos —son los tres roles de conducción de la plataforma— así que entran en una página
 * y la pantalla no necesita un «ver más» para ellos. Si alguna vez no entraran, la cabecera de la
 * sección dice cuántos hay en total, que es el aviso de que falta paginar.
 */
const STAFF_POR_PAGINA = 50;

/**
 * Cuántos mentores se le piden al listado de staff.
 *
 * Más que los roles de conducción, y por una razón concreta: de esta consulta solo interesan los
 * que `/admin/cells/mentores` no trajo —las cuentas que no están activas—, y vienen mezclados y
 * ordenados por nombre entre todos los mentores. Una página corta podría dejar afuera justo al
 * que se está buscando. 200 es el techo que valida el backend (`ListStaffCommand`: «size debe
 * estar entre 1 y 200»); pasado eso, la sección avisa en vez de mostrarse completa.
 */
const MENTORES_POR_PAGINA = 200;

/** Los cinco, con el nombre que usa la gente y no el del enum. */
const ROLES: Array<{ clave: RolAsignable; etiqueta: string }> = [
  { clave: 'TRAINEE', etiqueta: 'Aprendiz' },
  { clave: 'MENTOR', etiqueta: 'Mentor' },
  { clave: 'MENTOR_LEAD', etiqueta: 'Líder de mentores' },
  { clave: 'ADMIN', etiqueta: 'Administrador' },
  { clave: 'ALCHEMIST', etiqueta: 'Alquimista' },
];

/**
 * Dónde queda la persona después de cambiarle el rol. La confirmación lo dice con esta frase.
 *
 * > **Corregido 2026-09-15.** Acá había un `Set` llamado `LISTABLES` con solo `TRAINEE` y
 * > `MENTOR`, y la confirmación avisaba que los otros tres roles hacían *desaparecer* a la
 * > persona del panel. Era cierto: no existía ningún listado que los trajera de vuelta. Desde
 * > que la pantalla consume `GET /api/v1/admin/staff` los cinco roles se vuelven a encontrar,
 * > así que la advertencia dejó de ser verdad y se fue con el `Set`.
 */
const DONDE_QUEDA: Record<RolAsignable, string> = {
  TRAINEE: 'Va a aparecer en la lista de aprendices.',
  MENTOR: 'Va a aparecer en la lista de mentores.',
  MENTOR_LEAD: 'Va a aparecer en la sección Staff.',
  ADMIN: 'Va a aparecer en la sección Staff, y va a poder entrar a Administración.',
  ALCHEMIST: 'Va a aparecer en la sección Staff, y va a poder entrar a Administración.',
};

/* `Map<string, …>` y no `Map<RolAsignable, …>`: el listado de staff trae el rol del servidor, y
   uno que esta versión no conozca tiene que poder buscarse acá sin que TypeScript lo impida. */
const ETIQUETA = new Map<string, string>(ROLES.map(r => [r.clave as string, r.etiqueta]));

type Persona = PersonaDelPadron;

/**
 * Una persona con su rol desplegable.
 *
 * Vive FUERA de `StaffRolesScreen` a propósito. Declarada adentro, React la trata como un tipo de
 * componente nuevo en cada render y REMONTA el subárbol: la fila abierta se cerraría sola y el
 * buscador perdería el foco a cada tecla, que es el peor sitio donde puede pasar.
 */
function FilaDePersona({
  persona,
  desplegada,
  guardando,
  onAlternar,
  onElegir,
}: {
  persona: Persona;
  desplegada: boolean;
  guardando: string | null;
  onAlternar: () => void;
  onElegir: (rol: RolAsignable) => void;
}) {
  const { c, t } = useTheme();
  const rotuloActual = ETIQUETA.get(persona.rol) ?? persona.rol;

  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: desplegada ? c.goldInk : c.border }]}>
      <Pressable
        onPress={onAlternar}
        accessibilityRole="button"
        accessibilityState={{ expanded: desplegada }}
        accessibilityLabel={`Cambiar el rol de ${persona.nombre}, hoy ${rotuloActual}`}
        style={estilos.cabeceraFila}
      >
        <View style={{ flex: 1, flexShrink: 1 }}>
          <Text style={[t.body, { color: c.textStrong, fontSize: 15, fontWeight: '500' }]} numberOfLines={1}>
            {persona.nombre}
          </Text>
          <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, marginTop: 2 }]} numberOfLines={1}>
            {rotuloActual} · {persona.detalle}
          </Text>
        </View>
        {guardando === persona.id ? <ActivityIndicator color={c.goldInk} /> : null}
      </Pressable>

      {desplegada ? (
        <View style={{ gap: 8, paddingHorizontal: 12, paddingBottom: 12 }}>
          <Text style={[t.body, { color: c.textSoft, fontSize: 12.5 }]}>Elegí el rol nuevo:</Text>
          {ROLES.map(rol => {
            const actual = rol.clave === persona.rol;
            return (
              <Pressable
                key={rol.clave}
                disabled={actual || guardando !== null}
                onPress={() => onElegir(rol.clave)}
                accessibilityRole="button"
                accessibilityLabel={actual ? `${rol.etiqueta}, es el rol actual` : `Hacer ${rol.etiqueta}`}
                style={[
                  estilos.opcionRol,
                  {
                    borderColor: actual ? c.goldInk : c.border,
                    backgroundColor: actual ? c.goldWash : 'transparent',
                    opacity: guardando !== null && !actual ? 0.5 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    t.body,
                    { color: actual ? c.goldInk : c.textStrong, fontSize: 14.5, fontWeight: actual ? '700' : '400' },
                  ]}
                >
                  {actual ? `✓ ${rol.etiqueta} (rol actual)` : rol.etiqueta}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Cambiar el rol de una cuenta.
 *
 * **El cambio tiene que poder deshacerse desde acá mismo**, y esa es la restricción que da forma a
 * la pantalla. Se lee de tres fuentes, y cada una responde una pregunta distinta:
 *
 * | Sección | De dónde sale | Qué rol muestra |
 * |---|---|---|
 * | Staff | `GET /admin/staff?role=` (líder, admin, alquimista) | El que manda el servidor |
 * | Mentores | `GET /admin/cells/mentores` + `GET /admin/staff?role=MENTOR` | MENTOR |
 * | Aprendices | `GET /admin/trainees` | TRAINEE, deducido de la lista de origen |
 *
 * > **Corregido 2026-09-15.** Acá decía que *«el panel solo sabe listar dos roles»* y que ascender
 * > a alguien a líder de mentores, administrador o alquimista lo hacía **desaparecer** de la
 * > pantalla — una puerta de un solo sentido que solo se deshacía entrando a la base de datos. Era
 * > cierto, y era evitable: `GET /api/v1/admin/staff` existe desde el gap #6, devuelve el campo
 * > `role` de verdad y lista los cuatro roles de staff. La sección «Staff» lo consume y cierra la
 * > puerta. Las otras dos listas quedaron **intactas**.
 *
 * > **Corregido 2026-09-15 (segunda vuelta).** La fila «Mentores» de la tabla decía solo
 * > `GET /admin/cells/mentores`, y con eso la puerta seguía abierta por otro lado: ese listado
 * > devuelve **únicamente mentores ACTIVOS**, así que suspender a un mentor lo borraba del panel
 * > entero —Personas lista solo aprendices— y no había fila desde donde devolverle el rol. Ahora
 * > la sección suma los que ese listado no trae, pedidos con `role=MENTOR` y sin filtro de estado.
 *
 * Las secciones siguen siendo **disjuntas**, pero ya no por rol: Staff pide los tres roles que
 * ninguna otra trae, y en Mentores el cruce es por id (`mentoresQueFaltan`). Nadie aparece dos
 * veces con dos rótulos distintos — la forma más rápida de que alguien deje de creerle a esta
 * pantalla.
 *
 * Quedan además dos defensas, y ninguna es decorativa:
 *
 * 1. La confirmación dice **dónde va a quedar la persona después**, no solo qué rol se le pone.
 *    Un administrador de 40 o 60 años no tiene por qué deducir en qué lista va a buscarla mañana
 *    (AGENTS.md §5).
 * 2. Lo cambiado en esta visita queda fijado arriba, en «Cambios de esta sesión», con su rol nuevo
 *    y pudiendo cambiarse otra vez. Así el arrepentimiento se resuelve con un toque, sin esperar a
 *    que el listado se recargue.
 *
 * No se ofrece `ASSISTANT`: está en el enum de la base pero la API lo rechaza con 400 —comprobado
 * el 2026-09-11—, y una opción que siempre falla es peor que no tenerla.
 */
export function StaffRolesScreen({ onVolver }: { onVolver: () => void }) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [pagina, setPagina] = useState(0);
  const [aprendices, setAprendices] = useState<Persona[]>([]);
  const [mentores, setMentores] = useState<Persona[]>([]);
  /* Crudo, sin mapear: recién al cruzarlo con `mentores` se sabe a quién falta mostrar, y ese
     cruce necesita la respuesta entera, no una fila ya armada. */
  const [mentoresDeStaff, setMentoresDeStaff] = useState<UsuarioStaffApi[]>([]);
  /** Cuántos mentores dice el servidor que hay, para saber si la única página alcanzó. */
  const [totalMentoresDeStaff, setTotalMentoresDeStaff] = useState<number | null>(null);
  const [staff, setStaff] = useState<Persona[]>([]);
  /** Cuántos hay en el servidor, para saber si la única página alcanzó. `null` = no se sabe. */
  const [totalStaff, setTotalStaff] = useState<number | null>(null);
  /* Propio, y no el `cargando` de las otras dos listas: son consultas distintas y terminan en
     momentos distintos. Compartirlo hacía parpadear «Todavía no hay nadie con estos roles» en
     cuanto los aprendices llegaban primero. */
  const [cargandoStaff, setCargandoStaff] = useState(true);
  /** El listado de staff falló pero el resto cargó. Se dice ahí y no arriba de todo. */
  const [errorStaff, setErrorStaff] = useState<string | null>(null);
  const [totalAprendices, setTotalAprendices] = useState<number | null>(null);
  const [cambiados, setCambiados] = useState<Persona[]>([]);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSystemBackHandler(() => {
    if (abierta) {
      setAbierta(null);
      return true;
    }
    onVolver();
    return true;
  });

  useEffect(() => {
    const id = setTimeout(() => {
      setBusquedaAplicada(busqueda);
      setPagina(0);
    }, 350);
    return () => clearTimeout(id);
  }, [busqueda]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [pagAprendices, listaMentores] = await Promise.all([
        listarAprendices({ pagina, tamano: POR_PAGINA, busqueda: busquedaAplicada }),
        mentoresDisponibles(),
      ]);
      const nuevos: Persona[] = pagAprendices.content.map(a => ({
        id: a.id,
        nombre: a.fullName ?? 'Sin nombre',
        detalle: a.email ?? `Día ${a.programDay}`,
        rol: 'TRAINEE',
      }));
      setAprendices(previos => (pagina === 0 ? nuevos : [...previos, ...nuevos]));
      setTotalAprendices(pagAprendices.total);
      setMentores(
        listaMentores.map(m => ({
          id: m.userId,
          nombre: m.fullName ?? 'Sin nombre',
          detalle: m.cellId ? 'Acompaña un grupo' : 'Sin grupo asignado',
          rol: 'MENTOR',
        })),
      );
    } catch (e) {
      setError(mensajeDeFallo(e, 'No se pudo cargar el padrón.'));
    } finally {
      setCargando(false);
    }
  }, [pagina, busquedaAplicada]);

  /**
   * Todo lo que sale de `/admin/staff`: los tres roles de conducción **y** los mentores.
   *
   * Una consulta por rol y no una sola sin filtro: sin `role=` la respuesta mezcla los cuatro
   * roles en una misma página, y con `size` fijo un rol podría quedar cortado por otro. Cada
   * consulta acota lo suyo, y la de MENTOR alimenta otra sección, no esta.
   *
   * Ninguna de las cuatro manda `status`, y de eso depende el arreglo: el backend aplica el
   * filtro de estado **solo si el parámetro viene**, así que sin él trae también a las cuentas
   * suspendidas — las que ningún otro listado del panel muestra.
   *
   * Va aparte de `cargar` a propósito. Si este listado falla, las otras secciones se ven igual y
   * el error se dice **dentro de la sección que quedó incompleta** — un fallo de un panel no
   * puede arrastrar a los demás, que es el criterio que el resto de Administración ya sigue.
   */
  const cargarStaff = useCallback(async () => {
    setCargandoStaff(true);
    setErrorStaff(null);
    try {
      const [paginas, paginaMentores] = await Promise.all([
        Promise.all(ROLES_SOLO_EN_STAFF.map(rol => listarStaff({ rol, tamano: STAFF_POR_PAGINA }))),
        listarStaff({ rol: 'MENTOR', tamano: MENTORES_POR_PAGINA }),
      ]);
      setStaff(paginas.flatMap(p => p.content).map(personaDeStaff));
      /* Solo los tres de conducción: el total que se muestra abajo es el de la sección Staff, y
         sumarle los mentores diría que faltan filas que están en otra sección. */
      setTotalStaff(paginas.reduce((suma, p) => suma + p.total, 0));
      setMentoresDeStaff(paginaMentores.content);
      setTotalMentoresDeStaff(paginaMentores.total);
    } catch (e) {
      setStaff([]);
      setTotalStaff(null);
      setMentoresDeStaff([]);
      setTotalMentoresDeStaff(null);
      setErrorStaff(mensajeDeFallo(e, 'No se pudo cargar el staff.'));
    } finally {
      setCargandoStaff(false);
    }
  }, []);

  /* Sin `pagina` ni `busquedaAplicada`: el buscador y el "ver más" son de los aprendices. Pedir
     los tres roles de staff otra vez en cada tecla serían tres llamadas por pulsación. */
  useEffect(() => {
    void cargarStaff();
  }, [cargarStaff]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * Los mentores de los grupos primero, y detrás los que ese listado no trae.
   *
   * El orden no es casual: lo habitual —mentores activos, con su grupo— se lee primero, y las
   * cuentas suspendidas quedan al final, que es donde no estorban y donde igual se encuentran.
   * Las dos fuentes llegan en momentos distintos, así que esto se recalcula cuando cambia
   * cualquiera de las dos.
   */
  const todosLosMentores = useMemo(
    () => [...mentores, ...mentoresQueFaltan(mentores.map(m => m.id), mentoresDeStaff)],
    [mentores, mentoresDeStaff],
  );

  /* Quien ya se cambió en esta visita se muestra ARRIBA y no repetido abajo: la lista de origen
     todavía puede traerlo mientras no se recargue, y verlo dos veces con roles distintos es la
     forma más rápida de perder la confianza en la pantalla. */
  const idsCambiados = useMemo(() => new Set(cambiados.map(p => p.id)), [cambiados]);
  const aprendicesVisibles = aprendices.filter(p => !idsCambiados.has(p.id));
  const mentoresVisibles = todosLosMentores.filter(p => !idsCambiados.has(p.id));
  const staffVisible = staff.filter(p => !idsCambiados.has(p.id));

  const aplicar = async (persona: Persona, nuevo: RolAsignable) => {
    if (nuevo === persona.rol) {
      setAbierta(null);
      return;
    }
    const etiqueta = ETIQUETA.get(nuevo) ?? nuevo;
    const donde = DONDE_QUEDA[nuevo];

    const acepto = await confirmar(
      `¿Hacer ${etiqueta} a ${persona.nombre}?`,
      `${persona.nombre} pasa de ${ETIQUETA.get(persona.rol) ?? persona.rol} a ${etiqueta}.\n\n${donde}`,
      { ok: `Sí, hacer ${etiqueta}` },
    );
    if (!acepto) return;

    setGuardando(persona.id);
    try {
      await cambiarRolDeUsuario(persona.id, nuevo);
      setCambiados(previos => [
        { ...persona, rol: nuevo },
        ...previos.filter(p => p.id !== persona.id),
      ]);
      setAbierta(null);
    } catch (e) {
      avisar('No se pudo cambiar el rol', mensajeDeFallo(e, 'Probá de nuevo.'));
    } finally {
      setGuardando(null);
    }
  };

  const hayMas = totalAprendices !== null && aprendices.length < totalAprendices;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Staff y roles" subtitulo="Quién es qué" onVolver={onVolver} />
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
          gap: 14,
        }}
      >
        <Text style={[t.body, { color: c.textSoft, fontSize: 13, lineHeight: 19 }]}>
          Al aprobar una solicitud la persona entra siempre como aprendiz. Acá se le cambia el rol.
        </Text>

        {error ? <Text style={[t.body, { color: c.danger, fontSize: 13.5 }]}>{error}</Text> : null}

        {cambiados.length > 0 ? (
          <View style={{ gap: 10 }}>
            <MicroLabel>Cambios de esta sesión</MicroLabel>
            {cambiados.map(persona => (
              <FilaDePersona
                key={`cambiado-${persona.id}`}
                persona={persona}
                desplegada={abierta === persona.id}
                guardando={guardando}
                onAlternar={() => setAbierta(abierta === persona.id ? null : persona.id)}
                onElegir={rol => aplicar(persona, rol)}
              />
            ))}
          </View>
        ) : null}

        {/* Líderes, administradores y alquimistas. Es la única sección cuyo rol NO se deduce de
            la lista de origen: viene en la respuesta. Y es la que cierra la puerta de un solo
            sentido — antes, ascender a alguno de estos tres roles lo borraba de la pantalla. */}
        <View style={{ gap: 10 }}>
          {/* El número es el de las filas que se ven, no el del servidor: una cabecera que dice 5
              sobre una lista de 4 es la clase de detalle que hace dudar de toda la pantalla. Lo
              que el servidor dice que hay va abajo, y solo si no entró todo. */}
          <MicroLabel>Staff ({staffVisible.length})</MicroLabel>
          {/* > **Corregido 2026-09-15.** Esto decía «Los mentores están más abajo, con su grupo».
              La sección de abajo ahora también trae mentores suspendidos, que no salen del listado
              de grupos y por lo tanto no tienen grupo que mostrar: la promesa dejó de valer para
              todas sus filas, y prometer de más es lo que hace dudar del resto de la pantalla. */}
          <Text style={[t.body, { color: c.textSoft, fontSize: 12.5, lineHeight: 18 }]}>
            Líderes de mentores, administradores y alquimistas, con el rol que dice el servidor.
            Los mentores están más abajo.
          </Text>
          {errorStaff ? (
            <Text style={[t.body, { color: c.danger, fontSize: 13.5 }]}>{errorStaff}</Text>
          ) : null}
          {cargandoStaff ? <ActivityIndicator color={c.goldInk} style={{ marginTop: 6 }} /> : null}
          {!errorStaff && !cargandoStaff && staffVisible.length === 0 ? (
            <Text style={[t.body, { color: c.textSoft, fontSize: 13.5 }]}>
              Todavía no hay nadie con estos roles.
            </Text>
          ) : null}
          {staffVisible.map(persona => (
            <FilaDePersona
              key={`staff-${persona.id}`}
              persona={persona}
              desplegada={abierta === persona.id}
              guardando={guardando}
              onAlternar={() => setAbierta(abierta === persona.id ? null : persona.id)}
              onElegir={rol => aplicar(persona, rol)}
            />
          ))}
          {/* Si el servidor dice que hay más de los que se pidieron, se avisa en vez de mostrar
              una lista incompleta como si fuera completa. */}
          {totalStaff !== null && totalStaff > staff.length ? (
            <Text style={[t.body, { color: c.micro, fontSize: 12.5 }]}>
              Se muestran {staff.length} de {totalStaff}.
            </Text>
          ) : null}
        </View>

        {/* Los mentores de los grupos, más los que ese listado no devuelve por no estar activos.
            Una cuenta suspendida se reconoce en su propia línea —«Mentor · Cuenta suspendida ·
            correo»—, así que no hace falta una sección aparte para explicar por qué está ahí. */}
        <View style={{ gap: 10 }}>
          <MicroLabel>Mentores ({mentoresVisibles.length})</MicroLabel>
          {/* El listado de staff falló: se dice acá también. Callarlo dejaría esta sección
              mostrando solo los activos con cara de estar completa. */}
          {errorStaff ? (
            <Text style={[t.body, { color: c.micro, fontSize: 12.5, lineHeight: 18 }]}>
              No se pudo comprobar si hay mentores con la cuenta suspendida: estos son los activos.
            </Text>
          ) : null}
          {/* La página de mentores no alcanzó. Se dice, en vez de dejar la sección con cara de
              completa: el que falte va a ser justo el que alguien vino a buscar. */}
          {totalMentoresDeStaff !== null && totalMentoresDeStaff > mentoresDeStaff.length ? (
            <Text style={[t.body, { color: c.micro, fontSize: 12.5, lineHeight: 18 }]}>
              El servidor dice que hay {totalMentoresDeStaff} mentores y acá entraron{' '}
              {mentoresDeStaff.length}: puede faltar alguno con la cuenta suspendida.
            </Text>
          ) : null}
          {mentoresVisibles.length === 0 && !cargando && !cargandoStaff ? (
            <Text style={[t.body, { color: c.textSoft, fontSize: 13.5 }]}>
              Todavía no hay mentores. Hacé mentor a alguien de la lista de abajo.
            </Text>
          ) : null}
          {mentoresVisibles.map(persona => (
            <FilaDePersona
                key={`mentor-${persona.id}`}
                persona={persona}
                desplegada={abierta === persona.id}
                guardando={guardando}
                onAlternar={() => setAbierta(abierta === persona.id ? null : persona.id)}
                onElegir={rol => aplicar(persona, rol)}
              />
          ))}
        </View>

        <View style={{ gap: 10 }}>
          <MicroLabel>
            APRENDICES {totalAprendices === null ? '' : `(${totalAprendices} en total)`}
          </MicroLabel>
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por nombre o correo"
            placeholderTextColor={c.micro}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Buscar aprendices"
            style={[estilos.buscador, { backgroundColor: c.cardBg, borderColor: c.border, color: c.text }, t.body]}
          />
          {aprendicesVisibles.map(persona => (
            <FilaDePersona
                key={`aprendiz-${persona.id}`}
                persona={persona}
                desplegada={abierta === persona.id}
                guardando={guardando}
                onAlternar={() => setAbierta(abierta === persona.id ? null : persona.id)}
                onElegir={rol => aplicar(persona, rol)}
              />
          ))}
        </View>

        {cargando ? <ActivityIndicator color={c.goldInk} style={{ marginTop: 12 }} /> : null}

        {hayMas && !cargando ? (
          <Pressable
            onPress={() => setPagina(p => p + 1)}
            accessibilityRole="button"
            accessibilityLabel="Ver más aprendices"
            style={[estilos.boton, { borderColor: c.border }]}
          >
            <Text style={[t.body, { color: c.textStrong, fontSize: 14, fontWeight: '500' }]}>
              Ver más ({aprendices.length} de {totalAprendices ?? '—'})
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  buscador: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    width: '100%',
  },
  tarjeta: {
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  cabeceraFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  opcionRol: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    width: '100%',
  },
  boton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
});
