import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { Alert } from '../../../components/Alerta';
import { mensajeDeError } from '../../../services/http/apiClient';
import {
  AlmacenamientoSinConfigurarError,
  completarRegistro,
  subirEvidenciaDeArchivo,
} from '../api/evidenciaHabitoApi';
import { obtenerTracksDeHoy } from '../api/habitsApi';
import { fotoPendiente } from '../storage/fotoPendiente';
import { archivoDeResultadoDeCamara, tomarFotoConCamara, type ArchivoEvidencia } from '../utils/capturarEvidencia';
import {
  avisoParaFoto,
  estadoParaFoto,
  registrarConFoto,
  type DependenciasDelRegistro,
  type EstadoParaFoto,
  type ResultadoDelRegistro,
} from '../utils/registroConFoto';

/** Qué registro se quiere cerrar con foto. `registroId` es el id del track del día (`habit-tracks`). */
export type SolicitudDeFoto = {
  registroId: string;
  titulo: string;
  /** Solo en los rituales se pregunta "¿Qué sentiste?"; en los demás, foto y se registra solo (D-172). */
  conPregunta: boolean;
};

/** La pantalla partida abierta: la foto de arriba y la respuesta de abajo. */
export type RegistroConFotoAbierto = SolicitudDeFoto & {
  /** `null` solo cuando la evidencia ya estaba subida de antes (no hay foto local que mostrar). */
  archivo: ArchivoEvidencia | null;
  evidenciaYaSubida: boolean;
};

/** Cómo terminó el toque. Las tarjetas del chat y del orbe se actualizan con esto. */
export type ResultadoDeInicio = 'abierto' | 'cancelado' | 'ocupado' | Exclude<EstadoParaFoto['tipo'], 'disponible'>;

export type OpcionesRegistroConFoto = {
  /** El backend ya cerró el registro. Los puntos son los que devolvió él, nunca un número local. */
  onCompletado: (registroId: string, resultado: ResultadoDelRegistro, titulo: string) => void | Promise<void>;
  /** El registro no era de hoy (pantalla abierta de un día para otro): hay que recargar. */
  onDiaCambiado?: () => void;
};

/** Lo que `RegistroConFotoModal` necesita. Se pasa entero: `<RegistroConFotoModal {...r.modal} />`. */
export type PropsRegistroConFotoModal = {
  registro: RegistroConFotoAbierto | null;
  respuesta: string;
  enviando: boolean;
  error: string | null;
  onCambiarRespuesta: (texto: string) => void;
  onRetomarFoto: () => void;
  onTerminar: () => void;
  onCerrar: () => void;
};

const DEPENDENCIAS: DependenciasDelRegistro = {
  subirEvidencia: subirEvidenciaDeArchivo,
  completar: completarRegistro,
  tracksDeHoy: obtenerTracksDeHoy,
};

/**
 * iOS: el picker de la cámara se cierra con animación y la promesa resuelve ANTES de que termine.
 * Presentar un `Modal` de React Native en ese instante choca con la animación y el modal no
 * aparece. Se espera a que la cámara termine de irse.
 */
const ESPERA_CIERRE_CAMARA_IOS_MS = 650;

function esperarCierreDeLaCamara(): Promise<void> {
  if (Platform.OS !== 'ios') return Promise.resolve();
  return new Promise(resolver => setTimeout(resolver, ESPERA_CIERRE_CAMARA_IOS_MS));
}

function mensajeDelFallo(error: unknown): string {
  if (error instanceof AlmacenamientoSinConfigurarError) {
    return 'El servidor todavía no puede guardar fotos. Avísale al equipo técnico; tu foto y tu respuesta siguen acá.';
  }
  return mensajeDeError(error, 'No se pudo registrar. Tu foto y tu respuesta siguen acá: intenta de nuevo.');
}

