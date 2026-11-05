import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, Platform, StyleSheet, View } from 'react-native';

import { Alert } from '../../../components/Alerta';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { irAPestana } from '../../../navigation/navegacionRef';
import { useAuth } from '../../auth/context/AuthContext';
import { cargarNotificaciones } from '../../habits/notificaciones/recordatoriosDeHabito';
import { useCarreraEnVivo, usePreferenciasDeLaCarrera } from '../hooks/useCarreraEnVivo';
import { guardarPreferencias, leerPreferencias } from '../servicios/almacenCarrera';
import {
  cargarCarrera,
  carreraActual,
  cerrarCarrera,
  descartarCarrera,
  empezarCarrera,
  latido,
  pausarCarrera,
  ponerEfectos,
  ponerPreferencias,
  recibirPasos,
  resumenParaLaNotificacion,
  seguirCarrera,
} from '../servicios/carreraEnVivo';
import { olvidarCentroDelMapa, prepararCentroDelMapa } from '../servicios/centroDelMapa';
import { encolar, procesarCola } from '../servicios/colaDeCarreras';
import { leerDatosDeLaPersona } from '../servicios/datosDeLaPersona';
import { mostrarNotificacionDeCarrera, quitarNotificacionDeCarrera } from '../servicios/notificacionDeCarrera';
import { escucharPedidosDeLaCarrera } from '../servicios/pedidosDeLaCarrera';
import { escucharPasos, prepararPodometro } from '../servicios/podometro';
import { detenerGps, empezarGps, pedirPermisoDeUbicacion } from '../servicios/tareaDeUbicacion';
import { efectoDeVoz } from '../servicios/vozDeLaCarrera';
import type { EstadoDeLaCarrera, PreferenciasDeLaCarrera } from '../types/carrera.types';
import { cuerpoDeLaCarrera } from '../utils/cuerpoDeLaCarrera';
import type { FiguraDelAvatar } from '../utils/fusionDelAvatar';
import { nuevaCarreraId } from '../utils/idDeLaCarrera';
import { esMuyCorta, pausar } from '../utils/motorDeCarrera';
import { accionDelToque, laCarreraYaEmpezo, marcaDelToque, type ToqueEnLaNotificacion } from '../utils/notificacionUnica';
import { TEXTOS_DE_LA_CARRERA } from '../utils/textosDeLaCarrera';
import { CuentaRegresiva } from './CuentaRegresiva';
import { PantallaCorriendo, PantallaTerminaste, type PanelDeLaPausa } from './PantallaDeCarrera';

/**
 * El anfitrión de la carrera con GPS (spec 042), montado en `App.tsx` sobre el navegador: así la carrera sigue a la vista aunque
 * la persona cambie de pestaña, y Training no cambia de forma (solo pide «abre la carrera»).
 *
 * Hace:
 * - **Empezar** (FR-001 a FR-003): pide la ubicación (y, opcional, la actividad física), lee el peso y el sexo ANTES de la cuenta,
 *   genera la `carreraId`, la guarda en el teléfono en pausa (no cuenta tiempo), arranca el GPS y muestra 3, 2, 1.
 * - **Retomar** (FR-006): al entrar con una carrera sin terminar de esta cuenta, la abre (en pausa si la app estuvo muerta).
 * - **Terminar** (FR-016): arma el único cuerpo, lo pone en la cola ANTES de borrar la carrera de «en curso» y lo envía.
 * - **La cola** (FR-017): la procesa al abrir, al volver al frente y cada 15 s con la app abierta.
 * - **La notificación única** (FR-011): reemplaza la del servicio del GPS (km, tiempo, ritmo, en pausa o no); se pone al día al
 *   cambiar de fase y al irse a segundo plano. «Pausar» la pausa y «Seguir» la sigue, al abrir.
 *
 * Solo Android: en la web no hace nada (FR-001).
 */

type Vista =
  | { tipo: 'cerrada' }
  | { tipo: 'cuenta' }
  | { tipo: 'carrera' }
  | { tipo: 'terminaste'; final: EstadoDeLaCarrera; terminadaEnMs: number };

const COLA_CADA_MS = 15_000;

