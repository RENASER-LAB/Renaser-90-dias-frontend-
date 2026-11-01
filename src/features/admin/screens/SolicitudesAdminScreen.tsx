import { fuentes } from '../../../theme/fuentes';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonPeligro, BotonPrincipal, BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { Checkbox } from '../../../components/Checkbox';
import { ControlSegmentado } from '../../../components/ControlSegmentado';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { tacto } from '../../../utils/tacto';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { aprobarSolicitud, listarAprendices, listarSolicitudes, rechazarSolicitud } from '../api/adminApi';
import type { OpcionDeRol } from '../api/adminApi';
import { useOpcionesDeRol } from '../hooks/useOpcionesDeRol';
import { useOpcionesDeAceptacion } from '../hooks/useOpcionesDeAceptacion';
import type { SolicitudApi } from '../api/adminSchemas';
import { AceptarSolicitudSheet } from '../components/AceptarSolicitudSheet';
import { AvisoBreve } from '../components/AvisoBreve';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import { FiltroDeFormacion } from '../../formaciones/components/FiltroDeFormacion';
import { aceptarUnaPorUna, textoDelResultado } from '../utils/aceptarVarias';
import {
  descripcionDeLaAceptacion,
  eleccionParaElPedido,
  frase,
  recordarLaUltima,
  type BorradorDeAceptacion,
  type PersonaPorAceptar,
} from '../utils/aceptarSolicitud';
import { fechaCorta } from '../utils/fechas';
import { quedanPorTraer, sinLaDecidida, sumarPagina, textoVerMas } from '../utils/paginasDeSolicitudes';
import { confirmar, avisar } from '../utils/dialogo';
import { mensajeDeAltaAprobada, mensajeDeFallo } from '../utils/mensajes';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';

/**
 * Las altas pendientes de decidir, y qué pasó después de aprobarlas.
 *
 * **Aprobar una cuenta NO es lo mismo que darle la bienvenida.** Al aprobar, el backend crea el
 * usuario y, aparte, intenta meterlo en el grupo de bienvenida vigente. Si no hay ninguno abierto,
 * la persona entra sin grupo — y eso es una tarea del administrador, no un fallo del sistema. Por
 * eso esta pantalla, después de aprobar, dice el estado REAL en vez de anunciar un éxito que no
 * comprobó (ARF-03).
 *
 * Aprobar dos veces no duplica nada: el servidor rechaza la segunda. El aviso que se muestra sale
 * de lo que él responde, no de lo que la pantalla supone.
 *
 * > **Corregido 2026-09-15.** Los desenlaces de ese aviso son **tres**, no dos: entró, no entró, y
 * > *no se pudo averiguar*. El tercero existe porque saber si entró es comparar la cola de "sin
 * > grupo" antes y después, y cualquiera de las dos consultas puede fallar. Antes ese caso caía en
 * > "no entró" y la pantalla afirmaba «quedó SIN grupo» sin haberlo comprobado. El texto vive en
 * > `mensajeDeAltaAprobada`, con sus pruebas.
 *
 * > **Corregido 2026-09-26 (A-4).** Solo cargaba la página 0 (20 solicitudes): la 21 no aparecía en
 * > ningún lado. Ahora hay «Ver más». Y aprobar ya no abre un diálogo que hay que cerrar: la
 * > solicitud sale de la lista y el resultado llega como aviso breve (`AvisoBreve`). Rechazar sigue
 * > pidiendo confirmación, porque no se deshace.
 *
 * **El rol se elige al aprobar** (backend D-265, pedido del dueño del 2026-10-13): cada solicitud ofrece los seis
 * roles con Aprendiz marcado. Aprobar como aprendiz sigue siendo UN toque y sin cuerpo en el pedido (lo de siempre);
 * con otro rol se confirma, porque da más acceso, y el servidor lo aplica como el cambio de rol de «Equipo y roles».
 *
 * **Spec 002, fase 2 (contrato §4.5):** los roles salen de `GET /admin/roles-asignables`: los seis base y, debajo, los
 * personalizados activos (cada uno dice de cuál hereda). Elegir uno manda además `rolPersonalizadoId`. Sin el endpoint,
 * los seis de siempre.
 *
 * **Spec 025 (backend D-302, 2026-10-31): se acepta eligiendo formación, duración, rol y ficha.** «Aceptar» abre una hoja
 * (`AceptarSolicitudSheet`) con tres bloques en orden —Formación (y su duración si el Diplomado ofrece dos), Rol y Ficha de entrada— y una frase
 * de resumen que se confirma. Viene marcado Escuela, Aprendiz y sin diagnóstico, así que aceptar a un aprendiz de la Escuela son dos toques.
 * Se puede aceptar una por una o marcar varias y aceptarlas con la misma elección (se hacen una por una). La lista tiene tres vistas —por decidir,
 * aceptadas y rechazadas— y las aceptadas dicen quién las aceptó y qué se eligió, con un filtro por formación. Contra un backend anterior (sin
 * `GET /account-requests/acceptance-options`) la hoja pide solo el rol y no manda formaciones, como hasta ahora.
 */
