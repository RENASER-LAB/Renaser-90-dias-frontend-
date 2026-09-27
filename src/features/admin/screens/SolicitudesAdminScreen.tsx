import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonPeligro, BotonPrincipal, BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { aprobarSolicitud, listarAprendices, listarSolicitudes, rechazarSolicitud } from '../api/adminApi';
import type { SolicitudApi } from '../api/adminSchemas';
import { AvisoBreve } from '../components/AvisoBreve';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import { quedanPorTraer, sinLaDecidida, sumarPagina, textoVerMas } from '../utils/paginasDeSolicitudes';
import { confirmar, avisar } from '../utils/dialogo';
import { mensajeDeAltaAprobada, mensajeDeFallo } from '../utils/mensajes';

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
 */
export function SolicitudesAdminScreen({
  onVolver,
  onIrAGrupos,
}: {
  onVolver: () => void;
  onIrAGrupos: () => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();

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

  useSystemBackHandler(() => {
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
      const primera = await listarSolicitudes('PENDING', 0);
      setSolicitudes(primera.content);
      setTotal(primera.total);
      setPagina(0);
    } catch (e) {
      setError(mensajeDeFallo(e, 'No se pudieron cargar las solicitudes.'));
    } finally {
      setCargando(false);
    }
    contarSinGrupo();
  }, [contarSinGrupo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /** «Ver más»: la página siguiente, sumada a lo que ya se ve. */
  const verMas = async () => {
    setCargandoMas(true);
    try {
      const siguiente = await listarSolicitudes('PENDING', pagina + 1);
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
  };

  /**
   * Aprobar es UN toque (A-4): no hay confirmación —aprobar no borra nada y el servidor rechaza la
   * segunda— y el resultado llega como aviso breve abajo, sin diálogo que cerrar.
   */
  const aprobar = async (solicitud: SolicitudApi) => {
    setTrabajando(solicitud.id);
    try {
      await aprobarSolicitud(solicitud.id);
      quitarDeLaLista(solicitud.id);
      /* Se vuelve a consultar la cola de "sin grupo" ANTES de decir nada: así el mensaje describe
         lo que efectivamente pasó y no lo que se esperaba que pasara.

         Va en su PROPIO try: la cuenta ya está aprobada. Si esta segunda consulta falla, caer al
         `catch` de abajo haría decir «No se pudo aprobar» sobre un alta que sí ocurrió — y el
         administrador la aprobaría otra vez. Un `null` acá significa «no sé si entró a un
         grupo», y `mensajeDeAltaAprobada` lo dice con esas palabras. */
      const despues = await listarAprendices({ pagina: 0, tamano: 1, soloSinGrupo: true }).then(
        p => p.total,
        () => null,
      );
      setAvisoFinal(`Cuenta aprobada. ${mensajeDeAltaAprobada(solicitud.fullName, sinGrupo, despues)}`);
      if (despues !== null) setSinGrupo(despues);
    } catch (e) {
      avisar('No se pudo aprobar', mensajeDeFallo(e, 'Inténtalo de nuevo.'));
    } finally {
      setTrabajando(null);
    }
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin
        titulo="Solicitudes"
        subtitulo={total === null ? 'Altas por decidir' : `${total} por decidir`}
        onVolver={onVolver}
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
          gap: 12,
        }}
      >
        {sinGrupo !== null && sinGrupo > 0 ? (
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

        {cargando ? <ActivityIndicator color={c.goldInk} style={{ marginTop: 16 }} /> : null}
        {error ? <Text style={[t.body, { color: c.danger, fontSize: 16 }]}>{error}</Text> : null}

        {!cargando && solicitudes.length === 0 && !error ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, marginTop: 8 }]}>
            No hay solicitudes pendientes.
          </Text>
        ) : null}

        {solicitudes.length > 0 ? <TituloDeSeccion>Por decidir</TituloDeSeccion> : null}

        {solicitudes.map(solicitud => (
          <View
            key={solicitud.id}
            style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border, gap: 4 }]}
          >
            <Text style={[t.body, { color: c.textStrong, fontSize: 18, fontFamily: 'Jost_500Medium' }]}>
              {solicitud.fullName ?? 'Sin nombre'}
            </Text>
            <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{solicitud.email ?? 'Sin correo'}</Text>
            <View style={estilos.acciones}>
              <BotonPrincipal
                etiqueta={trabajando === solicitud.id ? 'Aprobando…' : 'Aprobar'}
                onPress={() => void aprobar(solicitud)}
                deshabilitado={trabajando === solicitud.id}
                accessibilityLabel={`Aprobar a ${solicitud.fullName ?? 'esta persona'}`}
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
          </View>
        ))}

        {!cargando && total !== null && quedanPorTraer(solicitudes.length, total) ? (
          <BotonSecundario
            etiqueta={cargandoMas ? 'Cargando…' : textoVerMas(solicitudes.length, total)}
            onPress={() => void verMas()}
            cargando={cargandoMas}
          />
        ) : null}
      </ScrollView>
      <AvisoBreve texto={avisoFinal} onCerrar={cerrarAviso} />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderRadius: 14, borderWidth: 1, padding: 16, width: '100%' },
  acciones: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  boton: { flexGrow: 1, flexBasis: 130 },
});
