import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Alert } from '../../../components/Alerta';
import { Checkbox } from '../../../components/Checkbox';
import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { FormField } from '../../../components/FormField';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Interruptor } from '../../../components/Interruptor';
import { BotonPeligro, BotonPrincipal, BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { ApiError } from '../../../services/http/apiClient';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { ChipDeOpcion } from '../../admin/components/ChipDeOpcion';
import { confirmar } from '../../admin/utils/dialogo';
import { mensajeDeFallo } from '../../admin/utils/mensajes';
import { etiquetaDeRol } from '../../admin/utils/rolesAsignables';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/lugarDelLanzador';
import { borrarRol, crearRol, desbloquear, editarRol, reemplazarRol } from '../api/soporteTiApi';
import type { FuncionalidadConsola, RolPersonalizadoConsola } from '../api/soporteTiSchemas';
import { HojaDeContrasena } from '../components/HojaDeContrasena';
import { fechaYHora, nombreDe, queHacerConElError } from '../utils/consola';
import {
  alternarMarca,
  arbolPorArea,
  cambioDeRolDesde,
  claveDelRol,
  fueOtroCambio,
  LARGO_MAXIMO_DE_LA_DESCRIPCION_DEL_ROL,
  LARGO_MAXIMO_DEL_NOMBRE_DEL_ROL,
  puedeCambiarDeBase,
  rechazoDelRol,
  destinosDeReemplazo,
  faltaParaGuardarElRol,
  formularioDeRolDesde,
  funcionalidadesDeLaBase,
  hayCambiosEnElRol,
  rolNuevoDesde,
  ROLES_BASE,
  soloDeLaBase,
  type FormularioDeRol,
} from '../utils/roles';

const SANGRIA_POR_NIVEL = 18;

type Pendiente = { tipo: 'guardar' } | { tipo: 'borrar' } | { tipo: 'reemplazar'; destino: string | null };

/**
 * Crear o editar un rol personalizado (spec 002, fase 2, US7; contrato `fase-2.md` §4.3 y §4.5).
 *
 * - **Nombre** (único y distinto de los seis roles base), **descripción** opcional y **de qué rol hereda** (los seis,
 *   nunca Soporte TI). La base se elige al crear: el servidor no la deja cambiar después.
 * - **Funcionalidades**: el árbol del catálogo que usa esa base, por área. Marcar una madre marca a sus hijas; desmarcar
 *   una hija desmarca a su madre (la madre marcada vale para toda la rama).
 * - **Activo** (al editar): apagado, sus personas quedan con el rol base solo, sin restricciones.
 * - **Pasar sus personas a otro rol** (reemplazo en bloque) y **Borrar** (con personas, el servidor responde 409 y se
 *   ofrece pasarlas antes). Motivo obligatorio en todo, como en la fase 1; queda en la auditoría.
 * - Si el servidor pide la contraseña (428), se pide con la hoja de la fase 1 y se reintenta. Versión optimista: un 409
 *   relee y avisa. Lo guardado se confirma en línea; los errores, en diálogo. Salir con cambios pregunta.
 */
export function RolConsolaScreen({
  rol,
  roles,
  catalogo,
  onGuardado,
  onBorrado,
  onReleer,
  onBloqueada,
  onAuditoria,
  onVolver,
}: {
  /** `null` = rol nuevo. */
  rol: RolPersonalizadoConsola | null;
  roles: readonly RolPersonalizadoConsola[];
  catalogo: readonly FuncionalidadConsola[];
  onGuardado: (rol: RolPersonalizadoConsola) => void;
  onBorrado: (id: string) => void;
  /** Relee los roles; devuelve la lista (o `null` si no se pudo). */
  onReleer: () => Promise<RolPersonalizadoConsola[] | null>;
  /** Abre la auditoría filtrada por la clave del rol (`rp:<id>`). */
  onAuditoria?: (clave: string) => void;
  onBloqueada: () => void;
  onVolver: () => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const [formulario, setFormulario] = useState<FormularioDeRol>(() => formularioDeRolDesde(rol));
  const [faltaMotivo, setFaltaMotivo] = useState(false);
  /** `NOMBRE_REPETIDO`: el mensaje del servidor bajo el campo del nombre. */
  const [errorDelNombre, setErrorDelNombre] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [confirmacion, setConfirmacion] = useState<{ clave: number; texto: string } | null>(null);
  const [reemplazando, setReemplazando] = useState(false);
  const [destino, setDestino] = useState<string | null | undefined>(undefined);
  const [motivoDelReemplazo, setMotivoDelReemplazo] = useState('');
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [errorContrasena, setErrorContrasena] = useState<string | null>(null);
  const [confirmandoContrasena, setConfirmandoContrasena] = useState(false);
  const cambiado = hayCambiosEnElRol(formulario, rol);

  /* Llegó otra versión (guardada o releída tras un 409): el formulario parte de ella y conserva el motivo escrito. */
  const versionVista = useRef(rol?.version);
  useEffect(() => {
    if (!rol || versionVista.current === rol.version) return;
    versionVista.current = rol.version;
    setFormulario(actual => ({ ...formularioDeRolDesde(rol), motivo: actual.motivo }));
  }, [rol]);

  const deLaBase = useMemo(
    () => (formulario.rolBase ? funcionalidadesDeLaBase(catalogo, formulario.rolBase) : []),
    [catalogo, formulario.rolBase],
  );
  const arbol = useMemo(() => arbolPorArea(deLaBase), [deLaBase]);
  const destinos = rol ? destinosDeReemplazo(rol, roles) : [];

  const salir = async () => {
    if (cambiado && !(await confirmar('¿Salir sin guardar?', 'Se pierden los cambios de este rol.', { ok: 'Salir' }))) return;
    onVolver();
  };
  useSystemBackHandler(() => {
    if (reemplazando) {
      setReemplazando(false);
      return true;
    }
    void salir();
    return true;
  });

  const cambiar = <K extends keyof FormularioDeRol>(campo: K, valor: FormularioDeRol[K]) => {
    if (campo === 'motivo') setFaltaMotivo(false);
    if (campo === 'nombre') setErrorDelNombre(null);
    setFormulario(actual => ({ ...actual, [campo]: valor }));
  };

  /** Lo común a los cuatro pedidos: 423 a la puerta, 428 a la contraseña, 409 relee. Devuelve `true` si lo atendió. */
  const atenderError = async (e: unknown, reintento: Pendiente): Promise<boolean> => {
    const que = queHacerConElError(e);
    if (que === 'desbloquear') {
      onBloqueada();
      return true;
    }
    if (que === 'reautenticar') {
      setErrorContrasena(null);
      setPendiente(reintento);
      return true;
    }
    return false;
  };

  const guardar = async (reautenticacion?: string) => {
    const falta = faltaParaGuardarElRol(formulario, rol, roles);
    if (falta) {
      tacto.error();
      if (!formulario.motivo.trim()) setFaltaMotivo(true);
      Alert.alert('Falta algo para guardar', falta);
      return;
    }
    setOcupado(true);
    try {
      const guardado = rol ? await editarRol(rol.id, cambioDeRolDesde(formulario, rol), reautenticacion) : await crearRol(rolNuevoDesde(formulario), reautenticacion);
      versionVista.current = guardado.version;
      setFormulario(formularioDeRolDesde(guardado));
      onGuardado(guardado);
      tacto.logro();
      setConfirmacion({ clave: Date.now(), texto: rol ? 'Rol guardado. Rige en unos segundos.' : `Rol «${guardado.nombre}» creado.` });
    } catch (e) {
      if (await atenderError(e, { tipo: 'guardar' })) return;
      const rechazo = rechazoDelRol(e);
      const mensaje = e instanceof ApiError && e.message ? e.message : null;
      if (rechazo === 'version_cambiada') {
        await onReleer();
        Alert.alert('Alguien cambió este rol', 'Revisa cómo quedó y vuelve a guardar (tu motivo sigue escrito).');
      } else if (rechazo === 'rol_con_personas') {
        if (await confirmar('Todavía tiene personas', mensaje ?? 'Con personas asignadas la base no se cambia.', { ok: 'Pasar personas' })) abrirReemplazo();
      } else if (rechazo === 'nombre_repetido') {
        tacto.error();
        setErrorDelNombre(mensaje ?? 'Ya hay un rol con ese nombre.');
      } else if (rechazo === 'maximo_de_roles') {
        Alert.alert('No se pudo guardar', mensaje ?? 'Ya hay 20 roles activos.');
      } else if (rechazo === 'conflicto_sin_codigo') {
        // Backend sin `codigo`: un 409 al editar puede ser otro cambio o una regla. Se relee y, si la versión es la
        // misma, se muestra el mensaje del servidor. Al crear, siempre es regla.
        const releidos = rol ? await onReleer() : null;
        if (rol && fueOtroCambio(rol.version, releidos?.find(r => r.id === rol.id))) {
          Alert.alert('Alguien cambió este rol', 'Revisa cómo quedó y vuelve a guardar (tu motivo sigue escrito).');
        } else {
          Alert.alert('No se pudo guardar', mensajeDeFallo(e, 'Vuelve a intentarlo en un momento.'));
        }
      } else {
        Alert.alert('No se pudo guardar', mensajeDeFallo(e, 'Vuelve a intentarlo en un momento.'));
      }
    } finally {
      setOcupado(false);
    }
  };

  const abrirReemplazo = () => {
    setDestino(undefined);
    setMotivoDelReemplazo(formulario.motivo);
    setReemplazando(true);
  };

  const borrar = async (reautenticacion?: string) => {
    if (!rol) return;
    if (!formulario.motivo.trim()) {
      tacto.error();
      setFaltaMotivo(true);
      Alert.alert('Falta el motivo', 'Escribe el motivo: borrar un rol queda en la auditoría.');
      return;
    }
    if (!reautenticacion && !(await confirmar(`¿Borrar «${rol.nombre}»?`, 'No se puede deshacer.', { ok: 'Borrar', destructivo: true }))) return;
    setOcupado(true);
    try {
      await borrarRol(rol.id, formulario.motivo, reautenticacion);
      tacto.logro();
      onBorrado(rol.id);
    } catch (e) {
      if (await atenderError(e, { tipo: 'borrar' })) return;
      const rechazo = rechazoDelRol(e);
      if (rechazo === 'rol_con_personas' || rechazo === 'conflicto_sin_codigo') {
        const mensaje = rechazo === 'rol_con_personas' && e instanceof ApiError && e.message ? e.message : 'Un rol con personas no se borra. ¿Las pasas antes a otro rol?';
        if (await confirmar('Todavía tiene personas', mensaje, { ok: 'Pasar personas' })) abrirReemplazo();
      } else {
        Alert.alert('No se pudo borrar', mensajeDeFallo(e, 'Vuelve a intentarlo en un momento.'));
      }
    } finally {
      setOcupado(false);
    }
  };

  const reemplazar = async (destinoElegido: string | null, reautenticacion?: string) => {
    if (!rol) return;
    if (!motivoDelReemplazo.trim()) {
      tacto.error();
      Alert.alert('Falta el motivo', 'Escribe el motivo: queda en la auditoría.');
      return;
    }
    setOcupado(true);
    try {
      const movidas = await reemplazarRol(rol.id, destinoElegido, motivoDelReemplazo, reautenticacion);
      setReemplazando(false);
      await onReleer();
      tacto.logro();
      const cuantas = movidas ?? rol.personas ?? 0;
      setConfirmacion({ clave: Date.now(), texto: `Listo: ${cuantas} ${cuantas === 1 ? 'persona pasó' : 'personas pasaron'} de rol.` });
    } catch (e) {
      if (await atenderError(e, { tipo: 'reemplazar', destino: destinoElegido })) return;
      Alert.alert('No se pudo pasar a las personas', mensajeDeFallo(e, 'Vuelve a intentarlo en un momento.'));
    } finally {
      setOcupado(false);
    }
  };

  const confirmarConContrasena = async (contrasena: string) => {
    const reintento = pendiente;
    setConfirmandoContrasena(true);
    setErrorContrasena(null);
    try {
      const { token } = await desbloquear(contrasena, 'CAMBIO_CRITICO');
      setPendiente(null);
      if (reintento?.tipo === 'guardar') await guardar(token);
      else if (reintento?.tipo === 'borrar') await borrar(token);
      else if (reintento?.tipo === 'reemplazar') await reemplazar(reintento.destino, token);
    } catch (e) {
      const que = queHacerConElError(e);
      tacto.error();
      if (que === 'contrasena_incorrecta') {
        setErrorContrasena('La contraseña no es correcta.');
        return;
      }
      setPendiente(null);
      if (que === 'desbloquear') onBloqueada();
      else if (que === 'demasiados_intentos') Alert.alert('Demasiados intentos', 'Espera unos minutos y vuelve a intentarlo.');
      else Alert.alert('No se pudo confirmar', mensajeDeFallo(e, 'Vuelve a intentarlo en un momento.'));
    } finally {
      setConfirmandoContrasena(false);
    }
  };

  const ayuda = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }];
  const fuerte = [t.body, { color: c.textStrong, fontSize: 16, fontFamily: 'Jost_500Medium' }];
  const quien = rol?.actualizadoPor?.nombre?.trim();
  const personas = rol?.personas ?? 0;
  const marcadas = formulario.funcionalidades;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo={rol ? rol.nombre : 'Nuevo rol'} subtitulo={rol ? `Hereda de ${etiquetaDeRol(rol.rolBase)}` : 'Rol personalizado'} onVolver={() => void salir()} />
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          paddingHorizontal: horizontalPadding,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 18,
        }}
      >
        {rol ? (
          <Text style={ayuda}>
            {personas} {personas === 1 ? 'persona tiene' : 'personas tienen'} este rol.
            {rol.actualizadoEn ? ` Último cambio: ${fechaYHora(rol.actualizadoEn)}${quien ? `, por ${quien}` : ''}.` : ''}
          </Text>
        ) : null}

        <FormField
          label="Nombre"
          helperText="Único, y distinto de los seis roles base."
          value={formulario.nombre}
          onChangeText={v => cambiar('nombre', v.slice(0, LARGO_MAXIMO_DEL_NOMBRE_DEL_ROL))}
          maxLength={LARGO_MAXIMO_DEL_NOMBRE_DEL_ROL}
          placeholder="Ej.: Mentor junior"
          error={errorDelNombre}
          testID="campo-nombre-rol"
        />
        <FormField
          label="Descripción"
          helperText={`Opcional. Para qué sirve este rol. ${formulario.descripcion.length} de ${LARGO_MAXIMO_DE_LA_DESCRIPCION_DEL_ROL}.`}
          value={formulario.descripcion}
          onChangeText={v => cambiar('descripcion', v.slice(0, LARGO_MAXIMO_DE_LA_DESCRIPCION_DEL_ROL))}
          maxLength={LARGO_MAXIMO_DE_LA_DESCRIPCION_DEL_ROL}
          placeholder="Ej.: Mentores en su primer mes, sin pasar lista."
          multiline
          numberOfLines={2}
        />

        <View style={{ gap: 10 }}>
          <TituloDeSeccion
            detalle={
              puedeCambiarDeBase(rol)
                ? 'Hace todo lo de esa base, salvo lo que no marques abajo.'
                : 'Con personas asignadas la base no se cambia: pásalas antes a otro rol.'
            }
          >
            Hereda de
          </TituloDeSeccion>
          {rol && !puedeCambiarDeBase(rol) ? (
            <Text style={fuerte}>{etiquetaDeRol(rol.rolBase)}</Text>
          ) : (
            <View accessibilityRole="radiogroup" accessibilityLabel="De qué rol hereda" style={estilos.chips}>
              {ROLES_BASE.map(base => (
                <ChipDeOpcion
                  key={base.clave}
                  etiqueta={base.etiqueta}
                  activo={formulario.rolBase === base.clave}
                  onPress={() =>
                    setFormulario(actual => ({ ...actual, rolBase: base.clave, funcionalidades: soloDeLaBase(actual.funcionalidades, catalogo, base.clave) }))
                  }
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ gap: 10 }}>
          <TituloDeSeccion detalle="Solo las que usa el rol base. Marcar una madre marca a sus hijas; lo nuevo del catálogo nace sin marcar.">
            {`Funcionalidades (${marcadas.size})`}
          </TituloDeSeccion>
          {!formulario.rolBase ? <Text style={ayuda}>Elige primero de qué rol hereda.</Text> : null}
          {formulario.rolBase ? (
            <View style={estilos.acciones}>
              <BotonSecundario
                etiqueta="Marcar todas"
                estilo={estilos.accion}
                onPress={() => cambiar('funcionalidades', new Set(deLaBase.map(f => f.clave)))}
              />
              <BotonSecundario etiqueta="Desmarcar todas" estilo={estilos.accion} onPress={() => cambiar('funcionalidades', new Set())} />
            </View>
          ) : null}
          {arbol.map(grupo => (
            <View key={grupo.area} style={{ gap: 8 }}>
              <Text style={[t.small, { color: c.textSoft, fontFamily: 'Jost_700Bold', fontSize: 13 }]}>{grupo.area}</Text>
              {grupo.nodos.map(({ funcionalidad, nivel }) => (
                <Checkbox
                  key={funcionalidad.clave}
                  checked={marcadas.has(funcionalidad.clave)}
                  onToggle={() => {
                    tacto.seleccion();
                    cambiar('funcionalidades', alternarMarca(marcadas, funcionalidad.clave, deLaBase));
                  }}
                  title={nombreDe(funcionalidad)}
                  subtitle={funcionalidad.clave}
                  style={{ marginLeft: nivel * SANGRIA_POR_NIVEL }}
                />
              ))}
            </View>
          ))}
        </View>

        {rol ? (
          <View style={[estilos.interruptor, { backgroundColor: c.cardBg, borderColor: c.border }]}>
            <View style={{ flex: 1, flexShrink: 1 }}>
              <Text style={fuerte}>Activo</Text>
              <Text style={ayuda}>{formulario.activo ? 'Se puede asignar y rige para sus personas.' : 'Sus personas quedan con el rol base solo, sin restricciones.'}</Text>
            </View>
            <Interruptor etiqueta="Rol activo" valor={formulario.activo} onCambiar={v => cambiar('activo', v)} />
          </View>
        ) : null}

        <FormField
          label="Motivo"
          helperText="Obligatorio. Queda en la auditoría."
          value={formulario.motivo}
          onChangeText={v => cambiar('motivo', v)}
          placeholder="Ej.: Mentores nuevos sin pasar lista todavía."
          testID="campo-motivo-rol"
          multiline
          numberOfLines={2}
          error={faltaMotivo ? 'Escribe el motivo del cambio.' : null}
        />

        {/* Arriba del botón: debajo quedaba fuera de la pantalla, porque el botón se toca al pie (Maestro, flujo 38). */}
        {confirmacion ? <ConfirmacionEnLinea key={confirmacion.clave} texto={confirmacion.texto} onTerminar={() => setConfirmacion(null)} /> : null}
        <BotonPrincipal etiqueta={rol ? 'Guardar cambios' : 'Crear rol'} onPress={() => void guardar()} cargando={ocupado} deshabilitado={ocupado || (rol !== null && !cambiado)} />

        {rol ? (
          <View style={{ gap: 10, marginTop: 8 }}>
            {personas > 0 ? <BotonSecundario etiqueta="Pasar sus personas a otro rol" onPress={abrirReemplazo} deshabilitado={ocupado} /> : null}
            <BotonPeligro etiqueta="Borrar rol" onPress={() => void borrar()} deshabilitado={ocupado} />
            {personas > 0 ? <Text style={ayuda}>Con personas no se borra: pásalas antes a otro rol, o desactívalo.</Text> : null}
            <Text style={ayuda}>Borrar y pasar sus personas te piden la contraseña.</Text>
            {onAuditoria ? (
              <BotonSecundario
                etiqueta="Ver su historial"
                onPress={() =>
                  void (async () => {
                    if (cambiado && !(await confirmar('¿Ir al historial sin guardar?', 'Se pierden los cambios de este rol.', { ok: 'Ir' }))) return;
                    onAuditoria(claveDelRol(rol));
                  })()
                }
              />
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {rol ? (
        <HojaDesdeAbajo
          visible={reemplazando}
          alCerrar={() => setReemplazando(false)}
          titulo="Pasar sus personas"
          subtitulo={`${personas} ${personas === 1 ? 'persona' : 'personas'} de «${rol.nombre}»`}
          pie={
            <BotonPrincipal
              etiqueta={destino === undefined ? 'Elige a qué rol' : `Pasar ${personas} ${personas === 1 ? 'persona' : 'personas'}`}
              onPress={() => destino !== undefined && void reemplazar(destino)}
              cargando={ocupado}
              deshabilitado={destino === undefined || ocupado}
            />
          }
        >
          <View style={{ gap: 14, paddingBottom: 8 }}>
            <Text style={ayuda}>Solo a otro rol de la misma base ({etiquetaDeRol(rol.rolBase)}), o a ninguno.</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel="A qué rol pasan" style={estilos.chips}>
              {destinos.map(d => (
                <ChipDeOpcion key={d.id ?? 'ninguno'} etiqueta={d.nombre} activo={destino === d.id} onPress={() => setDestino(d.id)} />
              ))}
            </View>
            <FormField
              label="Motivo"
              helperText="Obligatorio. Queda en la auditoría."
              value={motivoDelReemplazo}
              onChangeText={setMotivoDelReemplazo}
              placeholder="Ej.: Se unifican los roles de mentores."
              multiline
              numberOfLines={2}
            />
          </View>
        </HojaDesdeAbajo>
      ) : null}

      <HojaDeContrasena
        visible={pendiente !== null}
        nombre={rol?.nombre ?? (formulario.nombre.trim() || 'Rol nuevo')}
        explicacion="Borrar un rol o pasar sus personas a otro es un cambio crítico: confirma con tu contraseña."
        error={errorContrasena}
        enviando={confirmandoContrasena}
        onConfirmar={contrasena => void confirmarConContrasena(contrasena)}
        onCerrar={() => setPendiente(null)}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  accion: { flexGrow: 1, flexBasis: 140 },
  interruptor: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 12, minHeight: 56 },
});
