import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  TextInput,
} from 'react-native';
import { Alert } from '../components/Alerta';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDES_DE_UNA_PESTANA } from '../navigation/bordesDeUnaPestana';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { space } from '../theme/tokens';
import { useResponsive } from '../theme/responsive';
import { useAuth } from '../context/AuthContext';
import { InterruptoresDeAvisos } from '../features/alarmas/components/InterruptoresDeAvisos';
import { SeccionAlarmas } from '../features/alarmas/components/SeccionAlarmas';
import { useSystemBackHandler } from '../hooks/useSystemBackHandler';
import { MicroLabel, ScreenHeader } from '../components/ui';
import { AdminScreen } from '../features/admin/screens/AdminScreen';
import { useCapacidades } from '../features/admin/hooks/useCapacidades';
import { Icon, TAMANO_ICONO, type IconName } from '../components/Icon';
import { GoldButton } from '../components/GoldButton';
import { Interruptor } from '../components/Interruptor';
import { Presionable } from '../components/Presionable';
import { ConfirmacionEnLinea } from '../components/ConfirmacionEnLinea';
import { tacto } from '../utils/tacto';
import { CabeceraAdmin } from '../features/admin/components/CabeceraAdmin';
import { OrbeQuieto } from '../features/renasia/components/OrbeQuieto';
import { FilaDeAjuste, GrupoDeAjustes, TAMANO_ICONO_BALDOSA } from '../features/yo/components/FilasDeAjustes';
import { MetodoEnPaginas, type FaseDelMetodo } from '../features/yo/components/MetodoEnPaginas';
import { PactoFirmado } from '../features/yo/components/PactoFirmado';
import {
  origenTrasCambio,
  TITULO_DE_VISTA,
  vistaDeRegreso,
  type OrigenDeYo,
  type VistaDeYo,
} from '../features/yo/utils/navegacionDeYo';
import {
  useResumenHome,
  rotuloDeFase,
  DIAS_DEL_PROGRAMA,
  FASES_EN_ORDEN,
  type ClaveDeFase,
} from '../features/home/hooks/useResumenHome';
import { useEtapasOnboarding } from '../features/onboarding/hooks/useEtapasOnboarding';
import { usePersistenciaOnboarding } from '../features/onboarding/hooks/usePersistenciaOnboarding';
import { mapearPacto, PREGUNTA_FIRMA_PACTO } from '../features/onboarding/data/mapaPreguntas';
import {
  SignatureCanvas,
  type SignatureCanvasHandle,
  type SignatureData,
} from '../components/SignatureCanvas';
import { MapaRenacimientoFlow } from '../features/mapa-renacimiento/MapaRenacimientoFlow';
import { elegirFotoDePerfil } from '../features/auth/utils/elegirFotoDePerfil';
import * as authApi from '../features/auth/api/authApi';
import { ESPACIO_PARA_LANZADOR } from '../features/renasia/components/RenasiaLauncher';
import { MemoriaDeRenasia } from '../features/renasia/components/MemoriaDeRenasia';
import { useMemoriaDeRenasia } from '../features/renasia/hooks/useMemoriaDeRenasia';
import { mostrarMemoria } from '../features/renasia/utils/memoria';
import { NOMBRE_ACOMPANANTE } from '../features/renasia/data/agentes';
import { useMisEvidencias } from '../features/evidence/hooks/useMisEvidencias';
import { resumenDeEvidencias } from '../features/evidence/resumenDeEvidencias';
import { ESTADO_EVIDENCIA } from '../features/evidence/api/evidenceSchemas';
import { MiniaturaDeEvidencia } from '../features/evidence/components/MiniaturaDeEvidencia';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMiCaja } from '../features/caja/hooks/useMiCaja';
import { MiCajaScreen } from '../features/caja/screens/MiCajaScreen';
import { EliminarMiCuentaScreen } from '../features/cuenta/screens/EliminarMiCuentaScreen';
import { etiquetaParaElAprendiz } from '../features/caja/utils/estadosDeCaja';
import { useMiEmergencia } from '../features/emergencia/hooks/useMiEmergencia';
import { EmergenciaScreen } from '../features/emergencia/screens/EmergenciaScreen';
import { useMiSemaforo } from '../features/semaforo/hooks/useMiSemaforo';
import { hayQuePedirMiSemaforo } from '../features/semaforo/utils/entradasDelSemaforo';
import { curvaDeEvolucion } from '../features/semaforo/utils/curvaDeEvolucion';
import { dichoDelDia } from '../features/semaforo/utils/lecturaDelSemaforo';
import { ElegirHabitoParaFotoModal } from '../features/habits/components/ElegirHabitoParaFotoModal';
import { RegistroConFotoModal } from '../features/habits/components/RegistroConFotoModal';
import { useRegistroConFoto } from '../features/habits/hooks/useRegistroConFoto';
import { useRenombreLocal } from '../features/habits/hooks/useRenombreDeHabito';
import { tituloVisible } from '../features/habits/utils/renombreDeHabito';
import type { HabitoParaFoto } from '../features/habits/utils/habitosParaFotoDeHoy';
import { medicionPedidaDe } from '../features/habits/utils/registroConFoto';
import { useOcultarBarraAlDesplazar } from '../navigation/barraAlDesplazar/BarraInferior';

// =========================================================================
// DATOS ESTÁTICOS
// =========================================================================
/* Corregido 2026-09-29 («nada en Yo puede aparentar»): acá vivían `EVOLUCION` y `PATRONES`, las
   coordenadas fijas de la curva de «Tu Evolución» y del gráfico de «Patrones» — la misma subida
   para cualquiera, desde el día 1. La curva ahora sale del semáforo (`curvaDeEvolucion`) y
   «Patrones» se quitó: no hay un dato que sea "tus patrones". También se quitaron `LOGROS_DEL_PROGRAMA`
   (metas sin fuente y sin registro de logros detrás) y la sub-vista del video de activación (no hay
   video). */

/** iOS no presenta la cámara mientras un `Modal` todavía se está cerrando. */
const ESPERA_CIERRE_MODAL_IOS_MS = 400;

/* Etiquetas legibles de los enums del backend. Antes las tarjetas decian siempre
   "✓ VERIFICADO" aunque la evidencia estuviera pendiente o rechazada. */
const ETIQUETA_TIPO_EVIDENCIA: Record<string, string> = {
  FOTO: 'Foto', VIDEO: 'Video', AUDIO: 'Audio', TEXTO: 'Texto', CAPTURA: 'Captura',
};

const ETIQUETA_ESTADO_EVIDENCIA: Record<string, string> = {
  PENDIENTE: 'EN REVISIÓN',
  VALIDA: 'VERIFICADA',
  RECHAZADA: 'RECHAZADA',
  REVISION_MANUAL: 'REVISIÓN MANUAL',
  ANULADA_ADMIN: 'ANULADA',
};

