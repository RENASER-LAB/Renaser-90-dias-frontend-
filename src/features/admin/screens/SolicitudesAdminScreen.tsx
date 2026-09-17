import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MicroLabel } from '../../../components/ui';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { aprobarSolicitud, listarAprendices, listarSolicitudes, rechazarSolicitud } from '../api/adminApi';
import type { SolicitudApi } from '../api/adminSchemas';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
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
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [sinGrupo, setSinGrupo] = useState<number | null>(null);

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const pagina = await listarSolicitudes('PENDING', 0);
      setSolicitudes(pagina.content);
    } catch (e) {
      setError(mensajeDeFallo(e, 'No se pudieron cargar las solicitudes.'));
    } finally {
      setCargando(false);
    }
    // Aparte y sin bloquear: si esta consulta falla, la lista de solicitudes se ve igual.
    void listarAprendices({ pagina: 0, tamano: 1, soloSinGrupo: true }).then(
      p => setSinGrupo(p.total),
      () => setSinGrupo(null),
    );
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const aprobar = async (solicitud: SolicitudApi) => {
    setTrabajando(solicitud.id);
    try {
      await aprobarSolicitud(solicitud.id);
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
      avisar('Cuenta aprobada', mensajeDeAltaAprobada(solicitud.fullName, sinGrupo, despues));
      await cargar();
    } catch (e) {
      avisar('No se pudo aprobar', mensajeDeFallo(e, 'Inténtalo de nuevo.'));
    } finally {
      setTrabajando(null);
    }
  };

  const rechazar = async (solicitud: SolicitudApi) => {
    const acepto = await confirmar(
      'Rechazar solicitud',
      `${solicitud.fullName ?? 'Esta persona'} no podrá entrar con este correo. ¿Confirmás?`,
      { ok: 'Rechazar', destructivo: true },
    );
    if (!acepto) return;
    setTrabajando(solicitud.id);
    try {
      await rechazarSolicitud(solicitud.id, 'Rechazada desde el panel de administración');
      await cargar();
    } catch (e) {
      avisar('No se pudo rechazar', mensajeDeFallo(e, 'Inténtalo de nuevo.'));
    } finally {
      setTrabajando(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Solicitudes" subtitulo="Altas pendientes de decidir" onVolver={onVolver} />
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
            accessibilityLabel="Ver los grupos para abrir una bienvenida"
            style={[estilos.tarjeta, { backgroundColor: c.goldWash, borderColor: c.borderStrong }]}
          >
            <Text style={[t.body, { color: c.textStrong, fontSize: 14, lineHeight: 20 }]}>
              Hay {sinGrupo} {sinGrupo === 1 ? 'persona' : 'personas'} sin grupo. Si no hay una
              bienvenida abierta, quien se registre hoy también quedará afuera.
            </Text>
            <Text style={[t.body, { color: c.goldInk, fontSize: 13.5, fontWeight: '500', marginTop: 6 }]}>
              Ver grupos
            </Text>
          </Pressable>
        ) : null}

        {cargando ? <ActivityIndicator color={c.goldInk} style={{ marginTop: 16 }} /> : null}
        {error ? <Text style={[t.body, { color: c.danger, fontSize: 13.5 }]}>{error}</Text> : null}

        {!cargando && solicitudes.length === 0 && !error ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 14, marginTop: 8 }]}>
            No hay solicitudes pendientes.
          </Text>
        ) : null}

        {solicitudes.length > 0 ? <MicroLabel>Pendientes</MicroLabel> : null}

        {solicitudes.map(solicitud => (
          <View
            key={solicitud.id}
            style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border, gap: 4 }]}
          >
            <Text style={[t.body, { color: c.textStrong, fontSize: 15.5, fontWeight: '500' }]}>
              {solicitud.fullName ?? 'Sin nombre'}
            </Text>
            <Text style={[t.body, { color: c.textSoft, fontSize: 13 }]}>{solicitud.email ?? 'Sin correo'}</Text>
            <View style={estilos.acciones}>
              <Pressable
                onPress={() => void aprobar(solicitud)}
                disabled={trabajando === solicitud.id}
                accessibilityRole="button"
                accessibilityLabel={`Aprobar a ${solicitud.fullName ?? 'esta persona'}`}
                style={[estilos.boton, { borderColor: c.goldInk }]}
              >
                <Text style={[t.body, { color: c.goldInk, fontSize: 14, fontWeight: '500' }]}>
                  {trabajando === solicitud.id ? 'Aprobando…' : 'Aprobar'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => rechazar(solicitud)}
                disabled={trabajando === solicitud.id}
                accessibilityRole="button"
                accessibilityLabel={`Rechazar a ${solicitud.fullName ?? 'esta persona'}`}
                style={[estilos.boton, { borderColor: c.border }]}
              >
                <Text style={[t.body, { color: c.textSoft, fontSize: 14 }]}>Rechazar</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderRadius: 14, borderWidth: 1, padding: 14, width: '100%' },
  acciones: { flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' },
  boton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 18,
    flexShrink: 1,
  },
});
