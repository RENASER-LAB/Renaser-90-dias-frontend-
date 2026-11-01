import { tituloEnTipoOracion } from '../../habits/utils/tituloEnTipoOracion';
import { fuentes } from '../../../theme/fuentes';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Alert } from '../../../components/Alerta';
import { BotonPeligro, BotonSecundario, SeccionPlegable } from '../../../components/Legible';
import { irAPestana } from '../../../navigation/navegacionRef';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { abrirConversacionDirecta } from '../../chat/api/chatApi';
import { EvidenciaDeObligacion } from '../../lider-mentores/components/EvidenciaDeObligacion';
import { VerPublicacion } from '../../lider-mentores/components/VisorDePublicacion';
import { obtenerRadarDePersona } from '../../lider-mentores/api/cumplimientoDelLiderApi';
import { CodigoRenaserDelAlumno } from '../../mentor/components/CodigoRenaserDelAlumno';
import { obtenerCierresDePersona } from '../../cierre/api/cierreApi';
import { CierresDelDia } from '../../cierre/components/CierresDelDia';
import type { CargarCierres } from '../../cierre/types/cierre.types';
import { obtenerHuecosDePersona } from '../../huecos/api/huecosApi';
import { TiempoLibreDeLaSemana } from '../../huecos/components/TiempoLibreDeLaSemana';
import type { CargarHuecos } from '../../huecos/types/huecos.types';
import { RejillaSemanal } from '../../mentor/components/RejillaSemanal';
import { diaInicialDelDetalle } from '../../mentor/utils/diaInicialDelDetalle';
import { TarjetaSemaforoDeAprendiz } from '../../semaforo/components/TarjetaSemaforoDeAprendiz';
import { ChipDeCaja } from '../../caja/components/ChipDeCaja';
import { useAuth } from '../../auth/context/AuthContext';
import { avisoDeCuentaCerrada, puedeEliminarCuentaAjena } from '../../cuenta/utils/eliminarCuenta';
import { recuperarCuentaDePersona } from '../api/adminApi';
import { mensajeDeFallo } from '../utils/mensajes';
import { avisar } from '../utils/dialogo';
import type { PersonaDeFicha } from '../types/admin.types';
import { AvisoBreve } from '../components/AvisoBreve';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import { useDetalleAprendiz } from '../hooks/useDetalleAprendiz';
import { useSemanaAdministrativa } from '../hooks/useSemanaAdministrativa';
import { disponibilidadDelCambio, textoDelUltimoAjuste } from '../utils/diaDelPrograma';
import { fechaCorta, hoyIso } from '../utils/fechas';
import { grupoParaVerSusDias } from '../utils/susDiasYEvidencias';
import { CambiarDiaScreen } from './CambiarDiaScreen';
import { EliminarCuentaAdminScreen } from './EliminarCuentaAdminScreen';
import { rotuloDeFase } from '../../home/hooks/useResumenHome';
import { FichaDeIngresoDeLaPersona } from '../../diagnostico-admin/components/FichaDeIngresoDeLaPersona';
import { FormacionDeLaPersona } from '../../formaciones/components/FormacionDeLaPersona';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';

/**
 * La ficha de un aprendiz vista por administración: quién es, cómo viene la semana y qué entregó.
 *
 * **Reutiliza `RejillaSemanal` y el mismo tipo de datos que ve el mentor.** No es ahorro de
 * código: es que el administrador y el mentor tienen que ver EL MISMO día con los mismos estados.
 * Dos rejillas distintas serían dos verdades, y ninguna pantalla podría decir cuál es la buena.
 *
 * **Es de lectura.** No hay botón para completar un hábito ni para firmar por nadie: el
 * cumplimiento lo registra la persona, y un administrador marcándolo por ella convertiría el dato
 * en otra cosa (ARF-10).
 *
 * La evaluación no se calcula acá. Los números que se muestran son los que devuelve el servidor.
 *
 * **Las evidencias se abren en la hoja del líder** (`EvidenciaDeObligacion`, 2026-10-27): foto, audio, video y
 * texto dentro de la app, para cualquier aprendiz con o sin grupo. Antes «Ver evidencia» salía al navegador
 * y una evidencia de texto decía «no hay archivo que abrir» sin mostrar lo escrito.
 *
 * **La única escritura es el día del programa** (pedido del dueño, 26/09; backend D-82): corregir
 * a mano el reloj de alguien que viajó o empezó tarde. No toca cumplimiento: mueve la fecha desde
 * la que se cuentan sus 90 días y deja constancia de quién y por qué.
 */