type Vista = 'PENDING' | 'APPROVED' | 'REJECTED';

const VISTAS = [
  { valor: 'PENDING' as const, etiqueta: 'Por decidir' },
  { valor: 'APPROVED' as const, etiqueta: 'Aceptadas' },
  { valor: 'REJECTED' as const, etiqueta: 'Rechazadas' },
];

export function SolicitudesAdminScreen({
  onVolver,
  onIrAGrupos,
}: {
  onVolver: () => void;
  onIrAGrupos: () => void;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

  const [vista, setVista] = useState<Vista>('PENDING');
  /** El filtro «Formación» de las aceptadas (spec 025, US4); `null` = todas. */
  const [formacion, setFormacion] = useState<string | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudApi[]>([]);
  /** El total que dice el servidor: con él se sabe si hay más páginas (26/09, A-4). */
  const [total, setTotal] = useState<number | null>(null);
  const [pagina, setPagina] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [sinGrupo, setSinGrupo] = useState<number | null>(null);
  const [avisoFinal, setAvisoFinal] = useState<string | null>(null);
  const cerrarAviso = useCallback(() => setAvisoFinal(null), []);
  const roles = useOpcionesDeRol();
  /** `undefined` mientras se lee; `null` = el servidor no lo ofrece (la hoja pide solo el rol). */
  const opciones = useOpcionesDeAceptacion();
  /** Quién se está aceptando ahora (la hoja abierta) y qué falló en el último intento. */
  const [porAceptar, setPorAceptar] = useState<PersonaPorAceptar[] | null>(null);
  const [progreso, setProgreso] = useState<string | null>(null);
  const [errorDeLaHoja, setErrorDeLaHoja] = useState<string | null>(null);
  /** Las marcadas para aceptar varias a la vez (spec 025, 025-3 C). */
  const [seleccionando, setSeleccionando] = useState(false);
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(new Set());

  useSystemBackHandler(() => {
    if (porAceptar && progreso === null) {
      setPorAceptar(null);
      return true;
    }
    if (seleccionando) {
      setSeleccionando(false);
      setMarcadas(new Set());
      return true;
    }
    onVolver();
    return true;
  });

  const contarSinGrupo = useCallback(() => {
    // Aparte y sin bloquear: si esta consulta falla, la lista de solicitudes se ve igual.
    void listarAprendices({ pagina: 0, tamano: 1, soloSinGrupo: true }).then(
      p => setSinGrupo(p.total),
      () => setSinGrupo(null),
    );
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const primera = await listarSolicitudes(vista, 0, vista === 'APPROVED' ? formacion : null);
      setSolicitudes(primera.content);
      setTotal(primera.total);
      setPagina(0);
    } catch (e) {
      setError(mensajeDeFallo(e, 'No se pudieron cargar las solicitudes.'));
    } finally {
      setCargando(false);
    }
    contarSinGrupo();
  }, [contarSinGrupo, vista, formacion]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /** «Ver más»: la página siguiente, sumada a lo que ya se ve. */
  const verMas = async () => {
    setCargandoMas(true);
    try {
      const siguiente = await listarSolicitudes(vista, pagina + 1, vista === 'APPROVED' ? formacion : null);
      setSolicitudes(actuales => sumarPagina(actuales, siguiente.content));
      setTotal(siguiente.total);
      setPagina(pagina + 1);
    } catch (e) {
      avisar('No se pudieron traer más', mensajeDeFallo(e, 'Inténtalo de nuevo.'));
    } finally {
      setCargandoMas(false);
    }
  };

  /** Saca la decidida de la lista sin volver a la página 0: quien iba por la 21 sigue ahí. */
  const quitarDeLaLista = (id: string) => {
    setSolicitudes(actuales => sinLaDecidida(actuales, null, id).lista);
    setTotal(anterior => (anterior === null ? null : Math.max(0, anterior - 1)));
    setMarcadas(actuales => {
      const sin = new Set(actuales);
      sin.delete(id);
      return sin;
    });
  };

  const abrirLaHoja = (personas: PersonaPorAceptar[]) => {
    setErrorDeLaHoja(null);
    setPorAceptar(personas);
  };

  const personaDe = (solicitud: SolicitudApi): PersonaPorAceptar => ({ id: solicitud.id, nombre: solicitud.fullName ?? 'esta persona' });

  /**
   * Acepta a quienes la hoja tiene por aceptar, con lo elegido (spec 025). Una por una: cada una es su propia transacción en el servidor,
   * así que una que falla no deshace las demás. Las que fallan quedan en la hoja para reintentarlas; si todas entran, la hoja se cierra.
   */
  const aceptar = async (borrador: BorradorDeAceptacion, rol: OpcionDeRol) => {
    if (!porAceptar) return;
    setErrorDeLaHoja(null);
    const opcionesDeLaHoja = opciones ?? null;
    const eleccion = eleccionParaElPedido(borrador, opcionesDeLaHoja);
    const resultado = await aceptarUnaPorUna(
      porAceptar,
      async persona => {
        try {
          await aprobarSolicitud(persona.id, rol.rolBase, rol.rolPersonalizadoId, eleccion);
        } catch (e) {
          throw new Error(mensajeDeFallo(e, 'Inténtalo de nuevo.'));
        }
        quitarDeLaLista(persona.id);
      },
      (hechas, todas) => setProgreso(todas === 1 ? 'Aceptando…' : `Aceptando ${hechas + 1} de ${todas}…`),
    );
    setProgreso(null);
    if (resultado.aceptadas.length > 0) recordarLaUltima(borrador);
    if (resultado.fallidas.length > 0) {
      tacto.error();
      setPorAceptar(resultado.fallidas.map(f => f.persona));
      setErrorDeLaHoja(textoDelResultado(resultado, porAceptar.length));
      if (resultado.aceptadas.length > 0) setAvisoFinal(`Aceptaste a ${resultado.aceptadas.length} de ${porAceptar.length}.`);
      return;
    }
    tacto.logro();
    setPorAceptar(null);
    setSeleccionando(false);
    setMarcadas(new Set());
    const quien = porAceptar.length === 1 ? porAceptar[0].nombre : `Las ${porAceptar.length} personas`;
    const dicho = frase(quien, porAceptar.length > 1, borrador, rol, opcionesDeLaHoja, true);
    if (porAceptar.length === 1 && rol.rolBase === 'TRAINEE') {
      /* Se vuelve a consultar la cola de "sin grupo" ANTES de decir nada: así el mensaje describe lo que efectivamente pasó y no lo que se
         esperaba que pasara. Va en su PROPIO try: la cuenta ya está aceptada y no puede verse como un fallo (ARF-03). */
      const despues = await listarAprendices({ pagina: 0, tamano: 1, soloSinGrupo: true }).then(
        p => p.total,
        () => null,
      );
      setAvisoFinal(`${dicho} ${mensajeDeAltaAprobada(porAceptar[0].nombre, sinGrupo, despues)}`);
      if (despues !== null) setSinGrupo(despues);
      return;
    }
    setAvisoFinal(dicho);
  };

  const rechazar = async (solicitud: SolicitudApi) => {
    const acepto = await confirmar(
      'Rechazar solicitud',
      `${solicitud.fullName ?? 'Esta persona'} no podrá entrar con este correo. ¿Confirmas?`,
      { ok: 'Rechazar', destructivo: true },
    );
    if (!acepto) return;
    setTrabajando(solicitud.id);
    try {
      await rechazarSolicitud(solicitud.id, 'Rechazada desde el panel de administración');
      quitarDeLaLista(solicitud.id);
      setAvisoFinal(`Solicitud de ${solicitud.fullName ?? 'esta persona'} rechazada.`);
    } catch (e) {
      avisar('No se pudo rechazar', mensajeDeFallo(e, 'Inténtalo de nuevo.'));
    } finally {
      setTrabajando(null);
    }
  };

  const alternarMarca = (id: string) =>
    setMarcadas(actuales => {
      const siguiente = new Set(actuales);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });

  const cambiarVista = (siguiente: Vista) => {
    setVista(siguiente);
    setSeleccionando(false);
    setMarcadas(new Set());
  };

  const subtitulo =
    total === null
      ? 'Altas por decidir'
      : vista === 'PENDING'
        ? `${total} por decidir`
        : vista === 'APPROVED'
          ? `${total} ${total === 1 ? 'aceptada' : 'aceptadas'}`
          : `${total} ${total === 1 ? 'rechazada' : 'rechazadas'}`;
  const puedeAceptar = opciones !== undefined && !trabajando;
  const marcadasEnLista = solicitudes.filter(s => marcadas.has(s.id));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Solicitudes" subtitulo={subtitulo} onVolver={onVolver} />
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
          gap: 12,
        }}
      >
        <ControlSegmentado
          opciones={VISTAS}
          valor={vista}
          onCambiar={cambiarVista}
          rol="tab"
          accessibilityLabel="Solicitudes por estado"
          achicarTexto
        />

        {vista === 'APPROVED' ? <FiltroDeFormacion valor={formacion} onCambiar={setFormacion} /> : null}

        {vista === 'PENDING' && sinGrupo !== null && sinGrupo > 0 ? (
          <Pressable
            onPress={onIrAGrupos}
            accessibilityRole="button"
            accessibilityLabel="Ver los grupos para abrir un grupo de bienvenida"
            style={[estilos.tarjeta, { backgroundColor: c.goldWash, borderColor: c.borderStrong }]}
          >
            <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 23 }]}>
              Hay {sinGrupo} {sinGrupo === 1 ? 'persona' : 'personas'} sin grupo. Si no hay un grupo de
              bienvenida abierto, quien se registre hoy también quedará afuera.
            </Text>
            <Text style={[t.body, { color: c.goldInk, fontSize: 16, fontWeight: '500', marginTop: 6 }]}>
              Ver grupos
            </Text>
          </Pressable>
        ) : null}

        {vista === 'PENDING' && solicitudes.length > 1 ? (
          <BotonSecundario
            etiqueta={seleccionando ? 'Cancelar selección' : 'Seleccionar varias'}
            accessibilityLabel={seleccionando ? 'Cancelar la selección de solicitudes' : 'Seleccionar varias solicitudes para aceptarlas juntas'}
            onPress={() => {
              setSeleccionando(actual => !actual);
              setMarcadas(new Set());
            }}
          />
        ) : null}

        {cargando ? <ActivityIndicator color={c.goldInk} style={{ marginTop: 16 }} /> : null}
        {error ? <Text style={[t.body, { color: c.danger, fontSize: 16 }]}>{error}</Text> : null}

        {!cargando && solicitudes.length === 0 && !error ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, marginTop: 8 }]}>
            {vista === 'PENDING'
              ? 'No hay solicitudes pendientes.'
              : vista === 'APPROVED'
                ? formacion
                  ? 'No hay solicitudes aceptadas en esa formación.'
                  : 'Todavía no hay solicitudes aceptadas.'
                : 'No hay solicitudes rechazadas.'}
          </Text>
        ) : null}

        {solicitudes.length > 0 ? (
          <TituloDeSeccion>{vista === 'PENDING' ? 'Por decidir' : vista === 'APPROVED' ? 'Aceptadas' : 'Rechazadas'}</TituloDeSeccion>
        ) : null}

        {solicitudes.map(solicitud => {
          const decidida = vista === 'PENDING' ? null : textoDeLaDecision(solicitud);
          return (
            <View key={solicitud.id} style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border, gap: 4 }]}>
              {seleccionando && vista === 'PENDING' ? (
                <Checkbox
                  checked={marcadas.has(solicitud.id)}
                  onToggle={() => alternarMarca(solicitud.id)}
                  title={solicitud.fullName ?? 'Sin nombre'}
                  subtitle={solicitud.email ?? 'Sin correo'}
                />
              ) : (
                <>
                  <Text style={[t.body, { color: c.textStrong, fontSize: 18, fontFamily: fuentes.media }]}>
                    {solicitud.fullName ?? 'Sin nombre'}
                  </Text>
                  <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{solicitud.email ?? 'Sin correo'}</Text>
                </>
              )}
              {decidida ? (
                <>
                  <Text style={[t.body, { color: c.textStrong, fontSize: 16, marginTop: 6 }]}>{decidida.titulo}</Text>
                  {decidida.detalle ? <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{decidida.detalle}</Text> : null}
                </>
              ) : null}
              {vista === 'PENDING' && !seleccionando ? (
                <View style={estilos.acciones}>
                  {/* «Aceptar» abre la hoja donde se elige formación, rol y ficha (spec 025): el rol ya no es una fila de chips en cada tarjeta. */}
                  <BotonPrincipal
                    etiqueta="Aceptar"
                    onPress={() => abrirLaHoja([personaDe(solicitud)])}
                    deshabilitado={!puedeAceptar}
                    accessibilityLabel={`Aceptar a ${solicitud.fullName ?? 'esta persona'}`}
                    estilo={estilos.boton}
                  />
                  <BotonPeligro
                    etiqueta="Rechazar"
                    onPress={() => void rechazar(solicitud)}
                    deshabilitado={trabajando === solicitud.id}
                    accessibilityLabel={`Rechazar a ${solicitud.fullName ?? 'esta persona'}`}
                    estilo={estilos.boton}
                  />
                </View>
              ) : null}
            </View>
          );
        })}

        {seleccionando && vista === 'PENDING' ? (
          <BotonPrincipal
            etiqueta={marcadasEnLista.length === 0 ? 'Marca a quién aceptar' : `Aceptar ${marcadasEnLista.length} ${marcadasEnLista.length === 1 ? 'solicitud' : 'solicitudes'}`}
            onPress={() => abrirLaHoja(marcadasEnLista.map(personaDe))}
            deshabilitado={marcadasEnLista.length === 0 || !puedeAceptar}
          />
        ) : null}

        {!cargando && total !== null && quedanPorTraer(solicitudes.length, total) ? (
          <BotonSecundario
            etiqueta={cargandoMas ? 'Cargando…' : textoVerMas(solicitudes.length, total)}
            onPress={() => void verMas()}
            cargando={cargandoMas}
          />
        ) : null}
      </ScrollView>
      <AceptarSolicitudSheet
        visible={porAceptar !== null}
        personas={porAceptar ?? []}
        opciones={opciones ?? null}
        roles={roles}
        enCurso={progreso}
        error={errorDeLaHoja}
        alCerrar={() => setPorAceptar(null)}
        alConfirmar={(borrador, rol) => void aceptar(borrador, rol)}
      />
      <AvisoBreve texto={avisoFinal} onCerrar={cerrarAviso} />
    </SafeAreaView>
  );
}

/** Lo que dice una solicitud ya decidida: quién y cuándo, y qué se eligió (spec 025, US4) o por qué se rechazó. */
function textoDeLaDecision(solicitud: SolicitudApi): { titulo: string; detalle: string | null } {
  const cuando = solicitud.reviewedAt ? ` el ${fechaCorta(solicitud.reviewedAt)}` : '';
  const quien = solicitud.reviewedByName ? ` por ${solicitud.reviewedByName}` : '';
  if (solicitud.status === 'REJECTED') {
    return { titulo: `Rechazada${quien}${cuando}`, detalle: solicitud.rejectionReason ?? null };
  }
  return { titulo: `Aceptada${quien}${cuando}`, detalle: descripcionDeLaAceptacion(solicitud.acceptance) };
}

const estilos = StyleSheet.create({
  tarjeta: { borderRadius: 14, borderWidth: 1, padding: 16, width: '100%' },
  acciones: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  boton: { flexGrow: 1, flexBasis: 130 },
});
