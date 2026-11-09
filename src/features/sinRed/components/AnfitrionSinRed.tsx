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
import { adelantarReintentos, leerCola, ponerCuentaActual, procesarCola, suscribirCola } from '../colaSinRed';
import { alVolverLaConexion, sinConexionDesdeMs, suscribirConexion } from '../estadoDeConexion';
import { cargarAnclaGuardada } from '../horaReal';
import { cargarAudiosGuardados } from '../audiosDelDia';
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
      if (adelantar) await adelantarReintentos(cuentaId);
      await procesarCola(cuentaId);
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
    if (!globo) return;
    const t = setTimeout(() => setGlobo(false), GLOBO_MS);
    return () => clearTimeout(t);
  }, [globo]);

  if (!cuentaId || (desde === null && pendientes === 0)) return null;

  return (
    <View pointerEvents="box-none" style={[estilos.capa, { top: insets.top + 4 }]}>
      <Presionable
        accessibilityRole="button"
        accessibilityLabel={textoDelGlobo(desde, pendientes)}
        hitSlop={8}
        onPress={() => setGlobo(v => !v)}
        style={[estilos.icono, { backgroundColor: c.cardBg, borderColor: c.border }]}
      >
        <Icon name="cloudOff" size={16} color={c.textSoft} />
      </Presionable>
      {globo ? (
        <View style={[estilos.globo, { backgroundColor: c.cardBg, borderColor: c.border }]}>
          <Text style={[estilos.texto, { color: c.textStrong }]}>{textoDelGlobo(desde, pendientes)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  capa: { position: 'absolute', right: 12, alignItems: 'flex-end', zIndex: 50 },
  icono: { width: 32, height: 32, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', opacity: 0.9 },
  globo: { marginTop: 6, maxWidth: 260, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  texto: { fontFamily: fuentes.media, fontSize: 13, lineHeight: 18 },
});