export function FichaAprendizScreen({
  aprendiz,
  onVolver,
  onAbrirCaja,
  onCuentaEliminada,
  onVerSusDias,
}: {
  aprendiz: PersonaDeFicha;
  onVolver: () => void;
  /** El chip de la Caja Renaser (D-219) abre su caja. Sin esto, el chip solo se muestra. */
  onAbrirCaja?: (aprendizId: string) => void;
  /** D-243: tras «Eliminar cuenta» (204). Sin esto, se vuelve con `onVolver`. */
  onCuentaEliminada?: () => void;
  /**
   * «Ver sus días y evidencias»: abre la vista del líder (sus 7 días, evidencias, «¿Qué sentiste?» y acciones) con el
   * grupo de la persona. Solo se muestra con grupo; sin esto, la ficha es la de siempre.
   */
  onVerSusDias?: (grupoId: string) => void;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  const { semana, sinDatos, cargando, fallo, desplazar } = useSemanaAdministrativa(aprendiz.id);
  const [diaElegido, setDiaElegido] = useState<string | null>(null);
  const [abriendoChat, setAbriendoChat] = useState(false);
  const programa = useDetalleAprendiz(aprendiz.id);
  const [cambiandoDia, setCambiandoDia] = useState(false);
  const [avisoFinal, setAvisoFinal] = useState<string | null>(null);
  const cerrarAviso = useCallback(() => setAvisoFinal(null), []);
  /* Eliminar cuenta (D-243): la confirmación fuerte es una vista de la ficha, como cambiar el día. */
  const { user } = useAuth();
  const [eliminandoCuenta, setEliminandoCuenta] = useState(false);
  const [recuperando, setRecuperando] = useState(false);
  const [recuperada, setRecuperada] = useState(false);

  /* Mientras se cambia el día o se confirma la eliminación, el «atrás» lo atiende esa vista. */
  useSystemBackHandler(() => {
    onVolver();
    return true;
  }, !cambiandoDia && !eliminandoCuenta);

  /* El detalle abre en el día más reciente con hábitos —hoy, en la semana en curso—, no en el lunes
     (E-439): mirando el lunes, el post de hoy parecía sin marcar. */
  useEffect(() => {
    setDiaElegido(diaInicialDelDetalle(semana?.dias ?? []));
  }, [semana]);

  const detalle = semana?.dias.find(d => d.fecha === diaElegido) ?? null;
  const grupoDeSusDias = onVerSusDias ? grupoParaVerSusDias(aprendiz) : null;
  /* Spec 012: su Código Renaser y su Mi Radar, por la lectura del liderazgo, que pide el grupo de la persona. Sin grupo
     (o en un grupo sin mentor, que el servidor responde 404) la sección no se dibuja. */
  const grupoDelRadar = grupoParaVerSusDias(aprendiz);
  const cargarRadar = useMemo(
    () => (grupoDelRadar ? (cursor?: string | null) => obtenerRadarDePersona(grupoDelRadar, aprendiz.id, cursor) : null),
    [grupoDelRadar, aprendiz.id],
  );
  /* Spec 015: su tiempo libre de la semana, por la misma lectura del liderazgo y con el mismo grupo. Una función estable por
     persona: es la llave de lo que la sección guarda mientras la ficha está abierta. */
  const cargarHuecos = useMemo<CargarHuecos | null>(
    () => (grupoDelRadar ? (lunes?: string | null) => obtenerHuecosDePersona(grupoDelRadar, aprendiz.id, lunes) : null),
    [grupoDelRadar, aprendiz.id],
  );
  /* Spec 017: lo que dijo al cerrar cada día, por la misma lectura del liderazgo y con el mismo grupo. */
  const cargarCierres = useMemo<CargarCierres | null>(
    () => (grupoDelRadar ? (lunes?: string | null) => obtenerCierresDePersona(grupoDelRadar, aprendiz.id, lunes) : null),
    [grupoDelRadar, aprendiz.id],
  );
  const nombre = aprendiz.fullName?.trim() || 'Aprendiz sin nombre';
  /* El día que trae el servidor al abrir la ficha gana sobre el de la fila que la abrió. */
  const datosDeCabecera = lineasDeCabecera(
    programa.detalle
      ? { ...aprendiz, programDay: programa.detalle.programDay, phase: programa.detalle.phase ?? aprendiz.phase }
      : aprendiz,
  );
  const disponibilidad = programa.detalle ? disponibilidadDelCambio(programa.detalle, hoyIso()) : null;
  /* El detalle (leído al abrir) gana sobre la fila; tras «Recuperar cuenta» ya no hay aviso. */
  const borradoPendiente = recuperada
    ? null
    : programa.detalle
      ? programa.detalle.deletionScheduledFor ?? null
      : aprendiz.deletionScheduledFor ?? null;
  const avisoDeCierre = avisoDeCuentaCerrada(borradoPendiente);
  const correo = programa.detalle?.email?.trim() || aprendiz.email?.trim() || null;
  const ofrecerEliminar =
    !!correo &&
    puedeEliminarCuentaAjena({
      miRol: user?.role,
      miId: user?.id,
      personaId: aprendiz.id,
      rolDePersona: programa.detalle?.role ?? null,
    });

  const recuperarCuenta = async () => {
    setRecuperando(true);
    try {
      await recuperarCuentaDePersona(aprendiz.id);
      setRecuperada(true);
      setAvisoFinal('Listo: la cuenta quedó recuperada.');
    } catch (e) {
      Alert.alert('No se pudo recuperar', mensajeDeFallo(e, 'Vuelve a intentar.'));
    } finally {
      setRecuperando(false);
      void programa.recargar();
    }
  };

  /** Abre el 1 a 1 y NO manda nada: el mensaje lo decide y lo escribe una persona (ARF-12). */
  const escribirle = async () => {
    setAbriendoChat(true);
    try {
      const conversacion = await abrirConversacionDirecta(aprendiz.id);
      const navego = irAPestana('Comunidad', { abrirChatConversacionId: conversacion.id });
      if (!navego) {
        avisar(
          'Conversación lista',
          `Tu chat con ${nombre} está en Comunidad → Miembros. No se envió ningún mensaje.`,
        );
      }
    } catch {
      avisar('No se pudo abrir el chat', 'Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setAbriendoChat(false);
    }
  };

  if (cambiandoDia && programa.detalle) {
    return (
      <CambiarDiaScreen
        aprendizId={aprendiz.id}
        nombre={nombre}
        diaActual={programa.detalle.programDay}
        onVolver={() => setCambiandoDia(false)}
        onCambiado={diaNuevo => {
          setCambiandoDia(false);
          setAvisoFinal(`Listo: ${nombre} pasó al día ${diaNuevo}.`);
          void programa.recargar();
        }}
      />
    );
  }

  if (eliminandoCuenta && correo) {
    return (
      <EliminarCuentaAdminScreen
        personaId={aprendiz.id}
        nombre={nombre}
        correo={correo}
        onVolver={() => setEliminandoCuenta(false)}
        onEliminada={() => {
          setEliminandoCuenta(false);
          Alert.alert('Cuenta eliminada', `La cuenta de ${nombre} se borró.`);
          (onCuentaEliminada ?? onVolver)();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin
        titulo={nombre}
        subtitulo={aprendiz.email ?? null}
        onVolver={onVolver}
        accion={{ etiqueta: abriendoChat ? '…' : 'Escribirle', onPress: escribirle }}
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
        {/* D-243: cerró su cuenta y se borra en esa fecha. Se puede recuperar antes. */}
        {avisoDeCierre ? (
          <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.danger, gap: 10 }]}>
            <Text style={[t.body, { color: c.danger, fontSize: 16, fontFamily: fuentes.media }]}>{avisoDeCierre}</Text>
            <BotonSecundario etiqueta="Recuperar cuenta" onPress={() => void recuperarCuenta()} cargando={recuperando} />
          </View>
        ) : null}

        {datosDeCabecera.length > 0 ? (
          <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border, gap: 6 }]}>
            {datosDeCabecera.map(linea => (
              <Text key={linea} style={[t.body, { color: c.text, fontSize: 16 }]}>
                {linea}
              </Text>
            ))}
          </View>
        ) : null}

        {/* Su formación, lo que cursó antes y, para un aprendiz, «Pasar a otra formación» (spec 022). Si el servidor no la
            ofrece (backend anterior), no se dibuja. */}
        <FormacionDeLaPersona
          personaId={aprendiz.id}
          nombre={nombre}
          esAprendiz={programa.detalle?.role === 'TRAINEE'}
          alTrasladar={destino => {
            setAvisoFinal(`Listo: ${nombre} pasó a ${destino}.`);
            void programa.recargar();
          }}
        />

        {/* Su ficha de ingreso (spec 026-9): «Estándar» o «Con diagnóstico», con «Asignar el diagnóstico» a quien ya estaba dentro y
            «Volver a la ficha estándar». Si el servidor no la ofrece (backend anterior), no se dibuja. */}
        <FichaDeIngresoDeLaPersona personaId={aprendiz.id} nombre={nombre} alCambiar={setAvisoFinal} />

        {/* Día del programa (26/09, D-82). El botón aparece solo si el servidor entregó el detalle
            administrativo —mismo permiso que el PUT— y su programa ya empezó. */}
        {programa.detalle ? (
          <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border, gap: 10 }]}>
            {programa.ultimoAjuste ? (
              <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 23 }]}>
                {textoDelUltimoAjuste(programa.ultimoAjuste, programa.quienAjusto)}
              </Text>
            ) : null}
            {disponibilidad?.puede ? (
              <BotonSecundario
                etiqueta="Cambiar día del programa"
                icono="calendar"
                onPress={() => setCambiandoDia(true)}
              />
            ) : disponibilidad ? (
              <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
                {disponibilidad.motivo}
              </Text>
            ) : null}
          </View>
        ) : programa.fallo === 'sin_red' ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>
            Sin conexión: no se pudo leer su día del programa.
          </Text>
        ) : null}

        {/* S-2 (26/09): el semáforo PRIMERO —una sola palabra de estado—, por la puerta de
            administración (`GET /api/v1/admin/trainees/{id}/semaforo`): la MISMA tarjeta que ve su
            mentor. Con 404 o 403 no se dibuja. Antes iba al final, debajo de la semana. */}
        <TarjetaSemaforoDeAprendiz origen={{ quien: 'admin', aprendizId: aprendiz.id }} />

        {/* Caja Renaser (D-219): un chip con su estado; tocarlo abre su caja. Antes del día 8, nada. */}
        <ChipDeCaja
          origen={{ quien: 'admin', aprendizId: aprendiz.id }}
          onPress={onAbrirCaja ? () => onAbrirCaja(aprendiz.id) : undefined}
        />

        {/* Lo mismo que ve el líder, día por día: evidencias de todo tipo, «¿Qué sentiste?» y fotos de las acciones.
            Con grupo y mentor; si el servidor no la abre (404), la pantalla dice por qué y se vuelve acá. */}
        {grupoDeSusDias && onVerSusDias ? (
          <BotonSecundario
            etiqueta="Ver sus días y evidencias"
            icono="listChecks"
            onPress={() => onVerSusDias(grupoDeSusDias)}
            accessibilityLabel={`Ver los días y las evidencias de ${nombre}`}
          />
        ) : null}

        {/* La semana de lunes a domingo, plegada y con su nombre verdadero. Antes se titulaba
            «Cumplimiento de la semana» y competía con el semáforo, que va de sábado a viernes. */}
        <SeccionPlegable
          titulo="Detalle de hábitos (lunes a domingo)"
          detalle={semana ? `${fechaCorta(semana.inicioDeSemana)} – ${fechaCorta(semana.finDeSemana)}` : null}
        >
          <View style={{ gap: 12 }}>
            <View style={estilos.navegacion}>
              <Pressable
                onPress={() => desplazar(-1)}
                accessibilityRole="button"
                accessibilityLabel="Semana anterior"
                style={[estilos.flecha, { borderColor: c.border }]}
              >
                <Text style={[t.body, { color: c.goldInk, fontSize: 16 }]}>‹ Anterior</Text>
              </Pressable>
              <Pressable
                onPress={() => desplazar(1)}
                accessibilityRole="button"
                accessibilityLabel="Semana siguiente"
                style={[estilos.flecha, { borderColor: c.border }]}
              >
                <Text style={[t.body, { color: c.goldInk, fontSize: 16 }]}>Siguiente ›</Text>
              </Pressable>
            </View>

            {semana?.zona ? (
              <Text style={[t.body, { color: c.textSoft, fontSize: 14 /* metadato */ }]}>
                Sus días se cuentan en {semana.zona}
              </Text>
            ) : null}

            {cargando ? <ActivityIndicator color={c.goldInk} /> : null}

            {fallo ? (
              <Text style={[t.body, { color: c.danger, fontSize: 16 }]}>
                {fallo === 'sin_permiso'
                  ? 'Tu cuenta no puede ver cuánto cumplió esta persona.'
                  : fallo === 'sin_red'
                    ? 'Sin conexión. Vuelve a intentar en un momento.'
                    : 'No se pudo cargar la semana.'}
              </Text>
            ) : null}

            {/* SIN_DATOS no es incumplimiento: puede que el padrón de ese período no se generara. */}
            {semana && sinDatos ? (
              <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
                Todavía sin actividad para medir en esta semana. No significa que no haya cumplido:
                no hay hábitos registrados para estos días.
              </Text>
            ) : null}

            {semana && !sinDatos ? (
              <>
                <Text style={[t.body, { color: c.text, fontSize: 16 }]}>
                  {semana.resumen.cumplidas} de {semana.resumen.obligaciones} cumplidos ·{' '}
                  {semana.resumen.conEntrega} con evidencia
                </Text>
                <RejillaSemanal dias={semana.dias} />
              </>
            ) : null}

            {semana && !sinDatos && semana.dias.some(d => d.obligaciones.length > 0) ? (
              <View style={{ gap: 8 }}>
                <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media }]}>
                  Elige un día
                </Text>
                <View style={estilos.dias}>
                  {semana.dias
                    .filter(d => d.obligaciones.length > 0)
                    .map(d => {
                      const activo = d.fecha === diaElegido;
                      return (
                        <Pressable
                          key={d.fecha}
                          onPress={() => setDiaElegido(d.fecha)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: activo }}
                          accessibilityLabel={fechaCorta(d.fecha)}
                          style={[
                            estilos.dia,
                            {
                              borderColor: activo ? c.goldInk : c.border,
                              backgroundColor: activo ? c.goldWash : 'transparent',
                            },
                          ]}
                        >
                          <Text style={[t.body, { color: activo ? c.goldInk : c.textSoft, fontSize: 16 }]}>
                            {fechaCorta(d.fecha)}
                          </Text>
                        </Pressable>
                      );
                    })}
                </View>
              </View>
            ) : null}

            {detalle && detalle.obligaciones.length > 0 ? (
              <View style={{ gap: 10 }}>
                <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media }]}>
                  Detalle del {fechaCorta(detalle.fecha)}
                </Text>
                {detalle.obligaciones.map(o => (
                  <View
                    key={o.registroId}
                    style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border, gap: 4 }]}
                  >
                    <Text style={[t.body, { color: c.textStrong, fontSize: 16 }]}>{tituloEnTipoOracion(o.titulo)}</Text>
                    {/* Estado en PALABRAS además de color: el color solo no alcanza (AGENTS.md §4). */}
                    <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>
                      {etiquetaDeEstado(o.estadoHabito)} · {etiquetaDeEntrega(o.entrega)}
                      {o.revision ? ` · revisión: ${o.revision.toLowerCase()}` : ''}
                    </Text>
                    {/* La misma hoja que usa el líder: foto, audio, video y TEXTO se ven dentro de la app, sin salir al
                        navegador. El enlace se pide al abrirla (vence a los diez minutos) y el tipo se averigua al abrir. */}
                    {o.evidenciaId ? (
                      <EvidenciaDeObligacion
                        titulo={tituloEnTipoOracion(o.titulo)}
                        evidencias={[{ id: o.evidenciaId, tipo: null, subidaEn: null }]}
                      />
                    ) : null}
                    {/* Spec 005 (R-6): el post diario se cumple publicando en el Muro, y esa publicación es su
                        evidencia; antes la ficha decía «sin evidencia». */}
                    {o.publicacionId ? <VerPublicacion publicacionId={o.publicacionId} titulo={tituloEnTipoOracion(o.titulo)} /> : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </SeccionPlegable>

        {/* Spec 012: su Código Renaser (los días 1 a 7 y los de Mi Radar), solo lectura. */}
        <CodigoRenaserDelAlumno cargar={cargarRadar} />

        {/* Spec 015: lo que le queda libre entre lo que planificó, de lunes a domingo (solo lectura). */}
        <TiempoLibreDeLaSemana cargar={cargarHuecos} />

        {/* Spec 017: lo que dijo al cerrar cada día, de lunes a domingo (solo lectura). */}
        <CierresDelDia cargar={cargarCierres} />

        {/* D-243: solo ADMIN o ALQUIMISTA, nunca sobre sí mismo; sobre un ADMIN o ALQUIMISTA, solo un ADMIN. */}
        {ofrecerEliminar ? (
          <BotonPeligro etiqueta="Eliminar cuenta" onPress={() => setEliminandoCuenta(true)} estilo={{ marginTop: 12 }} />
        ) : null}
      </ScrollView>
      <AvisoBreve texto={avisoFinal} onCerrar={cerrarAviso} />
    </SafeAreaView>
  );
}