/** Fecha corta en la zona del dispositivo. `null` cuando el backend no la trae. */
function fechaDeEvidencia(iso: string | null): string {
  if (!iso) return 'Sin fecha';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Sin fecha';
  return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * Lo editorial de cada fase: el ícono, la frase y qué se hace.
 *
 * **El nombre, el número y el rango de días NO están acá a propósito** — salen de
 * `FASES_EN_ORDEN` (`features/home/hooks/useResumenHome`), que es la única definición de fase de
 * la app. Antes esta pantalla tenía su propia lista, con otros nombres y **sólo tres fases**, y
 * por eso terminó contradiciendo a Plan: eran dos listas que nadie obligaba a coincidir. Ahora,
 * si se renombra una fase, esta pantalla se entera sola.
 *
 * El contenido sale de `RENASER, PROGRAMA Y FASES.docx` (objetivo psicológico, enemigo, hábitos y
 * rituales de cada fase), no de una redacción propia: la frase entre comillas es el mensaje de
 * intervención o la pregunta de reflexión que el documento asigna a esa fase.
 *
 * Corregido 2026-10-05 (rediseño de Yo): cada fase tenía su color pastel escrito a mano (`#90CAF9`,
 * `#CE93D8`, `#A5D6A7`, `#FFE082`; el amarillo no se veía sobre crema). Ahora los íconos van en la
 * tinta del tema, y la Fase 3 dejó el ♡ (es «me gusta» y «Emociones» en el resto de la app) por la
 * llama del gozo.
 */
const CONTENIDO_DEL_METODO: Record<
  ClaveDeFase,
  { icono: IconName; frase: string; resumen: string; puntos: string[] }
> = {
  PHASE_1_REBIRTH: {
    icono: 'eye',
    frase: 'Esta semana no buscas cambiarte. Buscas verte.',
    resumen: 'Observar la mente sin intervenir: bajar el ruido mental y el cortisol, y restaurar el sistema dopaminérgico.',
    puntos: [
      'Ayuno intermitente: última comida 6pm, primera 10am',
      'Agua tibia con limón y jugo verde al despertar',
      'Ritual Tierra-Agua-Fuego, tres veces al día',
      'Un día completo de ayuno digital',
    ],
  },
  PHASE_2_DEVELOPMENT: {
    icono: 'diamond',
    frase: 'Reconócelo, corrígelo, continúa. El creador asume, la víctima se culpa.',
    resumen: 'Exponer a la víctima interna y despertar al creador: entender la raíz del sabotaje y consolidar el dominio mental.',
    puntos: [
      'Tres ciclos de Intoxicación Consciente y Desintoxicación Absoluta',
      'Mantra: no miedo, no culpa, no vergüenza',
      'Sueño con alarmas y celular en modo concentración',
      '¿De qué me quejé? ¿A quién culpé? ¿Qué patrón se repitió?',
    ],
  },
  PHASE_3_ALCHEMIST_WARRIOR: {
    icono: 'fire',
    frase: '¿Estoy haciendo esto por obligación o porque amo mi vida?',
    resumen: 'Transformar la disciplina exigida en gozo, e iniciar la autoterapia desde el amor.',
    puntos: [
      'Los mismos hábitos, ahora desde la intención',
      'Decretos y mantras: del ayuno, del cierre nocturno, del gozo',
      'Baile y movimiento libre',
      'Domingo sagrado: descanso absoluto, sin culpa',
    ],
  },
  PHASE_4_ASCENSION: {
    icono: 'target',
    frase: 'No eres menos capaz. Simplemente te has distraído.',
    resumen: 'Producir en cuatro horas lo que otros producen en diez: tres misiones de alto impacto al día.',
    puntos: [
      'Tres bloques profundos de 90 minutos',
      'Protocolo antidistractores: el celular fuera de alcance',
      'Planificación nocturna del día siguiente',
      'Regla 80/20: ¿cuál fue el 20% que generó resultados?',
    ],
  },
};

const METODO_FASES: FaseDelMetodo[] = FASES_EN_ORDEN.map(fase => ({
  numero: fase.numero,
  titulo: fase.nombre,
  rango: fase.rango,
  ...CONTENIDO_DEL_METODO[fase.clave],
}));

function inicialesDe(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'R';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

/**
 * Las 2 etapas actuales: solo el título y el orden son fijos. El estado de cada una lo decide
 * `useEtapasOnboarding` con datos reales — antes estaba escrito acá con `completed: true` en tres
 * de ellas, así que un aprendiz que no había hecho nada veía tres tildes verdes.
 *
 * Hoy solo El Pacto tiene marca en el backend (`pactSignedAt`). El Mapa de Renacimiento reúne
 * el formulario completo de esta fase y se muestra como una única segunda etapa.
 */
const ONBOARDING_STAGES = [
  { id: 'st1', num: 1, title: 'El Pacto', descPendiente: 'Tu acto fundacional' },
  { id: 'st2', num: 2, title: 'Mapa de Renacimiento', descPendiente: 'Tu mapa completo de transformación' },
] as const;

const PACTO_CLAUSULAS = [
  '1. Cumplir mis 3 Objetivos diarios sin negociarlos conmigo.',
  '2. Subir las evidencias que el sistema me exija.',
  '3. Aceptar la disciplina como camino, no como castigo.',
  '4. Hablarme con respeto, especialmente cuando falle.',
  '5. No abandonar el grupo ni huir cuando aparezca la incomodidad.',
  '6. Cuidar mi cuerpo como el templo que es.',
  '7. Sanar mis heridas en lugar de defenderlas.',
  '8. Cobrar lo que valgo y dejar de subvalorarme.',
  '9. Decir la verdad aunque tiemble la voz.',
  '10. Llegar al Día 90 transformado, no entretenido.',
];

export default function YoScreen() {
  /* Corregido 2026-09-18: acá decía que estos son "los MISMOS que usa el botón de luna/sol de
     `ScreenHeader`". Ese botón ya no existe —se quitó de la cabecera por decisión del dueño—, así
     que esta fila dejó de ser "otra puerta al mismo interruptor" y pasó a ser LA puerta dentro de
     la app. Los únicos que quedan son los de login y onboarding, donde Yo todavía no se alcanza. */
  const { c, t, mode, toggle } = useTheme();
  const {
    evidencias,
    verificadas: verificadasEvidencias,
    cargando: cargandoEvidencias,
    error: errorEvidencias,
    hayMas: hayMasEvidencias,
    recargar: recargarEvidencias,
  } = useMisEvidencias();
  const etapasOnboarding = useEtapasOnboarding();
  const { recargar: recargarEtapasOnboarding } = etapasOnboarding;
  const { guardarCapitulo, avanzarEstado, aceptarHito, guardarFirma } = usePersistenciaOnboarding();
  const { rs, isTablet, horizontalPadding, contentMaxWidth } = useResponsive();
  const { user, logout, actualizarPerfil, refrescarPerfil } = useAuth();
  const { resumen } = useResumenHome();
  const moreSize = rs(56);

  /* «Tu Evolución»: el cumplimiento de cada día de la ventana del semáforo. Mismas fuentes que la
     tarjeta de Hoy: los días del campo `semaforo` de `/home` y, si un backend viejo no los manda,
     `GET /me/semaforo`. Sin semáforo (apagado, o quien no se mide) no hay curva. */
  const miSemaforo = useMiSemaforo(hayQuePedirMiSemaforo(resumen?.semaforo, false));
  const diasDelSemaforo = resumen?.semaforo?.dias ?? miSemaforo.detalle?.vigente?.dias ?? [];
  const curva = curvaDeEvolucion(diasDelSemaforo);

  /* Los avisos de éxito (perfil guardado, Pacto sellado…) son una línea bajo la cabecera de la
     vista donde se ve lo hecho, y se van solos (`ConfirmacionEnLinea`). Los errores siguen en
     diálogo: esos hay que leerlos antes de seguir. */
  const [confirmacion, setConfirmacion] = useState<{ clave: number; texto: string; vista: VistaDeYo } | null>(null);
  const confirmar = useCallback((texto: string, vista: VistaDeYo) => {
    tacto.logro();
    setConfirmacion({ clave: Date.now(), texto, vista });
  }, []);

  /* «+ Subir Foto» de Evidencias: se elige el hábito de hoy y sigue el MISMO registro con foto de
     Training (cámara → «¿Qué sentiste?» en los rituales → subida y cierre). */
  const renombre = useRenombreLocal(user?.id ?? null);
  const [eligiendoHabitoParaFoto, setEligiendoHabitoParaFoto] = useState(false);
  const registroConFoto = useRegistroConFoto({
    onCompletado: async (_registroId, resultado, titulo) => {
      recargarEvidencias();
      // Era un diálogo «Evidencia registrada» que había que cerrar: ahora es una línea (2026-10-05).
      confirmar(
        resultado.puntosOtorgados > 0
          ? `«${titulo}» quedó registrado. +${resultado.puntosOtorgados} puntos.`
          : `«${titulo}» quedó registrado.`,
        'evidencias',
      );
    },
  });
  const { iniciar: iniciarRegistroConFoto } = registroConFoto;
  const subirFotoDe = useCallback(
    ({ track, conPregunta }: HabitoParaFoto) => {
      setEligiendoHabitoParaFoto(false);
      const espera = Platform.OS === 'ios' ? ESPERA_CIERRE_MODAL_IOS_MS : 0;
      setTimeout(() => {
        void iniciarRegistroConFoto(
          {
            registroId: track.id,
            titulo: tituloVisible({ id: track.habitoId, title: track.tituloHabito }, renombre.titulos),
            conPregunta,
            // D-226: pista para los km (la que manda es la del registro fresco).
            medicion: medicionPedidaDe(track),
          },
          track.tieneEvidencia === true
        );
      }, espera);
    },
    [iniciarRegistroConFoto, renombre.titulos],
  );

  // =========================================================================
  // ESTADOS DE NAVEGACIÓN DENTRO DE LA TARJETA DEL USUARIO
  // =========================================================================
  const [activeView, setActiveView] = useState<VistaDeYo>('main');
  /* De dónde se abrió la sub-vista actual (Yo o Ajustes), para que «‹» y el gesto del sistema
     vuelvan ahí y no siempre a Ajustes (ver `navegacionDeYo`). */
  const [origen, setOrigen] = useState<OrigenDeYo>('hub');
  const vistaPrevia = useRef<VistaDeYo>(activeView);
  useEffect(() => {
    const previa = vistaPrevia.current;
    vistaPrevia.current = activeView;
    setOrigen(o => origenTrasCambio(previa, o));
    // Una confirmación es de la vista donde se mostró: al irse de ella, se va con ella.
    setConfirmacion(actual => (actual && actual.vista !== activeView ? null : actual));
  }, [activeView]);
  const regreso = vistaDeRegreso(activeView, origen);
  const volver = useCallback(() => {
    if (regreso) setActiveView(regreso);
  }, [regreso]);
  /* Al cambiar de sub-vista la barra de pestañas vuelve a la vista (ver `navigation/barraAlDesplazar`). */
  const barraAlDesplazar = useOcultarBarraAlDesplazar({ vista: activeView });
  /* D-167: se pide al entrar a Ajustes (donde está la fila) y no al abrir la pestaña Yo. */
  const memoriaRenasia = useMemoriaDeRenasia(activeView === 'hub' || activeView === 'memoria_renasia');
  /* Segunda puerta a Administracion, ademas de la de Hoy. Dos entradas y ningun sexto tab: el
     administrador llega desde donde este, y los cinco tabs quedan como estaban (SDD 003, ARF-01). */
  const { capacidades } = useCapacidades();
  const [enAdministracion, setEnAdministracion] = useState(false);
  /* Caja Renaser (D-219, pedido del dueño del 28/09): la fila «Tu Caja Renaser» y su pantalla. La
     fila aparece solo si el servidor dice que hay algo que mostrarle (desde el día 8, sin pausa y en
     Perú). El aviso `/caja` llega con `abrirCaja` (lo deja `AbridorDeAvisos`, D-218). */
  const miCaja = useMiCaja();
  const [enCaja, setEnCaja] = useState(false);
  /* «Eliminar mi cuenta» (backend D-243, autorizado por el dueño el 02/10: Google Play exige poder
     eliminar la cuenta desde la app). A pantalla completa, como la Caja y Administración. */
  const [eliminandoCuenta, setEliminandoCuenta] = useState(false);
  /* Botón de emergencia (D-244, pedido del dueño del 02/10): un acceso discreto al pie de Yo, solo para
     un aprendiz, desde el Día 0 (el servidor responde 403 a quien no lo es). Pedir no cambia el día. */
  const miEmergencia = useMiEmergencia();
  const [enEmergencia, setEnEmergencia] = useState(false);
  const rutaDeYo = useRoute();
  const navegacionDeYo = useNavigation();
  useEffect(() => {
    const params = rutaDeYo.params as { abrirCaja?: boolean } | undefined;
    if (!params?.abrirCaja) return;
    setEnCaja(true);
    (navegacionDeYo as unknown as { setParams: (p: Record<string, unknown>) => void }).setParams({ abrirCaja: undefined });
  }, [rutaDeYo.params, navegacionDeYo]);
  useEffect(() => {
    // Un aviso viejo de una caja que ya no se le muestra no deja la pantalla esperando abierta.
    if (enCaja && !miCaja.cargando && !miCaja.visible) setEnCaja(false);
  }, [enCaja, miCaja.cargando, miCaja.visible]);
  /* Acá vivían `metodoFase`, `metodoAnim` y `cambiarMetodoFase`: el «giro 3D» de la tarjeta de El
     Método con el `Animated` de React Native en el hilo de JavaScript. Desde el 2026-10-05 las fases
     son páginas que se deslizan con el dedo (`MetodoEnPaginas`). */

  // Formulario Editar Perfil
  const [profileName, setProfileName] = useState(user?.name ?? '');
  const [profileEmail, setProfileEmail] = useState(user?.email ?? '');
  const [profileDepartment, setProfileDepartment] = useState(user?.department ?? '');
  const [profileBio, setProfileBio] = useState(user?.bio ?? '');
  const [profileAvatar, setProfileAvatar] = useState<string | null>(user?.avatarUrl ?? null);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);

  useEffect(() => {
    setProfileName(user?.name ?? '');
    setProfileEmail(user?.email ?? '');
    setProfileDepartment(user?.department ?? '');
    setProfileBio(user?.bio ?? '');
    setProfileAvatar(user?.avatarUrl ?? null);
  }, [user?.avatarUrl, user?.bio, user?.department, user?.email, user?.name]);

  useEffect(() => {
    void refrescarPerfil().catch(() => undefined);
  }, [refrescarPerfil]);

  const profileInitials = inicialesDe(profileName);

  // =========================================================================
  // FIRMA DEL PACTO (sub-vista `pacto`)
  // =========================================================================
  /*
    BUG ENCONTRADO 2026-09-21 ("no sale para firmar"): acá no había ningún lienzo. El recuadro
    punteado era una maqueta — un `<Text>` con `profileName` en cursiva y, debajo, el rótulo fijo
    "FIRMA DIGITAL REGISTRADA & SELLADA" escrito a mano. Nada escuchaba el dedo, nada se guardaba,
    y el rótulo afirmaba un sellado que no había ocurrido ni podía ocurrir: "SELLAR MI COMPROMISO"
    solo abría un `Alert` y volvía a la lista de etapas. Por eso además la etapa 1 no se marcaba
    nunca — la barra de progreso no tenía de dónde sacar un Pacto firmado.

    El estado vive ACÁ y no dentro de la sub-vista (AGENTS.md §3, "Persistencia Incondicional"):
    la sub-vista se monta y desmonta con `activeView`, así que una firma guardada adentro se
    perdería con solo tocar "VOLVER A ETAPAS" y entrar de nuevo.
  */
  const firmaPactoRef = useRef<SignatureCanvasHandle>(null);
  const [firmaPacto, setFirmaPacto] = useState<SignatureData | null>(null);
  const [sellandoPacto, setSellandoPacto] = useState(false);
  const pactoYaFirmado = etapasOnboarding.pacto === 'completada';

  const sellarPacto = useCallback(async () => {
    if (sellandoPacto) return;
    if (!firmaPacto || !firmaPacto.data) {
      Alert.alert('Falta tu firma', 'Firma en el recuadro —con tu dedo o con tu firma electrónica— antes de sellar tu compromiso.');
      return;
    }

    // Mismo recorrido que `PactoScreen.handleConfirmSignature`, y por el mismo motivo: el Pacto es
    // el compromiso más importante del onboarding, así que nada de esto puede fallar en silencio.
    // El hito PACTO_FIRMADO se marca solo si la firma llegó a respaldarse de verdad.
    setSellandoPacto(true);
    try {
      const respuesta = await guardarCapitulo(mapearPacto(profileName));
      if (respuesta.pendientes > 0) {
        Alert.alert('No se pudo guardar', 'No pudimos registrar tu aceptación del Pacto. Revisa tu conexión e inténtalo de nuevo.');
        return;
      }
      await aceptarHito('PACTO');

      const png = await firmaPactoRef.current?.capturarComoPngBase64();
      if (!png) {
        Alert.alert('No se pudo capturar tu firma', 'Vuelve a firmar en el recuadro e inténtalo de nuevo.');
        return;
      }

      const resultado = await guardarFirma({
        flow: 'pacto',
        questionKey: PREGUNTA_FIRMA_PACTO.clave,
        pngBase64: png,
        trazosOriginales: firmaPacto.data,
      });
      if (!resultado.ok) {
        Alert.alert(
          'No se pudo guardar tu firma',
          'No pudimos respaldar tu firma en el almacenamiento. Revisa tu conexión e inténtalo de nuevo.'
        );
        return;
      }
      await aceptarHito('PACTO_FIRMADO');
      await avanzarEstado({ flow: 'pacto', section: 'firma', step: 0 });

      // Relectura inmediata: es lo que mueve la barra de progreso y pone el ✓ en la etapa 1 sin
      // tener que cerrar la app. No se da por completada de antemano — el criterio del hook es
      // "ante la duda, pendiente", y un tilde verde falso es peor que ninguno.
      await recargarEtapasOnboarding();

      // Era el diálogo «¡Pacto sellado! 🦅»: ahora una línea sobre «Tu proceso completo», cuya barra
      // acaba de avanzar (2026-10-05).
      confirmar('Pacto sellado. Tu compromiso de 90 días está activo.', 'onboarding');
      setActiveView('onboarding');
    } finally {
      setSellandoPacto(false);
    }
  }, [
    aceptarHito,
    avanzarEstado,
    confirmar,
    // `recargar` es estable (`useCallback` con deps vacías); el objeto que lo envuelve se recrea
    // en cada render, así que se depende de la función y no del objeto.
    recargarEtapasOnboarding,
    firmaPacto,
    guardarCapitulo,
    guardarFirma,
    profileName,
    sellandoPacto,
  ]);

  /* Notificaciones: acá vivían `notifAlarm`, `notifCelula` y `notifLive`, tres `useState` que no
     guardaban nada (al reiniciar volvían a estar prendidos). Desde el 2026-09-26 (E-4 y E-10) la
     sub-vista usa `InterruptoresDeAvisos`, que guarda en el servidor, y la alarma de las 05:00 pasó a
     la sub-vista Alarmas (`SeccionAlarmas`). */

  // =========================================================================
  // GESTOS TÁCTILES DEL SISTEMA (BACKHANDLER)
  // =========================================================================
  useSystemBackHandler(() => {
    // El mismo destino que la «‹» de la cabecera.
    if (!regreso) return false;
    setActiveView(regreso);
    return true;
    // Con el Mapa de Renacimiento abierto manda SU handler (registrado después): tiene que poder
    // retroceder paso por paso, no salir de la etapa entera de un toque.
  }, activeView !== 'main' && activeView !== 'mapa_renacimiento');

  /**
   * Etapa 2 del onboarding (Mapa de Renacimiento). Se devuelve ANTES del
   * `SafeAreaView` de esta pantalla porque la pantalla trae el suyo propio: anidarlos duplicaría
   * los márgenes de seguridad del sistema.
   */
  if (activeView === 'mapa_renacimiento') {
    return user ? (
      <MapaRenacimientoFlow
        userId={user.id}
        onSalir={() => {
          setActiveView('onboarding');
          // El Mapa se abre y se cierra con este `useState`, sin navegación de por medio: la
          // pestaña `Yo` nunca pierde el foco, así que el `useFocusEffect` de `useEtapasOnboarding`
          // no se entera de que la etapa 2 acaba de terminarse. Sin esta relectura, quien activa su
          // Mapa vuelve a "Tu proceso completo" y sigue viendo el contador de antes.
          void recargarEtapasOnboarding();
        }}
      />
    ) : null;
  }

  if (enAdministracion && capacidades.administrar) {
    return <AdminScreen onSalir={() => setEnAdministracion(false)} />;
  }

  if (eliminandoCuenta) {
    return <EliminarMiCuentaScreen onVolver={() => setEliminandoCuenta(false)} onCerrada={logout} />;
  }

  if (enCaja && miCaja.visible && miCaja.caja) {
    return <MiCajaScreen caja={miCaja.caja} onVolver={() => setEnCaja(false)} onCambio={miCaja.recargar} />;
  }

  if (enEmergencia && miEmergencia.visible && miEmergencia.mia) {
    return (
      <EmergenciaScreen mia={miEmergencia.mia} onVolver={() => setEnEmergencia(false)} onEnviado={miEmergencia.recargar} />
    );
  }


  return (
    <SafeAreaView edges={BORDES_DE_UNA_PESTANA} style={{ flex: 1, backgroundColor: c.bg }}>
      {/* La entrada ÚNICA a Ajustes (decisión 10 del dueño, 2026-10-05): el engranaje con nombre para
          el lector de pantalla. Antes eran unos «⋯» de 38 px sin nombre («más opciones») que abrían
          lo mismo que la tarjeta del usuario; la tarjeta ya no se toca. Hasta el 28/09 los «⋯» no
          tenían `onPressRight` y no hacían nada (E-400 del backend); `menuDeYoAbreAjustes` lo cuida.
          En las sub-vistas, una sola forma de volver: la cabecera «‹ título» de `CabeceraAdmin`, la
          misma de la Caja, la emergencia y eliminar la cuenta (antes convivían «← VOLVER A AJUSTES»
          con una píldora y la «‹»). */}
      {activeView === 'main' ? (
        <ScreenHeader title="YO" right="settings" etiquetaRight="Ajustes" onPressRight={() => setActiveView('hub')} />
      ) : (
        <CabeceraAdmin titulo={TITULO_DE_VISTA[activeView]} onVolver={volver} />
      )}
      {confirmacion && confirmacion.vista === activeView ? (
        <View style={{ paddingHorizontal: horizontalPadding, paddingBottom: 8 }}>
          <ConfirmacionEnLinea
            key={confirmacion.clave}
            texto={confirmacion.texto}
            onTerminar={() => setConfirmacion(null)}
          />
        </View>
      ) : null}

      {/* ========================================================================= */}
      {/* 1. PANTALLA PRINCIPAL "YO" (DISEÑO ORIGINAL 100% INTACTO)                 */}
      {/* ========================================================================= */}
      {activeView === 'main' && (
        <ScrollView
          {...barraAlDesplazar}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Quién eres. Era una tarjeta con «›» que abría Ajustes, lo mismo que los «⋯» de la
              cabecera: dos entradas a un mismo lugar (decisión 10 del dueño, 2026-10-05). Quedó el
              engranaje; esto ya no se toca, así que perdió el borde y el «›» (un borde dice «se
              toca»). */}
          <View style={styles.userCard}>
            {/* El disco perdió su contorno dorado — estaba dentro del borde de la tarjeta. Ahora
                la forma la da el lavado dorado, que se ve en claro y en oscuro; el `cardBgAlt`
                que tenía antes es blanco puro y sin la línea habría desaparecido en modo claro. */}
            <View style={[styles.avatar, { backgroundColor: c.goldWash }]}>
              {profileAvatar ? (
                <Image source={{ uri: profileAvatar }} style={styles.avatarImage} accessibilityLabel="Foto de perfil" />
              ) : (
                <Text style={[styles.avatarInitials, { color: c.goldInk }]}>{profileInitials}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[t.cardTitle, { color: c.textStrong }]}>{profileName}</Text>
              <Text style={[t.small, { color: c.micro, marginTop: 3 }]}>{profileEmail}</Text>
            </View>
          </View>

          {/* TU EVOLUCIÓN */}
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[t.micro, { color: c.textSoft }]}>TU EVOLUCIÓN</Text>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 11 }]}>
                {rotuloDeFase(resumen?.fase)?.toUpperCase() ?? ''}
              </Text>
            </View>
            {/* Mismo tratamiento que en Hoy: el día del programa es el dato del bloque, no una
                micro-etiqueta. A 10.5 px competía con el rótulo de arriba; a 15 con cifras
                tabulares se lee y no se corre de lugar al pasar del día 9 al 10. */}
            <Text style={[t.cardTitle, styles.cifras, { color: c.textStrong, fontSize: 15, marginTop: 4 }]}>
              DÍA {resumen?.diaPrograma ?? '—'} DE {DIAS_DEL_PROGRAMA}
            </Text>
            {/* La curva era un dibujo fijo (ver `curvaDeEvolucion`). Ahora es el cumplimiento de
                cada día del semáforo; con menos de dos días medidos no se dibuja. */}
            {curva ? (
              <View
                accessible
                accessibilityLabel={`Tu cumplimiento de los últimos ${diasDelSemaforo.length} días. ${diasDelSemaforo.map(dichoDelDia).join('. ')}.`}
                style={{ marginTop: 14, gap: 6 }}
              >
                <Svg width="100%" height={78} viewBox="0 0 320 78">
                  <Path d={curva.trazo} stroke={c.gold} strokeWidth={1.5} strokeLinecap="round" fill="none" />
                  {curva.puntos.map(p => <Circle key={p.clave} cx={p.x} cy={p.y} r={2.8} fill={c.gold} />)}
                </Svg>
                <Text style={[t.small, { color: c.micro }]}>
                  Tu cumplimiento · últimos {diasDelSemaforo.length} días
                </Text>
              </View>
            ) : null}
          </View>

          {/* STATS REALES CALCULADOS POR EL BACKEND
              Eran tres cajas con borde y fondo, una dorada y dos grises sin motivo. Ahora son tres
              columnas de texto sobre el fondo de la pantalla, separadas por líneas de pelo — el
              mismo tratamiento que recibieron las métricas de Hoy, para que las dos pestañas
              muestren los mismos números de la misma forma. Las cifras pasan a `t.metric`, que
              trae ancho de dígito fijo: antes, al subir de 99 a 100 puntos, la columna se corría. */}
          <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: space.gap }}>
            {/* Coherencia */}
            <View style={styles.statBloque}>
              <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>COHERENCIA</Text>
              <View style={styles.statCifra}>
                <Text style={[t.metric, { color: c.goldInk }]}>
                  {/* Sin acciones planificadas no hay coherencia: un guion, no un 100 (D-128). */}
                  {resumen?.coherencia == null ? '—' : Math.round(resumen.coherencia)}
                </Text>
                <Text style={{ fontFamily: 'Jost_500Medium', fontSize: 15, color: c.goldInk }}>%</Text>
              </View>
            </View>

            <View style={[styles.statSeparador, { backgroundColor: c.divider }]} />

            {/* Puntos Liga */}
            <View style={styles.statBloque}>
              <Text style={[t.micro, { color: c.micro, fontFamily: 'Jost_700Bold' }]}>PUNTOS LIGA</Text>
              <View style={styles.statCifra}>
                <Text style={[t.metric, { color: c.textStrong }]}>{resumen?.puntosLiga ?? '—'}</Text>
              </View>
            </View>

            <View style={[styles.statSeparador, { backgroundColor: c.divider }]} />

            {/* Racha */}
            <View style={styles.statBloque}>
              <Text style={[t.micro, { color: c.micro, fontFamily: 'Jost_700Bold' }]}>RACHA DÍAS</Text>
              <View style={styles.statCifra}>
                <Text style={[t.metric, { color: c.textStrong }]}>{resumen?.rachaActual ?? '—'}</Text>
                {resumen ? <Text style={{ fontFamily: 'Jost_500Medium', fontSize: 15, color: c.micro }}>d</Text> : null}
              </View>
            </View>
          </View>

          {/* EVIDENCIA */}
          <View>
            <MicroLabel>Evidencia</MicroLabel>
            {/* Antes: tres cajas "FOTO" fijas y un "+6" escrito a mano, que daban a entender
                nueve evidencias a cualquiera. Ahora sale del mismo listado real que la
                sub-pantalla, y cuando no hay ninguna se dice, no se rellena. */}
            {cargandoEvidencias ? (
              <Text style={[t.body, { color: c.textSoft, marginTop: 12 }]}>
                Cargando tus evidencias…
              </Text>
            ) : evidencias.length === 0 ? (
              <Pressable
                onPress={() => setActiveView('evidencias')}
                accessibilityRole="button"
                accessibilityLabel="Ver tus evidencias"
                style={[styles.rowCard, { borderColor: c.border, backgroundColor: c.cardBg, marginTop: 12 }]}
              >
                <Icon name="camera" size={18} color={c.chevron} />
                {/* Era 12.5: es el texto principal de la fila, no una etiqueta de ayuda. */}
                <Text style={[t.body, { color: c.textSoft, flex: 1 }]}>
                  {errorEvidencias ? 'No se pudieron cargar tus evidencias.' : 'Todavía no subiste evidencias.'}
                </Text>
                <Icon name="chevron" size={12} color={c.chevron} />
              </Pressable>
            ) : (
              <View style={{ flexDirection: 'row', gap: space.gap, marginTop: 12 }}>
                {evidencias.slice(0, 3).map(ev => (
                  <Pressable
                    key={ev.id}
                    onPress={() => setActiveView('evidencias')}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver evidencia del ${fechaDeEvidencia(ev.subidaEn ?? ev.timestampExif)}`}
                    style={{ flex: 1 }}
                  >
                    {/* El borde se queda: estas miniaturas se tocan. Lo que se fue es el
                        `borderRadius: 10` suelto — ahora sale del token de radio interno.
                        2026-10-05 (D-252): la foto real, con el ícono del tipo de respaldo. */}
                    <MiniaturaDeEvidencia
                      evidencia={ev}
                      style={[
                        styles.more,
                        { height: moreSize, borderColor: c.border, backgroundColor: c.cardBg },
                      ]}
                      tamanoIcono={18}
                      colorIcono={c.goldInk}
                    />
                  </Pressable>
                ))}
                {evidencias.length > 3 && (
                  <Pressable
                    onPress={() => setActiveView('evidencias')}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver las otras ${evidencias.length - 3} evidencias`}
                    style={[styles.more, { width: moreSize, height: moreSize, borderColor: c.border, backgroundColor: c.cardBg }]}
                  >
                    <Text style={[t.body, { color: c.textSoft }]}>+{evidencias.length - 3}</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* Corregido 2026-09-29: acá estaban «Reflexión diaria» e «Identidad», dos tarjetas que al
              tocarlas solo mostraban un aviso con una frase fija, y «Patrones», un gráfico dibujado
              a mano. La app no tiene dónde escribir una reflexión (el diario del backend,
              `/journal/today`, no lo llena nadie) ni un dato de identidad propio de cada persona,
              así que se quitaron en vez de simular. */}

          {/* Lo que se abre desde Yo, como filas de una lista (rediseño del 2026-10-05). Eran dos
              tarjetas sueltas (la Caja y Administración, sin ícono) y tres botones de web en
              versales («MI FICHA INICIAL & PACTO», «TUVE UNA EMERGENCIA» con el ♡ de «me gusta»,
              «CERRAR SESIÓN») más un enlace subrayado «Eliminar mi cuenta». Cerrar sesión y eliminar
              la cuenta pasaron a Ajustes, al final y en rojo: quedan UNA vez cada una (decisión 10
              del dueño). */}
          <GrupoDeAjustes>
            {/* TU CAJA RENASER (D-219) — solo si el servidor dice que hay algo que mostrarle */}
            {miCaja.visible && miCaja.caja ? (
              <FilaDeAjuste
                key="caja"
                icono="package"
                titulo="Tu Caja Renaser"
                detalle={etiquetaParaElAprendiz(miCaja.caja.estado)}
                onPress={() => setEnCaja(true)}
              />
            ) : null}
            {/* ADMINISTRACIÓN — solo si el servidor dice que esta cuenta puede */}
            {capacidades.administrar ? (
              <FilaDeAjuste
                key="administracion"
                icono="users"
                titulo="Administración"
                detalle="Grupos, personas y solicitudes"
                etiqueta="Abrir Administración"
                onPress={() => setEnAdministracion(true)}
              />
            ) : null}
            <FilaDeAjuste
              key="ficha"
              icono="signature"
              titulo="Mi ficha y Pacto"
              onPress={() => setActiveView('onboarding')}
            />
            {/* TUVE UNA EMERGENCIA (D-244): solo si el servidor dice que esta cuenta puede pedirlo. */}
            {miEmergencia.visible ? (
              <FilaDeAjuste
                key="emergencia"
                icono="lifeBuoy"
                titulo="Tuve una emergencia"
                etiqueta="Tuve una emergencia: pedir volver a un día del programa"
                onPress={() => setEnEmergencia(true)}
              />
            ) : null}
          </GrupoDeAjustes>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 2. CENTRO DE PERFIL ORGANIZADO EN 4 FASES/CAJONES EJECUTIVOS              */}
      {/* ========================================================================= */}
      {activeView === 'hub' && (
        <ScrollView
          {...barraAlDesplazar}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Banner de Usuario — ya no es un banner: era una tarjeta con borde dorado de 1.5 que
              adentro tenía otro disco con borde dorado, dos rectángulos para presentar a una
              persona. Ahora es una fila sobre el fondo de la pantalla; lo que la separa de lo que
              sigue es el aire, no un contorno. El disco pasó a `goldWash` porque sin la línea, con
              el `#292215` que tenía escrito a mano, quedaba una mancha marrón en modo claro. */}
          <View style={styles.profileBanner}>
            <View style={[styles.avatarLg, { backgroundColor: c.goldWash }]}>
              {profileAvatar ? (
                <Image source={{ uri: profileAvatar }} style={styles.avatarImageLarge} accessibilityLabel="Foto de perfil" />
              ) : (
                <Text style={{ color: c.goldInk, fontSize: 18, fontFamily: 'Jost_700Bold' }}>{profileInitials}</Text>
              )}
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[t.cardTitle, { color: c.textStrong }]}>{profileName}</Text>
              {/* Eran dos líneas de 11 px: el correo y la fase de alguien no son micro-etiquetas,
                  son los datos del encabezado. A 13 se leen sin acercar el teléfono. */}
              <Text style={[t.small, { color: c.goldInk }]}>{profileEmail}</Text>
              <Text style={[t.small, { color: c.textSoft }]}>
                {[resumen ? `Día ${resumen.diaPrograma}` : null, rotuloDeFase(resumen?.fase)].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>

          {/* Ajustes como en iOS (rediseño del 2026-10-05): filas de 56 agrupadas, cada una con su
              baldosa dorada, y los grupos con un título en tipo oración. Los títulos decían «FASE 1:
              DATOS PERSONALES & PERFIL» … «FASE 4: PREFERENCIAS & SISTEMA»: «fase» chocaba con las
              cuatro fases del programa (decisión 14 del dueño).
              Corregido 2026-09-29 («textos verdaderos»): los subtítulos de estas filas prometían
              lo que la pantalla de destino no tiene. Decían «Nombre, foto, teléfono y
              contraseña», «Ubicación, redes y biografía somática», «Mi Onboarding (5 Etapas) ·
              El Pacto firmado, cuestionario y las 90 variables», «37 fotos subidas y verificadas
              por tu mentor» (fijo; y ningún mentor verifica), «Medallas y trofeos» (no hay
              registro de logros), «3 fases» (son 4) y «Video de bienvenida» (no hay video).
              Ahora dicen solo lo que existe; los conteos salen de los datos. */}
          <View style={{ gap: space.gapLg, paddingBottom: 28 }}>
            <GrupoDeAjustes titulo="Perfil">
              <FilaDeAjuste
                icono="user"
                titulo="Editar perfil"
                detalle="Nombre y foto"
                onPress={() => setActiveView('editar_perfil')}
              />
              <FilaDeAjuste
                icono="idCard"
                titulo="Información"
                detalle="Biografía y departamento"
                onPress={() => setActiveView('info_perfil')}
              />
            </GrupoDeAjustes>

            <GrupoDeAjustes titulo="Tu proceso">
              <FilaDeAjuste
                icono="listChecks"
                titulo="Mi onboarding"
                detalle="El Pacto y tu Mapa de Renacimiento"
                onPress={() => setActiveView('onboarding')}
              />
              <FilaDeAjuste
                icono="images"
                titulo="Mis evidencias"
                detalle={resumenDeEvidencias({
                  cargando: cargandoEvidencias,
                  error: errorEvidencias,
                  cantidad: evidencias.length,
                  hayMas: hayMasEvidencias,
                })}
                onPress={() => setActiveView('evidencias')}
              />
            </GrupoDeAjustes>

            {/* Decisión del cliente (2026-09-04): "Espejo de la Sombra" (catarsis privada +
                informe semanal con IA) YA NO VA. Se quitaron la entrada del menú y su sub-vista
                completa, más el estado `catarsisText` y el valor 'espejo' de `activeView`, que
                quedaban sin uso. El módulo `rag` del backend (InformeEspejoSombra) NO se tocó:
                esto es solo el acceso desde la app. Recuperable del historial de git si vuelve. */}
            <GrupoDeAjustes titulo="Herramientas">
              <FilaDeAjuste
                icono="compass"
                titulo="El Método Renaser"
                detalle={`${METODO_FASES.length} fases para comprenderte y sostener tu transformación`}
                onPress={() => setActiveView('metodo')}
              />
            </GrupoDeAjustes>

            <GrupoDeAjustes titulo="Preferencias">
              <FilaDeAjuste
                icono="bell"
                titulo="Notificaciones"
                detalle="Qué avisos te llegan"
                onPress={() => setActiveView('notificaciones')}
              />
              {/* E-10 (26/09, decisión del dueño): una sección para personalizar las alarmas. */}
              <FilaDeAjuste
                icono="alarmClock"
                titulo="Alarmas"
                detalle="Despertar, eventos y sonido"
                onPress={() => setActiveView('alarmas')}
              />
              {/* D-167: solo si la memoria está encendida, o si quedó algo de antes para borrar. La
                  baldosa es el orbe de SER, su cara en Hoy y en el botón flotante (era un cerebro, el
                  mismo de la dimensión «Mente»). */}
              {mostrarMemoria(memoriaRenasia.memoria) ? (
                <FilaDeAjuste
                  baldosa={<OrbeQuieto size={TAMANO_ICONO_BALDOSA + 4} color={c.onGold} />}
                  titulo={`Lo que ${NOMBRE_ACOMPANANTE} recuerda de ti`}
                  detalle="Míralo y bórralo cuando quieras"
                  etiqueta={`Ver lo que ${NOMBRE_ACOMPANANTE} recuerda de ti`}
                  onPress={() => {
                    /* Se vuelve a pedir al abrir: la pestaña Yo queda montada y, sin esto, la
                       pantalla mostraba lo de hace una hora aunque Renasia ya hubiera aprendido
                       algo nuevo (visto en el emulador, 2026-09-25). */
                    void memoriaRenasia.recargar();
                    setActiveView('memoria_renasia');
                  }}
                />
              ) : null}
              {/* La fila no se toca: se toca el interruptor. Envolverlo en algo tocable hace que un
                  toque cambie el modo dos veces y vuelva a donde estaba. El ícono acompaña al estado
                  (sol = ahora está claro); lo que va a pasar lo dice el interruptor. */}
              <FilaDeAjuste
                icono={mode === 'dark' ? 'moon' : 'sun'}
                titulo="Modo oscuro"
                detalle="Descansa la vista de noche"
                accesorio={<Interruptor valor={mode === 'dark'} onCambiar={toggle} etiqueta="Modo oscuro" />}
              />
            </GrupoDeAjustes>

            {/* Lo que cierra o borra la cuenta, aparte y al final, en rojo (decisión 10 del dueño,
                2026-10-05). «Eliminar mi cuenta» vivía en Yo como un enlace subrayado al pie; Google
                Play exige que se encuentre, así que acá es una fila visible, con «›» porque abre su
                pantalla. «Cerrar sesión» estaba dos veces (en Yo y acá): queda esta, sin «›» porque
                no abre nada, lo hace. */}
            <GrupoDeAjustes>
              <FilaDeAjuste
                icono="trash"
                titulo="Eliminar mi cuenta"
                peligro
                onPress={() => setEliminandoCuenta(true)}
              />
              <FilaDeAjuste
                icono="logout"
                titulo="Cerrar sesión"
                peligro
                sinChevron
                onPress={logout}
              />
            </GrupoDeAjustes>
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* SUB-VISTA: LO QUE RENASIA RECUERDA DE TI (D-167)                          */}
      {/* ========================================================================= */}
      {activeView === 'memoria_renasia' && (
        <ScrollView
          {...barraAlDesplazar}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* El título «Lo que SER recuerda de ti» se fue: lo dice la cabecera. */}
          <MemoriaDeRenasia
            memoria={memoriaRenasia.memoria}
            cargando={memoriaRenasia.cargando}
            borrando={memoriaRenasia.borrando}
            error={memoriaRenasia.error}
            onOlvidar={id => void memoriaRenasia.olvidar(id)}
            onOlvidarTodo={() => void memoriaRenasia.olvidarTodo()}
            onReintentar={() => void memoriaRenasia.recargar()}
          />
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 3. SUB-VISTA: 🎙️ MI ONBOARDING (2 ETAPAS)                                */}
      {/* ========================================================================= */}
      {activeView === 'onboarding' && (
        <ScrollView
          {...barraAlDesplazar}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Alineado a la izquierda. El par "título centrado + párrafo centrado" obliga al ojo a
              volver al centro en cada línea y es el gesto de plantilla que esta pasada viene a
              quitar. Y el párrafo estaba a 11 px: es texto de lectura, va en `t.body` (15/22). */}
          <View style={{ gap: 8 }}>
            <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 20, lineHeight: 27 }]}>
              Tu proceso completo
            </Text>
            <Text style={[t.body, { color: c.textSoft }]}>
              Dos etapas para poner por escrito quién eras, quién eres y en quién te estás convirtiendo. Cada etapa se guarda al terminarla.
            </Text>
          </View>

          {/*
            Acá vivía el banner "Tu ventana de 24 horas está abierta · Te quedan 1 h 18 min —
            cierra a las 6:00 pm". Retirado el 2026-09-05 a pedido del dueño: no había ningún
            reloj detrás. Era texto fijo — decía "1 h 18 min" a cualquier hora del día, para
            siempre, y anunciaba un cierre que nunca ocurría. Vuelve cuando esté definido qué es
            esa ventana y el backend pueda decir cuándo abre y cuándo cierra de verdad.
          */}

          {/* Barra de Progreso — el riel pasó de `cardBg` con borde a `divider` sin borde: en modo
              claro `cardBg` (#FDFCFA) es casi el fondo de la pantalla, así que el único que
              dibujaba la barra era el contorno. Ahora la dibuja el color, como en `metodoProgressTrack`. */}
          <View style={{ gap: 8 }}>
            <View style={[styles.progressBarBg, { backgroundColor: c.divider }]}>
              {/* El ancho sale del conteo real. Estaba fijo en 60%, así que la barra decía una
                  cosa y el texto de abajo otra apenas el conteo dejara de ser tres. */}
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.round((etapasOnboarding.completadas / ONBOARDING_STAGES.length) * 100)}%`,
                    backgroundColor: c.gold,
                  },
                ]}
              />
            </View>
            {/* Era 10 px y centrado: por debajo del mínimo de micro-etiqueta y desalineado
                respecto del inicio de la barra que describe. */}
            <Text style={[t.small, styles.cifras, { color: c.textSoft }]}>
              {etapasOnboarding.completadas} de {ONBOARDING_STAGES.length} etapas completadas
            </Text>
          </View>

          {/* 2 Etapas */}
          <View style={{ gap: space.gap, paddingBottom: 28 }}>
            {ONBOARDING_STAGES.map(stage => {
              // El estado de cada etapa sale de datos reales, no del array: `pactSignedAt` para
              // el Pacto y `stageCompleted` para el Mapa. La etapa 2 leia el estado del
              // Cuestionario Profundo, que es otro flujo — por eso quien ya habia terminado su
              // mapa seguia viendo "1 de 2 etapas completadas".
              const estado =
                stage.id === 'st1' ? etapasOnboarding.pacto
                : stage.id === 'st2' ? etapasOnboarding.mapaRenacimiento
                : 'pendiente';
              const completada = estado === 'completada';
              const enProgreso = estado === 'en_progreso';
              const descripcion = completada
                ? 'Completada · toca para revisar'
                : enProgreso
                ? 'Empezada · toca para continuar'
                : stage.descPendiente;

              return (
              <Presionable
                key={stage.id}
                accessibilityRole="button"
                accessibilityLabel={`${stage.title}. ${descripcion}`}
                onPress={() => {
                  if (stage.id === 'st1') {
                    setActiveView('pacto');
                  } else {
                    // Etapa 2 — el Mapa de Renacimiento contiene el formulario completo y
                    // reanuda automáticamente desde el paso donde la persona quedó.
                    setActiveView('mapa_renacimiento');
                  }
                }}
                style={[
                  styles.stageCard,
                  {
                    borderColor: enProgreso ? c.gold : c.border,
                    backgroundColor: enProgreso ? c.cardBgAlt : c.cardBg,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  {/* Los discos eran casi negros escritos a mano (`#173429`, `#2A2620`) con un «✓» de
                      texto de 11 px: en claro desentonaban. Ahora salen del tema (2026-10-05): hecha,
                      lavado verde con el ✓ de 16; empezada, dorado; pendiente, lavado dorado con su
                      número. */}
                  <View
                    style={[
                      styles.stageCheckCircle,
                      { backgroundColor: completada ? c.successWash : enProgreso ? c.gold : c.goldWash },
                    ]}
                  >
                    {completada ? (
                      <Icon name="check" size={TAMANO_ICONO.chico} color={c.success} />
                    ) : (
                      <Text
                        style={[
                          styles.cifras,
                          {
                            color: enProgreso ? c.onGold : c.goldInk,
                            fontFamily: 'Jost_700Bold',
                            fontSize: 14,
                          },
                        ]}
                      >
                        {stage.num}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[t.cardTitle, { color: enProgreso ? c.goldInk : c.textStrong }]}>
                      {stage.title}
                    </Text>
                    <Text style={[t.small, { color: c.textSoft }]}>
                      {descripcion}
                    </Text>
                  </View>
                </View>
                <Icon name="chevron" size={20} color={enProgreso ? c.goldInk : c.chevron} />
              </Presionable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 4. SUB-VISTA: 📜 EL PACTO DE RENACIMIENTO (CON FIRMA)                     */}
      {/* ========================================================================= */}
      {activeView === 'pacto' && (
        <ScrollView
          {...barraAlDesplazar}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Encabezado alineado a la izquierda y sin el contorno del disco, que vivía justo
              encima del borde del documento. "Léelo despacio" es una instrucción que se lee, no
              una micro-etiqueta: pasa de 10.5 a 15. */}
          <View style={{ gap: 10 }}>
            <View style={[styles.iconShieldCircle, { backgroundColor: c.goldWash }]}>
              <Icon name="signature" size={TAMANO_ICONO.normal} color={c.goldInk} />
            </View>
            <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 20, lineHeight: 27 }]}>
              Pacto de Renacimiento
            </Text>
            <Text style={[t.body, { color: c.textSoft }]}>
              Léelo despacio. Léelo en voz alta si puedes.
            </Text>
          </View>

          {/* Manifiesto y Cláusulas
              El contorno dorado de esta tarjeta es el ÚNICO que se conserva en el archivo, y a
              propósito: acá el borde es el canto de un documento que se firma, no un adorno para
              destacar una tarjeta (baja de 1.5 a 1).
              El cambio de fondo es el importante: el manifiesto estaba a 11 px y las diez
              cláusulas a 10.5. AGENTS.md §4 dice, con todas las letras, que las cláusulas van
              entre 14 y 15.5 — se le estaba pidiendo a alguien de 40–60 años que leyera y firmara
              un compromiso en letra de nota al pie. Todo pasa a `t.body` (15/22). */}
          <View style={[styles.pactoDocumentCard, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
            <View style={{ borderBottomWidth: 1, borderBottomColor: c.divider, paddingBottom: 12 }}>
              <Text style={{ fontFamily: 'Jost_700Bold', color: c.goldInk, fontSize: 16, fontStyle: 'italic' }}>
                Pacto de Renacimiento
              </Text>
              <Text style={[t.small, { color: c.textSoft, marginTop: 4 }]}>Acto fundacional</Text>
            </View>

            <Text style={[t.body, { color: c.text }]}>
              Yo, <Text style={{ color: c.goldInk, fontFamily: 'Jost_700Bold' }}>{profileName}</Text>, en pleno uso de mi consciencia, declaro este pacto conmigo mismo en presencia del sistema RENASER y de la versión más alta de mí.
            </Text>

            <Text style={[t.body, { color: c.text }]}>
              <Text style={{ fontFamily: 'Jost_700Bold', color: c.textStrong }}>Renuncio a la mediocridad.</Text> Renuncio al desdén con que he tratado mi cuerpo, mi mente, mis emociones y mi tiempo.
            </Text>

            <View style={{ gap: 10, marginVertical: 4 }}>
              {PACTO_CLAUSULAS.map(clause => (
                <Text key={clause} style={[t.body, { color: c.textSoft }]}>
                  {clause}
                </Text>
              ))}
            </View>

            <Text style={[t.body, { color: c.goldInk, fontFamily: 'Jost_700Bold', borderTopWidth: 1, borderTopColor: c.divider, paddingTop: 12 }]}>
              Si lo cumplo, gano una identidad nueva. Si lo abandono, pierdo la versión de mí que ya estaba esperando del otro lado.
            </Text>
          </View>

          {/* Ya firmado (decisión 12 del dueño, 2026-10-05): en solo lectura, con la fecha de la
              firma. Antes se veía el lienzo vacío y «Sellar mi compromiso» otra vez, como si nunca
              se hubiera firmado. La firma dibujada no se muestra porque el servidor no la devuelve
              (ver `PactoFirmado`). Mientras no se sepa (`desconocido`, sin red) se ofrece firmar,
              como antes. */}
          {pactoYaFirmado ? (
            <PactoFirmado firmadoEn={etapasOnboarding.pactoFirmadoEn} />
          ) : (
            <>
              {/* Firma Digital con el Dedo — el recuadro exterior perdió su borde: adentro vive el
                  lienzo, que es la afordancia de verdad. Eran dos rectángulos concéntricos para
                  pedir una sola firma.

                  Acá vivía la maqueta que no dejaba firmar (ver el comentario de `sellarPacto`).
                  Ahora es el `SignatureCanvas` de verdad, el mismo que usan Términos y `PactoScreen`:
                  trae los tres flags anti-intercepción de AGENTS.md §3 para que el `ScrollView` de
                  Android no le robe el gesto al dedo, y en modo dual, porque el nombre caligráfico
                  que se veía antes era —sin serlo— la firma electrónica que §3 pide ofrecer. */}
              <View style={styles.signatureBox}>
                <Text style={{ fontFamily: 'Jost_700Bold', color: c.goldInk, fontSize: 15, fontStyle: 'italic' }}>
                  Firma con tu dedo
                </Text>

                <SignatureCanvas
                  ref={firmaPactoRef}
                  // La pantalla ya rotula el recuadro con «Firma con tu dedo» justo arriba: el
                  // cintillo propio del lienzo sería el segundo título de lo mismo. El pie SÍ se deja
                  // (es donde vive "Limpiar firma").
                  hideHeader
                  nombreFirmaElectronica={profileName}
                  initialSignature={firmaPacto}
                  onSignatureChange={(valida, datos) => setFirmaPacto(valida ? datos : null)}
                />

                <Text style={[t.small, { color: c.textSoft, textAlign: 'center' }]}>
                  Tu firma se registra al sellar el Pacto.
                </Text>
              </View>

              <GoldButton
                label="Sellar mi compromiso"
                icon="check"
                iconPosition="left"
                onPress={sellarPacto}
                disabled={!firmaPacto}
                loading={sellandoPacto}
                style={{ width: '100%', marginBottom: 28 }}
                textStyle={{ fontSize: 15, letterSpacing: 0 }}
              />
            </>
          )}
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 5. SUB-VISTA: 📸 REGISTRO DE EVIDENCIAS                                   */}
      {/* ========================================================================= */}
      {activeView === 'evidencias' && (
        <ScrollView
          {...barraAlDesplazar}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[t.cardTitle, { color: c.textStrong }]}>Tus Evidencias Somáticas</Text>
              {/* Decia "37 fotos subidas · 100% verificadas", escrito a mano, a cualquiera.
                  Era 10.5: es la línea que resume el conteo, texto de ayuda (12–13.5), no micro. */}
              <Text style={[t.small, { color: c.textSoft }]}>
                {cargandoEvidencias
                  ? 'Cargando tus evidencias…'
                  : errorEvidencias
                    ? 'No se pudo cargar el conteo'
                    : evidencias.length === 0
                      ? 'Todavía no subiste ninguna'
                      : hayMasEvidencias
                        ? 'Tus evidencias más recientes'
                        : `${evidencias.length} ${evidencias.length === 1 ? 'evidencia' : 'evidencias'} · ${verificadasEvidencias} verificada${verificadasEvidencias === 1 ? '' : 's'}`}
              </Text>
            </View>
            {/* Corregido 2026-09-29: solo mostraba «Abriendo selector de cámara…» y no abría
                nada. Ahora elige el hábito de hoy y sigue el registro con foto de Training. En
                web no aparece: ahí Training tampoco usa la cámara directa. */}
            {Platform.OS !== 'web' ? (
              <Pressable
                onPress={() => setEligiendoHabitoParaFoto(true)}
                accessibilityRole="button"
                accessibilityLabel="Subir la foto de un hábito de hoy"
                style={[styles.createHabitBtn, { backgroundColor: c.gold }]}
              >
                <Text style={[t.small, { color: c.onGold, fontFamily: 'Jost_700Bold' }]}>+ Subir Foto</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.gap, paddingBottom: 28 }}>
            {evidencias.map(ev => {
              const validada = ev.estadoValidacion === ESTADO_EVIDENCIA.VALIDA;
              const rechazada = ev.estadoValidacion === ESTADO_EVIDENCIA.RECHAZADA
                || ev.estadoValidacion === ESTADO_EVIDENCIA.ANULADA_ADMIN;
              const colorEstado = validada ? c.success : rechazada ? c.danger : c.goldInk;
              return (
                <View
                  key={ev.id}
                  style={[
                    styles.evidenceCard,
                    {
                      borderColor: c.border,
                      backgroundColor: c.cardBg,
                      width: isTablet ? '31%' : '47.5%',
                    },
                  ]}
                >
                  {/* El cuadro del ícono pasa a lavado dorado: dentro de una tarjeta que ya tiene
                      borde, `cardBgAlt` es blanco puro en modo claro y no se distinguía de nada.
                      2026-10-05 (D-252): la foto real encima; tocarla la abre en grande. */}
                  <MiniaturaDeEvidencia
                    evidencia={ev}
                    style={[styles.evidenceImgBox, { backgroundColor: c.goldWash }]}
                    tamanoIcono={26}
                    colorIcono={c.goldInk}
                    ampliable
                  />
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 14 }]} numberOfLines={2}>
                    {ev.contenidoTexto?.trim() || ETIQUETA_TIPO_EVIDENCIA[ev.tipo] || 'Evidencia'}
                  </Text>
                  <Text style={[t.small, styles.cifras, { color: c.goldInk }]}>
                    {fechaDeEvidencia(ev.subidaEn ?? ev.timestampExif)}
                  </Text>
                  {/* Era una píldora con borde propio dentro de una tarjeta con borde. El estado
                      ya lo dice el color del texto; la caja sólo agregaba una línea más. */}
                  <Text style={[t.micro, { color: colorEstado, fontFamily: 'Jost_700Bold', marginTop: 4 }]}>
                    {ETIQUETA_ESTADO_EVIDENCIA[ev.estadoValidacion] ?? ev.estadoValidacion}
                  </Text>
                </View>
              );
            })}

            {/* Los tres estados se dicen distinto porque no significan lo mismo: todavia no se
                sabe, no se pudo preguntar, o se pregunto y no hay ninguna. */}
            {/* Los tres estados van alineados a la izquierda, como el resto del texto de lectura
                de la pantalla, y en `t.body`: eran 13 y 12.5 px centrados. */}
            {cargandoEvidencias && (
              <Text style={[t.body, { color: c.textSoft, width: '100%', paddingVertical: 20 }]}>
                Cargando tus evidencias…
              </Text>
            )}
            {!cargandoEvidencias && errorEvidencias && (
              <View style={{ width: '100%', paddingVertical: 20, alignItems: 'flex-start', gap: 12 }}>
                <Text style={[t.body, { color: c.danger }]}>
                  {errorEvidencias}
                </Text>
                <GoldButton label="REINTENTAR" variant="outline" onPress={recargarEvidencias} />
              </View>
            )}
            {!cargandoEvidencias && !errorEvidencias && evidencias.length === 0 && (
              <View style={{ width: '100%', paddingVertical: 24, alignItems: 'flex-start', gap: 8 }}>
                <Icon name="camera" size={26} color={c.chevron} />
                <Text style={[t.cardTitle, { color: c.textStrong, marginTop: 4 }]}>
                  Todavía no subiste evidencias
                </Text>
                <Text style={[t.body, { color: c.textSoft }]}>
                  Cada foto que selles queda aquí, con la fecha y su estado de validación.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 8. SUB-VISTA: 👤 EDITAR PERFIL                                            */}
      {/* ========================================================================= */}
      {activeView === 'editar_perfil' && (
        <ScrollView
          {...barraAlDesplazar}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* El avatar sigue centrado a propósito: es una imagen, no texto de lectura. Lo que se
              fue es su contorno dorado y el `#292215` escrito a mano, que en modo claro dibujaba
              un círculo marrón sobre el fondo crema.
              Rediseño 2026-10-05: «Cambiar Foto 📷» llevaba un emoji (cambia de forma entre Android,
              iOS y la web e ignora el tema). Ahora la cámara es una insignia sobre la foto, y la foto
              y el texto son UN botón que responde al dedo. */}
          <Presionable
            disabled={subiendoAvatar}
            accessibilityRole="button"
            accessibilityLabel="Cambiar tu foto de perfil"
            accessibilityState={{ disabled: subiendoAvatar, busy: subiendoAvatar }}
            onPress={async () => {
              /* El selector PROPIO del perfil, no el de evidencias: aquel pide el permiso
                 hablando de "la evidencia de tu hábito" y, sobre todo, no recorta — una foto
                 apaisada entraba al círculo con la cara fuera del encuadre. */
              const archivo = await elegirFotoDePerfil();
              if (!archivo) return;
              setSubiendoAvatar(true);
              try {
                const subida = await authApi.solicitarUrlAvatar(archivo.mimeType);
                await authApi.subirAvatarAS3(subida.url, archivo.uri, archivo.mimeType);
                await authApi.confirmarAvatar(subida.bucket, subida.ruta);
                await refrescarPerfil();
                confirmar('Foto actualizada.', 'editar_perfil');
              } catch (error) {
                Alert.alert('No se pudo actualizar la foto', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
              } finally {
                setSubiendoAvatar(false);
              }
            }}
            contenedorStyle={{ alignSelf: 'center' }}
            style={{ alignItems: 'center', gap: 8 }}
          >
            <View>
              <View style={[styles.avatarLg, { backgroundColor: c.goldWash, width: 76, height: 76, borderRadius: 38 }]}>
                {profileAvatar ? (
                  <Image source={{ uri: profileAvatar }} style={styles.avatarImageLarge} accessibilityLabel="Foto de perfil" />
                ) : (
                  <Text style={{ color: c.goldInk, fontSize: 24, fontFamily: 'Jost_700Bold' }}>{profileInitials}</Text>
                )}
              </View>
              <View style={[styles.insigniaCamara, { backgroundColor: c.gold, borderColor: c.bg }]}>
                <Icon name="camera" size={TAMANO_ICONO.chico} color={c.onGold} />
              </View>
            </View>
            <Text style={[t.small, { color: c.goldInk, fontFamily: 'Jost_500Medium', fontSize: 15 }]}>
              {subiendoAvatar ? 'Subiendo…' : 'Cambiar foto'}
            </Text>
          </Presionable>

          {/* Las etiquetas de campo pasan de 10.5 a 13: son lo que le dice a alguien qué escribir
              en cada casilla, no una marca al margen. */}
          <View style={{ gap: space.gap }}>
            <View style={{ gap: 6 }}>
              <Text style={[t.small, styles.rotuloCampo, { color: c.textStrong }]}>Nombre completo</Text>
              <TextInput
                value={profileName}
                onChangeText={setProfileName}
                style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[t.small, styles.rotuloCampo, { color: c.textStrong }]}>Correo electrónico</Text>
              <TextInput
                value={profileEmail}
                keyboardType="email-address"
                editable={false}
                placeholder="Correo de la cuenta"
                style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
              />
            </View>

          </View>

          <GoldButton
            label={guardandoPerfil ? 'Guardando…' : 'Guardar cambios'}
            icon={guardandoPerfil ? undefined : 'check'}
            iconPosition="left"
            textStyle={{ fontSize: 15, letterSpacing: 0 }}
            onPress={async () => {
              if (!profileName.trim()) {
                Alert.alert('Falta tu nombre', 'Escribe tu nombre completo para guardar el perfil.');
                return;
              }
              setGuardandoPerfil(true);
              try {
                await actualizarPerfil({
                  fullName: profileName,
                  avatarUrl: profileAvatar,
                  bio: profileBio,
                  department: profileDepartment,
                });
                // Era un diálogo «Perfil guardado»: ahora una línea en Ajustes, que se va sola.
                confirmar('Perfil guardado.', 'hub');
                setActiveView('hub');
              } catch (error) {
                Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
              } finally {
                setGuardandoPerfil(false);
              }
            }}
            disabled={guardandoPerfil}
            style={{ width: '100%', marginBottom: 28 }}
          />
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 9. SUB-VISTA: 🪪 INFORMACIÓN DE PERFIL                                     */}
      {/* ========================================================================= */}
      {activeView === 'info_perfil' && (
        <ScrollView
          {...barraAlDesplazar}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: space.gap }}>
            <View style={{ gap: 6 }}>
              <Text style={[t.small, styles.rotuloCampo, { color: c.textStrong }]}>Biografía somática</Text>
              <TextInput
                value={profileBio}
                onChangeText={setProfileBio}
                multiline
                style={[styles.modalInputText, { minHeight: 70, borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[t.small, styles.rotuloCampo, { color: c.textStrong }]}>Departamento o área</Text>
              <TextInput
                value={profileDepartment}
                onChangeText={setProfileDepartment}
                style={[styles.modalInputText, { borderColor: c.border, backgroundColor: c.cardBg, color: c.text }]}
              />
            </View>

          </View>

          <GoldButton
            label={guardandoPerfil ? 'Guardando…' : 'Guardar información'}
            icon={guardandoPerfil ? undefined : 'check'}
            iconPosition="left"
            textStyle={{ fontSize: 15, letterSpacing: 0 }}
            onPress={async () => {
              setGuardandoPerfil(true);
              try {
                await actualizarPerfil({
                  fullName: profileName,
                  avatarUrl: profileAvatar,
                  bio: profileBio,
                  department: profileDepartment,
                });
                confirmar('Información guardada.', 'hub');
                setActiveView('hub');
              } catch (error) {
                Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
              } finally {
                setGuardandoPerfil(false);
              }
            }}
            disabled={guardandoPerfil}
            style={{ width: '100%', marginBottom: 28 }}
          />
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 10. SUB-VISTA: ✨ EL MÉTODO RENASER                                       */}
      {/* ========================================================================= */}
      {activeView === 'metodo' && (
        <ScrollView
          {...barraAlDesplazar}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Portada del método, alineada a la izquierda (`t.screenTitle`, la serif). El orbe
              llevaba el asterisco de Espíritu teñido del color de cada fase; ahora es la brújula de
              la fila de Ajustes, en la tinta del tema. */}
          <View style={styles.metodoContent}>
            <View style={styles.metodoHero}>
              <View style={[styles.metodoOrb, { backgroundColor: c.goldWash }]}>
                <Icon name="compass" size={TAMANO_ICONO.grande} color={c.goldInk} />
              </View>
              <Text style={[t.screenTitle, { color: c.textStrong }]}>El Método Renaser</Text>
              <Text style={[t.body, styles.metodoHeroSubtitle, { color: c.textSoft }]}>{`${METODO_FASES.length} fases en ${DIAS_DEL_PROGRAMA} días: verte sin filtros, desarmar el sabotaje, elegir desde el gozo y ejecutar.`}</Text>
            </View>

            <MetodoEnPaginas fases={METODO_FASES} margenLateral={horizontalPadding} />

            {/* Era `t.micro` forzado a 12 y centrado: una frase se lee, no se rotula. */}
            <Text style={[t.small, { color: c.micro }]}>Desliza para pasar de fase. Lee una en 20 segundos y vuelve cuando quieras.</Text>
          </View>
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 12. SUB-VISTA: 🔔 NOTIFICACIONES                                          */}
      {/* ========================================================================= */}
      {activeView === 'notificaciones' && (
        <ScrollView
          {...barraAlDesplazar}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <InterruptoresDeAvisos />
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* 13. SUB-VISTA: ALARMAS (2026-09-26, E-10)                                  */}
      {/* ========================================================================= */}
      {activeView === 'alarmas' && (
        <ScrollView
          {...barraAlDesplazar}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              maxWidth: contentMaxWidth,
              alignSelf: isTablet ? 'center' : 'stretch',
              width: isTablet ? '100%' : undefined,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {user?.id ? <SeccionAlarmas userId={user.id} /> : null}
        </ScrollView>
      )}

      <ElegirHabitoParaFotoModal
        visible={eligiendoHabitoParaFoto}
        onCerrar={() => setEligiendoHabitoParaFoto(false)}
        onElegir={subirFotoDe}
        titulos={renombre.titulos}
      />
      <RegistroConFotoModal {...registroConFoto.modal} />
    </SafeAreaView>
  );
}

/**
 * Pasada de limpieza visual del 2026-09-14, la misma que ya se hizo en Hoy, Plan y Training.
 *
 * **Qué borde sobrevive y cuál no.** La regla que se aplicó en todo el archivo: un `borderWidth`
 * se queda sólo si el elemento es un **contenedor externo** (se apoya en el fondo de la pantalla)
 * o una **afordancia** (algo que se toca: un campo, un botón, una fila pulsable). Todo borde que
 * vivía DENTRO de otro borde se fue — los discos de avatar, los círculos de ícono, la píldora de
 * estado de una evidencia. Ahí la forma la da un fondo lavado, no una línea.
 *
 * **Por qué, cuando se quita un borde, a veces cambia el fondo.** En modo claro `bg` (#FCFBF9) y
 * `cardBg` (#FDFCFA) son prácticamente el mismo color: lo que dibuja una tarjeta es su BORDE, no
 * su fondo. Así que un disco al que se le quita la línea y se le deja `cardBg` desaparece. Por eso
 * los que perdieron el borde pasaron a `goldWash`/`divider`, que sí se ven en los dos modos — es
 * el mismo movimiento que se hizo en Hoy con `eventIconBox` y `wallAvatar`.
 *
 * **Radios.** Contenedor `space.radius` (20), interno `space.radiusSm` (12). Antes había once
 * valores distintos entre 6 y 25 sin criterio.
 *
 * **Alturas.** Todo lo pulsable llega a 48 px (AGENTS.md §4). Había botones de 25 px de alto.
 */
const styles = StyleSheet.create({
  /* `gapLg` entre bloques: el espacio es lo que ahora separa las secciones, así que los
     `marginTop` sueltos que tenía cada hijo (12, 14, 16, 10…) se fueron de acá y del JSX. Con
     ellos puestos el gap se sumaba dos veces. */
  content: {
    flexGrow: 1,
    paddingHorizontal: space.screenX,
    paddingBottom: ESPACIO_PARA_LANZADOR,
    gap: space.gapLg,
  },
  /** Cifras que cambian en pantalla: ancho de dígito fijo para que nada salte (AGENTS.md §4). */
  cifras: { fontVariant: ['tabular-nums'] },
  metodoContent: { gap: space.gap, paddingBottom: 34 },
  /* Alineado a la izquierda: el título del método y su bajada son texto de lectura. */
  metodoHero: { gap: 8 },
  metodoOrb: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  metodoHeroSubtitle: { maxWidth: 420 },
  /* Quién eres, arriba de Yo. Ya no se toca (2026-10-05), así que no lleva borde: un borde dice
     «esto se toca». */
  userCard: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 14 },
  /* `overflow: 'hidden'`: la foto toma la forma del disco, mida lo que mida el disco. */
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarLg: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  /** La cámara sobre la foto de Editar perfil: dice «toca para cambiarla» sin texto con emoji. */
  insigniaCamara: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** El nombre de un campo, en tipo oración (eran versales doradas con dos puntos: «NOMBRE COMPLETO:»). */
  rotuloCampo: { fontFamily: 'Jost_500Medium', fontSize: 15, lineHeight: 20 },
  avatarImage: { width: '100%', height: '100%', borderRadius: 22 },
  avatarImageLarge: { width: '100%', height: '100%', borderRadius: 35 },
  avatarInitials: { fontSize: 15, fontFamily: 'Jost_700Bold' },
  /* Era una tarjeta con borde dorado de 1.5 que contenía otro disco con borde: dos rectángulos
     para presentar a una persona. Ahora es una fila de encabezado sobre el fondo de la pantalla,
     igual que la barra de estado de Hoy. */
  profileBanner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  /* Las tres cifras (coherencia, puntos, racha) eran tres cajas con borde. Ahora son tres
     columnas de texto separadas por UNA línea de pelo: el único borde que queda es el que de
     verdad hace falta, porque sin él las cifras se leerían como una sola frase. */
  statBloque: { flex: 1 },
  statCifra: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 6 },
  statSeparador: { width: 1, alignSelf: 'stretch' },
  more: { borderRadius: space.radiusSm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rowCard: { borderWidth: 1, borderRadius: space.radius, minHeight: 48, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  /* Una barra de 6 px de alto no necesita contorno; el contraste lo da el color del riel. */
  progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  stageCard: { borderWidth: 1, borderRadius: space.radius, padding: space.cardPad, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  stageCheckCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconShieldCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  /* El único contorno dorado que se conserva en el archivo, y a propósito: acá el borde ES el
     contenido —es el canto de un documento que se firma—, no un adorno para destacar la tarjeta.
     En la vista de video, que reusa este estilo, el JSX lo pasa a `c.border`. */
  pactoDocumentCard: { borderWidth: 1, borderRadius: space.radius, padding: space.cardPad, gap: 12 },
  /* Perdió su borde: adentro vive el lienzo de firma, que tiene el suyo. Eran dos recuadros
     concéntricos para pedir una sola firma.
     `signatureCanvas` se fue con la maqueta: el recuadro lo dibuja ahora el `canvasBox` del
     propio `SignatureCanvas`, con su alto real de 145 en vez de los 80 de adorno que había acá. */
  signatureBox: { alignItems: 'center', gap: 10, width: '100%' },
  /** Era de 25 px de alto (paddingVertical 6) con texto de 10.5. Ahora es un botón de verdad. */
  createHabitBtn: { borderRadius: space.radiusSm, paddingHorizontal: 16, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  evidenceCard: { borderWidth: 1, borderRadius: space.radius, padding: 14, gap: 4 },
  evidenceImgBox: { width: '100%', height: 84, borderRadius: space.radiusSm, alignItems: 'center', justifyContent: 'center' },
  logroCard: { borderWidth: 1, borderRadius: space.radius, padding: space.cardPad, flexDirection: 'row', alignItems: 'center', gap: 14 },
  logroIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  momentSwitchBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  goalCard: { borderWidth: 1.5, borderRadius: 18, padding: 14 },
  /* Campo de formulario: el borde se queda (es afordancia). Lo que cambió es el tamaño — 12 px
     estaba por debajo del mínimo de input de AGENTS.md §4 (14–15.5) — y la altura, que con
     `paddingVertical: 8` daba unos 34 px y ahora llega a 48. */
  modalInputText: { borderWidth: 1, borderRadius: space.radiusSm, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, fontSize: 15 },
});