function iniciales(nombre: string | null | undefined): string {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || 'R';
}

export function AnfitrionDeLaCarrera() {
  if (Platform.OS !== 'android') return null;
  return <Anfitrion />;
}

function Anfitrion() {
  const { user } = useAuth();
  const cuentaId = user?.id ?? null;
  const e = useCarreraEnVivo();
  const prefs = usePreferenciasDeLaCarrera();
  const [vista, setVista] = useState<Vista>({ tipo: 'cerrada' });
  const [panel, setPanel] = useState<PanelDeLaPausa>(null);
  const [bloqueada, setBloqueada] = useState(false);
  const [figura, setFigura] = useState<FiguraDelAvatar>('neutral');
  const [conHabito, setConHabito] = useState(true);
  const empezando = useRef(false);

  useEffect(() => {
    ponerEfectos({ alCambiar: efectoDeVoz });
  }, []);

  // Al entrar: preferencias, la carrera sin terminar (si hay) y la cola.
  useEffect(() => {
    if (!cuentaId) {
      setVista({ tipo: 'cerrada' });
      return;
    }
    let vivo = true;
    void (async () => {
      ponerPreferencias(await leerPreferencias(cuentaId));
      const retomada = await cargarCarrera(cuentaId);
      if (!vivo) return;
      if (retomada) {
        setVista({ tipo: 'carrera' });
        if (retomada.fase === 'corriendo') void empezarGps();
        void leerDatosDeLaPersona(cuentaId).then(d => vivo && setFigura(d.figura));
      }
      void procesarCola(cuentaId, true);
    })();
    return () => {
      vivo = false;
    };
  }, [cuentaId]);

  // La cola: al volver al frente y cada 15 s con la app abierta. La notificación fija, al irse a segundo plano.
  useEffect(() => {
    if (!cuentaId) return;
    const sub = AppState.addEventListener('change', estado => {
      if (estado === 'active') {
        void procesarCola(cuentaId, true);
      } else if (carreraActual()) {
        const r = resumenParaLaNotificacion();
        const actual = carreraActual();
        if (r && actual && laCarreraYaEmpezo(actual)) void mostrarNotificacionDeCarrera({ ...r, enPausa: actual.fase === 'pausa' }, Date.now(), true);
      }
    });
    const id = setInterval(() => {
      if (AppState.currentState === 'active') void procesarCola(cuentaId, true);
    }, COLA_CADA_MS);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [cuentaId]);

  // El latido (pausa automática y calorías) y los pasos, mientras hay carrera.
  const hayCarrera = e != null;
  useEffect(() => {
    if (!hayCarrera) return;
    const id = setInterval(() => latido(), 1000);
    const dejar = escucharPasos((nuevos, ahora) => recibirPasos(nuevos, ahora));
    return () => {
      clearInterval(id);
      dejar();
    };
  }, [hayCarrera]);

  // La notificación única dice si está en pausa y lleva «Pausar» o «Seguir»: se pone al día en el acto al cambiar de fase.
  const fase = e?.fase ?? null;
  const empezo = laCarreraYaEmpezo(e);
  useEffect(() => {
    if (!fase || !empezo) return;
    const r = resumenParaLaNotificacion();
    const actual = carreraActual();
    if (r && actual) void mostrarNotificacionDeCarrera({ ...r, enPausa: actual.fase === 'pausa' }, Date.now(), true);
  }, [fase, empezo]);

  // Tocar la notificación fija abre la carrera; «Pausar» además la pausa y «Seguir» la sigue. Con la app cerrada desde recientes
  // (el proceso sigue por el servicio del GPS) el toque llega antes de que esto se monte: se lee la última respuesta.
  const atendidos = useRef(new Set<string>());
  const atenderToque = useCallback((toque: ToqueEnLaNotificacion | null) => {
    if (!toque) return;
    const marca = marcaDelToque(toque);
    if (atendidos.current.has(marca)) return;
    const accion = accionDelToque(toque, carreraActual(), Date.now());
    if (!accion) return;
    atendidos.current.add(marca);
    if (accion === 'pausar') pausarCarrera();
    if (accion === 'seguir') {
      seguirCarrera();
      void empezarGps();
    }
    setVista({ tipo: 'carrera' });
  }, []);
  useEffect(() => {
    const N = cargarNotificaciones();
    if (!N) return;
    const sub = N.addNotificationResponseReceivedListener(r => atenderToque(r as unknown as ToqueEnLaNotificacion));
    return () => sub.remove();
  }, [atenderToque]);
  useEffect(() => {
    if (!hayCarrera) return;
    const N = cargarNotificaciones();
    void N?.getLastNotificationResponseAsync()
      .then(r => atenderToque(r as unknown as ToqueEnLaNotificacion | null))
      .catch(() => undefined);
  }, [hayCarrera, atenderToque]);

  const empezar = useCallback(
    async (registroId: string | null) => {
      if (!cuentaId || empezando.current) return;
      if (carreraActual()) {
        setVista({ tipo: 'carrera' });
        return;
      }
      empezando.current = true;
      try {
        const permiso = await pedirPermisoDeUbicacion();
        if (permiso !== 'concedido') {
          Alert.alert(
            'Ubicación',
            permiso === 'gps-apagado' ? TEXTOS_DE_LA_CARRERA.sinGpsActivo : TEXTOS_DE_LA_CARRERA.sinPermisoUbicacion,
          );
          return;
        }
        // El centro del mapa (solo para mirar, nunca se mide) se prepara junto con los datos: el mapa ya se ve en la cuenta.
        const [datos, conPasos] = await Promise.all([leerDatosDeLaPersona(cuentaId), prepararPodometro(), prepararCentroDelMapa()]);
        setFigura(datos.figura);
        setConHabito(registroId != null);
        empezarCarrera({ carreraId: nuevaCarreraId(), cuentaId, pesoKg: datos.pesoKg, conPasos });
        pausarCarrera();
        if (!(await empezarGps())) {
          await descartarCarrera();
          Alert.alert('Ubicación', TEXTOS_DE_LA_CARRERA.sinGpsActivo);
          return;
        }
        setPanel(null);
        setBloqueada(false);
        setVista({ tipo: 'cuenta' });
      } finally {
        empezando.current = false;
      }
    },
    [cuentaId],
  );

  useEffect(
    () =>
      escucharPedidosDeLaCarrera(pedido => {
        if (pedido.tipo === 'volver') {
          if (carreraActual()) setVista({ tipo: 'carrera' });
          return;
        }
        void empezar(pedido.registroId);
      }),
    [empezar],
  );

  const detenerTodo = useCallback(async () => {
    olvidarCentroDelMapa();
    await detenerGps();
    await quitarNotificacionDeCarrera();
  }, []);

  const terminar = useCallback(async () => {
    const actual = carreraActual();
    if (!actual || !cuentaId) return;
    const ahora = Date.now();
    if (esMuyCorta(actual, ahora)) {
      Alert.alert(TEXTOS_DE_LA_CARRERA.muyCorta, TEXTOS_DE_LA_CARRERA.muyCortaDetalle, [
        { text: TEXTOS_DE_LA_CARRERA.seguir, onPress: () => seguirCarrera() },
        {
          text: TEXTOS_DE_LA_CARRERA.descartarSi,
          style: 'destructive',
          onPress: () => {
            void descartarCarrera().then(detenerTodo);
            setVista({ tipo: 'cerrada' });
          },
        },
      ]);
      return;
    }
    const final = actual.fase === 'corriendo' ? pausar(actual, ahora) : actual;
    const cuerpo = cuerpoDeLaCarrera(final, ahora, { guardarRuta: prefs.guardarRuta, appVersion: versionDeLaApp() });
    // Primero a la cola (queda en el teléfono), después se borra de «en curso»: nunca queda en ningún lado.
    await encolar(cuentaId, cuerpo);
    await cerrarCarrera(ahora);
    await detenerTodo();
    setPanel(null);
    setVista({ tipo: 'terminaste', final, terminadaEnMs: ahora });
    void procesarCola(cuentaId, true);
  }, [cuentaId, prefs.guardarRuta, detenerTodo]);

  const descartar = useCallback(() => {
    Alert.alert(TEXTOS_DE_LA_CARRERA.descartarTitulo, TEXTOS_DE_LA_CARRERA.descartarMensaje, [
      { text: TEXTOS_DE_LA_CARRERA.cancelar, style: 'cancel' },
      {
        text: TEXTOS_DE_LA_CARRERA.descartarSi,
        style: 'destructive',
        onPress: () => {
          void descartarCarrera().then(detenerTodo);
          setVista({ tipo: 'cerrada' });
        },
      },
    ]);
  }, [detenerTodo]);

  const cambiarPrefs = useCallback(
    (p: PreferenciasDeLaCarrera) => {
      ponerPreferencias(p);
      if (cuentaId) void guardarPreferencias(cuentaId, p);
    },
    [cuentaId],
  );

  /** El atrás del sistema: sube un nivel, nunca cierra la app (AGENTS.md §6). En la carrera, la deja seguir y vuelve a la app. */
  const atras = useCallback((): boolean => {
    if (vista.tipo === 'cuenta') {
      void descartarCarrera().then(detenerTodo);
      setVista({ tipo: 'cerrada' });
      return true;
    }
    if (vista.tipo === 'carrera') {
      if (bloqueada) return true;
      if (panel) {
        setPanel(null);
        return true;
      }
      setVista({ tipo: 'cerrada' });
      return true;
    }
    if (vista.tipo === 'terminaste') {
      setVista({ tipo: 'cerrada' });
      return true;
    }
    return false;
  }, [vista.tipo, bloqueada, panel, detenerTodo]);
  useSystemBackHandler(atras, vista.tipo !== 'cerrada');

  if (vista.tipo === 'cerrada') return null;
  const persona = { figura, iniciales: iniciales(user?.name), fotoUrl: user?.avatarUrl?.startsWith('http') ? user.avatarUrl : null };

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => void atras()}>
      {vista.tipo === 'terminaste' ? (
        <PantallaTerminaste
          final={vista.final}
          terminadaEnMs={vista.terminadaEnMs}
          conHabito={conHabito}
          persona={persona}
          alCompartir={() => {
            setVista({ tipo: 'cerrada' });
            irAPestana('Comunidad', { abrirComposerMuro: true });
          }}
          alListo={() => setVista({ tipo: 'cerrada' })}
        />
      ) : (
        // La cuenta va ENCIMA de la pantalla de correr, que ya está montada detrás: el mapa carga sus mosaicos durante el 3, 2, 1 y
        // al terminar la cuenta es el mismo mapa (no se vuelve a montar).
        <View style={estilos.capas}>
          {e ? (
            <View
              style={estilos.capas}
              importantForAccessibility={vista.tipo === 'cuenta' ? 'no-hide-descendants' : 'auto'}
              accessibilityElementsHidden={vista.tipo === 'cuenta'}
            >
              <PantallaCorriendo
                e={e}
                prefs={prefs}
                persona={persona}
                detrasDeLaCuenta={vista.tipo === 'cuenta'}
                alPausar={() => pausarCarrera()}
                alSeguir={() => {
                  seguirCarrera();
                  void empezarGps();
                }}
                alTerminar={() => void terminar()}
                alDescartar={descartar}
                alCambiarPrefs={cambiarPrefs}
                panel={panel}
                alCambiarPanel={setPanel}
                bloqueada={bloqueada}
                alBloquear={setBloqueada}
              />
            </View>
          ) : null}
          {vista.tipo === 'cuenta' ? (
            <View style={StyleSheet.absoluteFill}>
              <CuentaRegresiva
                sobreElMapa={e != null}
                alTerminar={() => {
                  seguirCarrera();
                  setVista({ tipo: 'carrera' });
                }}
                alCancelar={() => {
                  void descartarCarrera().then(detenerTodo);
                  setVista({ tipo: 'cerrada' });
                }}
              />
            </View>
          ) : null}
        </View>
      )}
    </Modal>
  );
}

const estilos = StyleSheet.create({ capas: { flex: 1 } });

function versionDeLaApp(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants').default as { expoConfig?: { version?: string } };
    return Constants.expoConfig?.version ?? null;
  } catch {
    return null;
  }
}
