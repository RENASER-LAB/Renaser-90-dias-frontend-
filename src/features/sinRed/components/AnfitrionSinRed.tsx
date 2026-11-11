import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import { fuentes } from '../../../theme/fuentes';
import { useAuth } from '../../auth/context/AuthContext';
// El manejador del envío de un hábito marcado sin señal se registra al importar este módulo.
import '../../habits/api/evidenciaHabitoApi';
// Spec 048 fase 2: el de la publicación del Muro escrita sin señal.
import '../../community/api/publicarSinRed';
// El de la Pastilla Renacer entregada sin señal.
import '../../spirit/api/pastillaSinRed';
// Fase 3: el de las escrituras genéricas (`escritura`) y el de marcar una acción del Plan (`completarAccion`); la cola las manda con
// sus tres cabeceras. Los ajustes de lectura de cada área se registran al importar su API (cierre, radar, plan y hábitos).
import '../escrituraSinRed';
import '../../objetivos/api/planSinRed';
import { leerAvisos, suscribirAvisos, type AvisoDeLoNoAplicado } from '../avisosDeLoNoAplicado';
import { leerCola, ponerCuentaActual, procesarCola, suscribirCola } from '../colaSinRed';
import { alVolverLaConexion, sinConexionDesdeMs, suscribirConexion } from '../estadoDeConexion';
import { cargarAnclaGuardada } from '../horaReal';
import { cargarAudiosGuardados } from '../audiosDelDia';
import { textoDeLosAvisosDelGlobo } from '../utils/textoDeLosAvisos';
import { textoDelGlobo } from '../utils/textoDelGlobo';

/**
 * Spec 048 (FR-006, FR-007): procesa la cola de lo hecho sin señal (al entrar, al volver al frente, al volver la señal y cada
 * minuto) y muestra el ícono discreto mientras no hay señal o queda algo por enviar. Al tocarlo, un globo corto (D4).
 */
const CADA_MS = 60_000;
const GLOBO_MS = 4_000;

export function AnfitrionSinRed() {
  const { user } = useAuth();
  const cuentaId = user?.id ?? null;
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [desde, setDesde] = useState<number | null>(sinConexionDesdeMs());
  const [pendientes, setPendientes] = useState(0);
  const [globo, setGlobo] = useState(false);
  /** Lo que no se aplicó y todavía no se vio (fase 3, P9): se sigue contando en el globo hasta que la hoja de Hoy lo muestre. */
  const [avisos, setAvisos] = useState<AvisoDeLoNoAplicado[]>([]);

  useEffect(() => {
    ponerCuentaActual(cuentaId);
    void cargarAnclaGuardada();
    void cargarAudiosGuardados();
    if (!cuentaId) {
      setPendientes(0);
      return;
    }
    let vigente = true;
    const contar = () => void leerCola(cuentaId).then(cola => vigente && setPendientes(cola.length));
    const enviar = async (adelantar: boolean) => {
      await procesarCola(cuentaId, Date.now(), { adelantar });
      contar();
    };
    void enviar(false);
    const quitarCola = suscribirCola(contar);
    const quitarVuelta = alVolverLaConexion(() => void enviar(true));
    const app = AppState.addEventListener('change', estado => {
      if (estado === 'active') void enviar(true);
    });
    const reloj = setInterval(() => void enviar(false), CADA_MS);
    return () => {
      vigente = false;
      quitarCola();
      quitarVuelta();
      app.remove();
      clearInterval(reloj);
    };
  }, [cuentaId]);

  useEffect(() => suscribirConexion(() => setDesde(sinConexionDesdeMs())), []);

  useEffect(() => {
    if (!cuentaId) {
      setAvisos([]);
      return;
    }
    let vigente = true;
    const leer = () => void leerAvisos(cuentaId).then(lista => vigente && setAvisos(lista));
    leer();
    const quitar = suscribirAvisos(leer);
    return () => {
      vigente = false;
      quitar();
    };
  }, [cuentaId]);

  useEffect(() => {
    if (!globo) return;
    const t = setTimeout(() => setGlobo(false), GLOBO_MS);
    return () => clearTimeout(t);
  }, [globo]);

  if (!cuentaId || (desde === null && pendientes === 0 && avisos.length === 0)) return null;
  const texto = textoDelGlobo(desde, pendientes, new Date(), textoDeLosAvisosDelGlobo(avisos));

  return (
    <View pointerEvents="box-none" style={[estilos.capa, { top: insets.top + 4 }]}>
      <Presionable
        accessibilityRole="button"
        accessibilityLabel={texto}
        hitSlop={8}
        onPress={() => setGlobo(v => !v)}
        style={[estilos.icono, { backgroundColor: c.cardBg, borderColor: c.border }]}
      >
        <Icon name="cloudOff" size={16} color={c.textSoft} />
      </Presionable>
      {globo ? (
        <View style={[estilos.globo, { backgroundColor: c.cardBg, borderColor: c.border }]}>
          <Text style={[estilos.texto, { color: c.textStrong }]}>{texto}</Text>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  // Al centro de arriba (E2E 09/11): a la derecha tapaba el botón de planificar de Entrenar y otros de las esquinas.
  capa: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  icono: { width: 32, height: 32, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', opacity: 0.9 },
  globo: { marginTop: 6, maxWidth: 260, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  texto: { fontFamily: fuentes.media, fontSize: 13, lineHeight: 18 },
});