/**
 * Lo que se sabe de la persona, en renglones. Si la ficha se abrió desde el semáforo solo se sabe el
 * nombre (y el grupo), y entonces no se inventa «Día 0 del programa».
 */
function lineasDeCabecera(aprendiz: PersonaDeFicha): string[] {
  const lineas: string[] = [];
  if (aprendiz.programDay != null) {
    lineas.push(
      `Día ${aprendiz.programDay} del programa` +
        (aprendiz.phase ? ` · ${rotuloDeFase(aprendiz.phase) ?? aprendiz.phase}` : ''),
    );
  }
  if (aprendiz.cellId !== undefined) {
    lineas.push(aprendiz.cellId ? 'Con grupo asignado' : 'Sin grupo · esperando que alguien lo ubique');
  }
  return lineas;
}

function etiquetaDeEstado(estado: string): string {
  return (
    {
      PENDIENTE: 'Pendiente',
      EN_CURSO: 'En curso',
      COMPLETADO: 'Cumplido',
      FALLIDO: 'Sin cumplir',
      EXPIRADO: 'Venció',
    }[estado] ?? estado
  );
}

function etiquetaDeEntrega(entrega: string): string {
  return (
    {
      NO_REQUERIDA: 'no pedía evidencia',
      SIN_ENTREGA: 'sin evidencia',
      ENTREGADA: 'con evidencia',
    }[entrega] ?? entrega
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderRadius: 14, borderWidth: 1, padding: 14, width: '100%' },
  navegacion: { flexDirection: 'row', gap: 10 },
  flecha: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1 },
  dias: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dia: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
});
