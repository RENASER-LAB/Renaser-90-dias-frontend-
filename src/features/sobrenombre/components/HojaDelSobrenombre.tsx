import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { GoldButton } from '../../../components/GoldButton';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Presionable } from '../../../components/Presionable';
import { AvatarPersona } from '../../../components/ui';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { ApiError } from '../../../services/http/apiClient';
import { tacto } from '../../../utils/tacto';
import { useAuth } from '../../auth/context/AuthContext';
import { elegirSobrenombre, quitarMiSobrenombre, type MiSobrenombre } from '../api/sobrenombreApi';
import { MAXIMO, MENSAJE_DEL_PROBLEMA, TEXTOS_DEL_SOBRENOMBRE as T, problemaDeLaForma, textoDeLaEspera } from '../utils/reglasDelSobrenombre';

/**
 * Spec 046: la hoja para elegir, cambiar o quitar el sobrenombre en el Muro. El campo con su contador, una vista previa de cómo se
 * verá en una publicación, «Guardar» y, si ya tiene uno, «Volver a mi nombre». Lo que dice que falta va bajo el campo (sin diálogos).
 */
export function HojaDelSobrenombre({
  visible,
  mio,
  alCerrar,
  alGuardar,
}: {
  visible: boolean;
  mio: MiSobrenombre | null;
  alCerrar: () => void;
  /** Lo que respondió el servidor, para que Hoy y Yo queden al día. */
  alGuardar: (nuevo: MiSobrenombre) => void;
}) {
  const { c, t } = useTheme();
  const { user } = useAuth();
  const [texto, setTexto] = useState(mio?.sobrenombre ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState<string | null>(null);
  const enVuelo = useRef(false);

  useEffect(() => {
    if (visible) {
      setTexto(mio?.sobrenombre ?? '');
      setError(null);
    }
  }, [visible, mio?.sobrenombre]);

  const espera = textoDeLaEspera(mio?.puedeCambiarDesde ?? null);
  const limpio = texto.trim();
  const problema = limpio ? problemaDeLaForma(limpio) : null;
  const sinCambios = limpio === (mio?.sobrenombre ?? '');
  const puedeGuardar = !!limpio && !problema && !sinCambios && !espera && !guardando;

  const guardar = async () => {
    if (enVuelo.current) return;
    if (!limpio || problema) {
      setError(MENSAJE_DEL_PROBLEMA[problema ?? 'largo']);
      tacto.error();
      return;
    }
    enVuelo.current = true;
    setGuardando(true);
    try {
      const nuevo = await elegirSobrenombre(limpio);
      tacto.logro();
      setListo(T.listo(nuevo.sobrenombre ?? limpio));
      alGuardar(nuevo);
    } catch (e) {
      tacto.error();
      setError(e instanceof ApiError && e.message ? e.message : 'No pudimos guardarlo. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      enVuelo.current = false;
      setGuardando(false);
    }
  };

  const quitar = async () => {
    if (enVuelo.current) return;
    enVuelo.current = true;
    setGuardando(true);
    try {
      const nuevo = await quitarMiSobrenombre();
      tacto.logro();
      setListo(T.quitado);
      alGuardar(nuevo);
    } catch (e) {
      setError(e instanceof ApiError && e.message ? e.message : 'No pudimos quitarlo. Inténtalo de nuevo.');
    } finally {
      enVuelo.current = false;
      setGuardando(false);
    }
  };

  const nombreDeLaVista = limpio && !problema ? limpio : (mio?.sobrenombre ?? user?.name ?? '');

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={alCerrar}
      titulo={T.hojaTitulo}
      etiquetaCerrar="Cerrar"
      pie={<GoldButton label={guardando ? 'Guardando…' : T.guardar} onPress={() => void guardar()} disabled={!puedeGuardar} />}
    >
      <Text style={[t.body, { color: c.textSoft, fontSize: 15, marginBottom: 14 }]}>{T.ayuda}</Text>
      <View
        style={[
          estilos.campo,
          { borderColor: error ? c.danger : c.gold, backgroundColor: c.cardBg },
        ]}
      >
        <TextInput
          value={texto}
          onChangeText={v => {
            setTexto(v);
            setError(null);
          }}
          placeholder={T.ejemplo}
          placeholderTextColor={c.textSoft}
          maxLength={MAXIMO + 5}
          editable={!espera}
          autoCapitalize="words"
          autoCorrect={false}
          accessibilityLabel="Tu sobrenombre"
          style={[t.body, estilos.entrada, { color: c.textStrong }]}
        />
        <Text style={[t.small, { color: limpio.length > MAXIMO ? c.danger : c.textSoft, fontVariant: ['tabular-nums'] }]}>
          {`${limpio.length} / ${MAXIMO}`}
        </Text>
      </View>
      {error ? (
        <Text style={[t.body, { color: c.danger, fontSize: 15, marginTop: 6 }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      {espera ? <Text style={[t.body, { color: c.textSoft, fontSize: 15, marginTop: 6 }]}>{espera}</Text> : null}
      {listo ? <ConfirmacionEnLinea texto={listo} onTerminar={() => setListo(null)} /> : null}

      <Text style={[t.small, { color: c.textSoft, fontFamily: fuentes.negrita, marginTop: 18, marginBottom: 8 }]}>{T.asiSeVera}</Text>
      <View style={[estilos.vista, { borderColor: c.border, backgroundColor: c.cardBg }]} testID="vista-previa-del-sobrenombre">
        <AvatarPersona nombre={nombreDeLaVista} avatarUrl={user?.avatarUrl} size={40} />
        <View style={{ flexShrink: 1 }}>
          <Text numberOfLines={1} style={[t.cardTitle, { color: c.textStrong, fontSize: 16 }]}>
            {nombreDeLaVista}
          </Text>
          <Text style={[t.small, { color: c.textSoft }]}>Ahora</Text>
        </View>
      </View>

      {mio?.sobrenombre ? (
        <Presionable onPress={() => void quitar()} accessibilityRole="button" style={estilos.quitar} disabled={guardando}>
          <Text style={[t.body, { color: c.textSoft, fontFamily: fuentes.seminegrita, fontSize: 16 }]}>{T.quitar}</Text>
        </Presionable>
      ) : null}
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  campo: { minHeight: 52, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  entrada: { flex: 1, fontSize: 16, paddingVertical: 12 },
  vista: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, padding: 12 },
  quitar: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
});