/**
 * El REGISTRO CON FOTO de los hábitos que exigen evidencia (pedido del dueño, 2026-09-26): tocar
 * abre la cámara directo; con la foto tomada se abre la pantalla partida con "¿Qué sentiste?", y
 * al terminar se sube la foto y se cierra el registro con esa respuesta.
 *
 * Un solo hook para los tres lugares que lo disparan —Training, la tarjeta del chat y la hoja del
 * orbe— y un solo componente (`RegistroConFotoModal`), para que los tres suban por el mismo código.
 *
 * Casos que cubre (el dueño pidió "ver todos los casos de bugs"):
 * - **Doble toque:** una ref, no un estado: dos toques en el mismo frame no abren dos cámaras.
 * - **Día viejo:** antes de abrir la cámara se consulta `GET /habit-tracks/today`. Si el registro
 *   ya no es de hoy, está completado o venció, se avisa y la cámara no se abre.
 * - **Reintento sin duplicar:** si la evidencia ya quedó confirmada (en esta pantalla o en un
 *   intento anterior, según el servidor), reintentar solo cierra el registro.
 * - **Sin red:** el error se muestra y la foto y la respuesta se conservan.
 * - **Android mata la app con la cámara abierta:** `reanudarPendiente` la recupera al volver.
 */
