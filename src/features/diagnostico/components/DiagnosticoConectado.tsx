import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton } from '../../../components/GoldButton';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { ApiError } from '../../../services/http/apiClient';
import { useTheme } from '../../../theme/ThemeContext';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { useAuth } from '../../auth/context/AuthContext';
import { avanzarEstado } from '../../onboarding/api/onboardingApi';
import { MarcoDePaso } from '../../onboarding/components/MarcoDePaso';
import { abrirMiDiagnostico, guardarRespuestasDelDiagnostico, terminarMiDiagnostico } from '../api/diagnosticoApi';
import { avisarDiagnosticoTerminado } from '../events/avisoDiagnosticoTerminado';
import type { DiagnosticoParaLaPersona, RespuestaDelDiagnostico, ResultadoDeTerminar } from '../types/diagnostico.types';
import { NO_SE_PUDO_CARGAR_EL_DIAGNOSTICO, SIN_DIAGNOSTICO_DISPONIBLE } from '../utils/textosDelDiagnostico';
import { RecorridoDelDiagnostico } from './RecorridoDelDiagnostico';

/**
 * El diagnóstico de la persona conectado al servidor (spec 026): lo abre (`GET /diagnostico/mio`), guarda cada paso y lo termina.
 * `RecorridoDelDiagnostico` no sabe de red; acá se le ponen las tres funciones y se resuelve lo que pasa ANTES de que haya
 * recorrido: cargando, «todavía no tienes un diagnóstico» (404), «ya lo terminaste» (409) y fallos de red.
 *
 * - **404** (no lo tiene asignado, o no hay versión publicada): lo dice, con «Reintentar» y una salida.
 * - **409** (ya lo terminó, p. ej. desde otro teléfono): no hay nada más que hacer acá; avisa con `onTerminado` y la pantalla de
 *   arriba sigue su camino.
 * - **Guardar un paso** manda las respuestas y, después, mueve el cursor de reanudación (`PUT /onboarding/state`,
 *   `flow: diagnostico`, `step`). Las respuestas son lo que importa: si el servidor rechaza solo el cursor, el paso se da por
 *   guardado (retomar volvería unos pasos atrás, con todo lo respondido) en vez de dejar a la persona sin poder avanzar.
 */

type Carga =
  | { tipo: 'cargando' }
  | { tipo: 'listo'; datos: DiagnosticoParaLaPersona }
  | { tipo: 'no_disponible' }
  | { tipo: 'error' };

export interface DiagnosticoConectadoProps {
  /** Salir sin terminar: «Salir» de la portada y de las pantallas de aviso. */
  onSalir: () => void;
  /** Ya lo terminó (al «Continuar» del cierre, o si el servidor dice que ya lo había terminado). */
  onTerminado: () => void;
  /** Con él, las pantallas de aviso llevan arriba la cabecera «‹ <título>» de las demás pantallas de Yo. */
  tituloDeLaCabecera?: string;
  textoQueSigue: string;
  etiquetaContinuar?: string;
}

export function DiagnosticoConectado({
  onSalir,
  onTerminado,
  tituloDeLaCabecera,
  textoQueSigue,
  etiquetaContinuar,
}: DiagnosticoConectadoProps) {
  const { c, t } = useTheme();
  const { user } = useAuth();
  const [carga, setCarga] = useState<Carga>({ tipo: 'cargando' });
  const [intento, setIntento] = useState(0);

  /* Quien nos usa puede pasar una función nueva en cada render; lo que corre después de un `await` usa siempre la última. */
  const alTerminar = useRef(onTerminado);
  alTerminar.current = onTerminado;

  useEffect(() => {
    let vigente = true;
    setCarga({ tipo: 'cargando' });
    (async () => {
      try {
        const datos = await abrirMiDiagnostico();
        if (vigente) setCarga(datos ? { tipo: 'listo', datos } : { tipo: 'error' });
      } catch (e) {
        if (!vigente) return;
        if (e instanceof ApiError && e.status === 409) alTerminar.current();
        else setCarga(e instanceof ApiError && e.status === 404 ? { tipo: 'no_disponible' } : { tipo: 'error' });
      }
    })();
    return () => {
      vigente = false;
    };
  }, [intento]);

  /* Las pantallas de aviso (cargando, 404, error) tienen su propio atrás; la del recorrido, el suyo. */
  useSystemBackHandler(() => {
    onSalir();
    return true;
  }, carga.tipo !== 'listo');

  const guardarPaso = useCallback(async (respuestas: RespuestaDelDiagnostico[], indiceDePaso: number) => {
    try {
      await guardarRespuestasDelDiagnostico(respuestas);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) alTerminar.current();
      throw e;
    }
    try {
      await avanzarEstado({ flow: 'diagnostico', step: indiceDePaso });
    } catch (e) {
      console.warn('No se pudo anotar el paso del diagnóstico en el que vas:', e);
    }
  }, []);

  /* Al terminar de verdad, Hoy y Yo dejan de ofrecerlo en el acto (el aviso no depende de que se pulse «Continuar»). */
  const terminar = useCallback(async (): Promise<ResultadoDeTerminar> => {
    const resultado = await terminarMiDiagnostico();
    avisarDiagnosticoTerminado();
    return resultado;
  }, []);

  if (carga.tipo === 'listo') {
    return (
      <RecorridoDelDiagnostico
        datos={carga.datos}
        modo="persona"
        usuarioId={user?.id}
        onGuardarPaso={guardarPaso}
        onTerminar={terminar}
        onSalir={onSalir}
        onContinuar={() => alTerminar.current()}
        textoQueSigue={textoQueSigue}
        etiquetaContinuar={etiquetaContinuar}
      />
    );
  }

  if (carga.tipo === 'cargando') {
    return (
      <SafeAreaView style={[estilos.raiz, { backgroundColor: c.bg }]}>
        {tituloDeLaCabecera ? <CabeceraAdmin titulo={tituloDeLaCabecera} onVolver={onSalir} /> : null}
        <View style={estilos.centro}>
          <ActivityIndicator color={c.goldInk} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const cuerpo = (
    <Text accessibilityLiveRegion="polite" style={[t.body, estilos.mensaje, { color: c.text }]}>
      {carga.tipo === 'no_disponible' ? SIN_DIAGNOSTICO_DISPONIBLE : NO_SE_PUDO_CARGAR_EL_DIAGNOSTICO}
    </Text>
  );
  const reintentar = <GoldButton label="REINTENTAR" onPress={() => setIntento(n => n + 1)} />;

  if (tituloDeLaCabecera) {
    return (
      <SafeAreaView style={[estilos.raiz, { backgroundColor: c.bg }]}>
        <CabeceraAdmin titulo={tituloDeLaCabecera} onVolver={onSalir} />
        <View style={estilos.aviso}>
          {cuerpo}
          {reintentar}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <MarcoDePaso alVolver={onSalir} etiquetaVolver="Salir" accesibilidadVolver="Salir del diagnóstico" claveContenido={carga.tipo} pie={reintentar}>
      {cuerpo}
    </MarcoDePaso>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  aviso: { paddingHorizontal: 20, paddingTop: 24, gap: 24 },
  mensaje: { fontSize: 17, lineHeight: 25 },
});