export function useRegistroConFoto(opciones: OpcionesRegistroConFoto) {
  const [registro, setRegistro] = useState<RegistroConFotoAbierto | null>(null);
  const [respuesta, setRespuesta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ocupadoRef = useRef(false);
  const registroRef = useRef<RegistroConFotoAbierto | null>(null);
  registroRef.current = registro;
  const opcionesRef = useRef(opciones);
  opcionesRef.current = opciones;

  const abrir = useCallback((abierto: RegistroConFotoAbierto) => {
    setRespuesta('');
    setError(null);
    setEnviando(false);
    // La ref se adelanta al render: un toque que llegue antes de que React pinte ya lo ve abierto.
    registroRef.current = abierto;
    setRegistro(abierto);
  }, []);

  /** Estado FRESCO del registro, justo antes de abrir la cámara. */
  const verificar = useCallback(
    async (registroId: string, pistaEvidencia: boolean): Promise<EstadoParaFoto> => {
      // En web la cámara solo se abre si se llama "enseguida" después del toque: esperar una
      // consulta de red haría que el navegador la bloquee en silencio. Ahí se confía en el
      // manejo de errores del envío.
      if (Platform.OS === 'web') return { tipo: 'disponible', evidenciaYaSubida: pistaEvidencia };
      try {
        return estadoParaFoto(await obtenerTracksDeHoy(), registroId, Date.now());
      } catch {
        // Sin red no se bloquea: el envío va a fallar con un mensaje claro y la foto se conserva.
        return { tipo: 'disponible', evidenciaYaSubida: pistaEvidencia };
      }
    },
    [],
  );

  const avisarSiNoSePuede = useCallback((estado: EstadoParaFoto): boolean => {
    const aviso = avisoParaFoto(estado);
    if (!aviso) return false;
    Alert.alert(aviso.titulo, aviso.mensaje);
    if (estado.tipo === 'no-es-de-hoy') opcionesRef.current.onDiaCambiado?.();
    return true;
  }, []);

  const sacarFoto = useCallback(async (solicitud: SolicitudDeFoto): Promise<ArchivoEvidencia | null> => {
    if (Platform.OS === 'android') await fotoPendiente.guardar(solicitud);
    try {
      return await tomarFotoConCamara();
    } finally {
      if (Platform.OS === 'android') await fotoPendiente.borrar();
    }
  }, []);

  /**
   * Toque sobre un hábito (o sobre "Tomar foto" en el chat o el orbe). `evidenciaYaSubida` es la
   * pista de quien llama (p. ej. `hasEvidence` de Training) para cuando no se puede consultar.
   */
  const iniciar = useCallback(
    async (solicitud: SolicitudDeFoto, evidenciaYaSubida = false): Promise<ResultadoDeInicio> => {
      if (ocupadoRef.current || registroRef.current) return 'ocupado';
      ocupadoRef.current = true;
      try {
        const estado = await verificar(solicitud.registroId, evidenciaYaSubida);
        if (estado.tipo !== 'disponible') {
          avisarSiNoSePuede(estado);
          return estado.tipo;
        }
        if (estado.evidenciaYaSubida) {
          // La foto ya está en el servidor de un intento anterior: no se pide otra (duplicaría la
          // evidencia). Solo falta la respuesta y el cierre.
          abrir({ ...solicitud, archivo: null, evidenciaYaSubida: true });
          return 'abierto';
        }
        const archivo = await sacarFoto(solicitud);
        if (!archivo) return 'cancelado';
        await esperarCierreDeLaCamara();
        abrir({ ...solicitud, archivo, evidenciaYaSubida: false });
        return 'abierto';
      } finally {
        ocupadoRef.current = false;
      }
    },
    [abrir, avisarSiNoSePuede, sacarFoto, verificar],
  );

  /** "Tomar otra" desde la pantalla partida. La respuesta escrita no se pierde. */
  const retomarFoto = useCallback(async () => {
    const actual = registroRef.current;
    if (!actual || actual.evidenciaYaSubida || ocupadoRef.current || enviando) return;
    ocupadoRef.current = true;
    try {
      const archivo = await sacarFoto(actual);
      if (archivo) {
        setError(null);
        setRegistro(previo => (previo && previo.registroId === actual.registroId ? { ...previo, archivo } : previo));
      }
    } finally {
      ocupadoRef.current = false;
    }
  }, [enviando, sacarFoto]);

  const terminar = useCallback(async () => {
    const actual = registroRef.current;
    if (!actual || ocupadoRef.current) return;
    ocupadoRef.current = true;
    setEnviando(true);
    setError(null);
    try {
      const resultado = await registrarConFoto(
        { ...actual, respuesta },
        // Desde acá un reintento solo cierra: volver a subir duplicaría la evidencia.
        () => setRegistro(previo => (previo ? { ...previo, evidenciaYaSubida: true } : previo)),
        DEPENDENCIAS,
      );
      setRegistro(null);
      setRespuesta('');
      await opcionesRef.current.onCompletado(actual.registroId, resultado, actual.titulo);
    } catch (e) {
      setError(mensajeDelFallo(e));
    } finally {
      ocupadoRef.current = false;
      setEnviando(false);
    }
  }, [respuesta]);

  /**
   * Sin pregunta (todo lo que no es ritual, D-172) no hay nada que escribir: apenas la foto está en
   * pantalla se registra sola. Una vez por foto: si falla, queda el error y el botón de reintentar,
   * sin volver a mandarla en cada render.
   */
  const autoEnviadoRef = useRef<string | null>(null);
  useEffect(() => {
    if (!registro || registro.conPregunta || enviando || error) return;
    const clave = `${registro.registroId}:${registro.archivo?.uri ?? 'ya-subida'}`;
    if (autoEnviadoRef.current === clave) return;
    autoEnviadoRef.current = clave;
    void terminar();
  }, [registro, enviando, error, terminar]);

  const cerrar = useCallback(() => {
    if (enviando) return;
    setRegistro(null);
    setRespuesta('');
    setError(null);
  }, [enviando]);

  /**
   * Android mató la app con la cámara abierta y la volvió a abrir: la foto está en
   * `getPendingResultAsync` y el registro para el que era, en `fotoPendiente`. Best-effort: si
   * falta cualquiera de las dos cosas, no se hace nada (la persona vuelve a tocar el hábito).
   */
  const reanudarPendiente = useCallback(async () => {
    if (Platform.OS !== 'android' || ocupadoRef.current || registroRef.current) return;
    ocupadoRef.current = true;
    try {
      const pendiente = await ImagePicker.getPendingResultAsync().catch(() => null);
      const contexto = await fotoPendiente.tomar(Date.now());
      if (!pendiente || !contexto || !('canceled' in pendiente)) return;
      const archivo = await archivoDeResultadoDeCamara(pendiente);
      if (!archivo) return;
      const estado = await verificar(contexto.registroId, false);
      if (avisarSiNoSePuede(estado)) return;
      abrir({
        registroId: contexto.registroId,
        titulo: contexto.titulo,
        conPregunta: contexto.conPregunta,
        archivo,
        evidenciaYaSubida: estado.tipo === 'disponible' && estado.evidenciaYaSubida,
      });
    } finally {
      ocupadoRef.current = false;
    }
  }, [abrir, avisarSiNoSePuede, verificar]);

  const modal: PropsRegistroConFotoModal = {
    registro,
    respuesta,
    enviando,
    error,
    onCambiarRespuesta: setRespuesta,
    onRetomarFoto: () => void retomarFoto(),
    onTerminar: () => void terminar(),
    onCerrar: cerrar,
  };

  return { iniciar, reanudarPendiente, abierto: registro !== null, cerrar, modal };
}
