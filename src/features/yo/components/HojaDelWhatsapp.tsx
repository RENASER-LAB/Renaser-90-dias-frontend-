import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { PhoneCountryInput } from '../../../components/PhoneCountryInput';
import { Presionable } from '../../../components/Presionable';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { CodigoOtpInput, LARGO_CODIGO } from '../../auth/components/CodigoOtpInput';
import { SEGUNDOS_PARA_OFRECER_WHATSAPP } from '../../auth/utils/codigoPorWhatsApp';
import { confirmarWhatsapp, pedirCodigoDelWhatsapp } from '../api/whatsappConfirmadoApi';
import {
  NUMERO_INICIAL,
  TEXTOS_DEL_WHATSAPP as T,
  mensajeDelError,
  numeroParaElServidor,
} from '../utils/whatsappConfirmado';

type Paso = 'numero' | 'codigo' | 'listo';

/**
 * Spec 051: la hoja de Yo → «WhatsApp». Tres pasos en la misma hoja: el número (con el país, +51 por defecto) → «Enviar código» → las seis casillas →
 * «Confirmar» → «Listo». El número solo se guarda en el servidor cuando el código es el bueno.
 *
 * - **Un toque, un pedido**: el botón se apaga mientras viaja y un doble toque no manda dos (`enVuelo`).
 * - **El motivo del servidor se muestra** bajo el campo (código incorrecto, número en uso, 429…), sin diálogos.
 * - **Volver** (la ‹ y el atrás de Android) regresa del código al número; la ✕, el fondo y el arrastre cierran la hoja.
 * - Al confirmar, `alConfirmar` hace que Yo relea el estado del servidor.
 */
export function HojaDelWhatsapp({
  visible,
  confirmado,
  alCerrar,
  alConfirmar,
}: {
  visible: boolean;
  /** El número ya confirmado, enmascarado, o `null`. */
  confirmado: string | null;
  alCerrar: () => void;
  alConfirmar: () => void;
}) {
  const { c, t } = useTheme();
  const [paso, setPaso] = useState<Paso>('numero');
  const [numero, setNumero] = useState(NUMERO_INICIAL);
  const [codigo, setCodigo] = useState('');
  const [enmascarado, setEnmascarado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const enVuelo = useRef(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    setPaso('numero');
    setNumero(NUMERO_INICIAL);
    setCodigo('');
    setEnmascarado(null);
    setError(null);
    setSegundos(0);
  }, [visible]);

  useEffect(() => {
    if (segundos <= 0) return undefined;
    const id = setTimeout(() => setSegundos(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [segundos]);

  const numeroListo = numeroParaElServidor(numero);

  /** Pide el código (la primera vez y al reenviar). Lo que falla se dice bajo el campo. */
  const enviar = useCallback(async () => {
    if (enVuelo.current) return;
    if (!numeroListo) {
      setError(T.numeroInvalido);
      tacto.error();
      return;
    }
    enVuelo.current = true;
    setEnviando(true);
    setError(null);
    try {
      const a = await pedirCodigoDelWhatsapp(numeroListo);
      setEnmascarado(a);
      setCodigo('');
      setSegundos(SEGUNDOS_PARA_OFRECER_WHATSAPP);
      setPaso('codigo');
    } catch (e) {
      tacto.error();
      setError(mensajeDelError(e));
    } finally {
      enVuelo.current = false;
      setEnviando(false);
    }
  }, [numeroListo]);

  const confirmar = useCallback(async () => {
    if (enVuelo.current) return;
    if (!numeroListo || codigo.length !== LARGO_CODIGO) {
      setError(T.codigoIncompleto);
      tacto.error();
      return;
    }
    enVuelo.current = true;
    setEnviando(true);
    setError(null);
    try {
      const a = await confirmarWhatsapp(numeroListo, codigo);
      tacto.logro();
      setEnmascarado(a ?? enmascarado);
      setPaso('listo');
      alConfirmar();
    } catch (e) {
      tacto.error();
      setError(mensajeDelError(e));
    } finally {
      enVuelo.current = false;
      setEnviando(false);
    }
  }, [alConfirmar, codigo, enmascarado, numeroListo]);

  const volver = paso === 'codigo' ? () => { setPaso('numero'); setCodigo(''); setError(null); } : undefined;

  const pie =
    paso === 'numero' ? (
      <GoldButton label={enviando ? T.enviando : T.enviar} onPress={() => void enviar()} disabled={enviando || !numeroListo} />
    ) : paso === 'codigo' ? (
      <GoldButton label={enviando ? T.confirmando : T.confirmar} onPress={() => void confirmar()} disabled={enviando || codigo.length !== LARGO_CODIGO} />
    ) : (
      <GoldButton label={T.listo} onPress={alCerrar} />
    );

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={alCerrar}
      alVolver={volver}
      etiquetaVolver="Volver al número"
      titulo={T.hojaTitulo}
      etiquetaCerrar="Cerrar"
      pie={pie}
    >
      <View style={estilos.cuerpo} testID="cuerpo-de-la-hoja-del-whatsapp">
        {paso === 'numero' ? (
          <>
            <Text style={[t.body, estilos.ayuda, { color: c.textSoft }]}>{T.ayuda}</Text>
            {confirmado ? (
              <Text style={[t.small, estilos.actual, { color: c.textSoft }]}>{`Ahora: ${confirmado}`}</Text>
            ) : null}
            <PhoneCountryInput
              label=""
              value={numero}
              onChange={completo => {
                setNumero(completo);
                setError(null);
              }}
              error={error ?? undefined}
              returnKeyType="done"
            />
          </>
        ) : null}

        {paso === 'codigo' ? (
          <>
            <Text style={[t.body, estilos.ayuda, { color: c.textSoft }]} accessibilityLiveRegion="polite">
              {T.enviadoA(enmascarado)}
            </Text>
            <CodigoOtpInput
              codigo={codigo}
              onChange={v => {
                setCodigo(v);
                setError(null);
              }}
              inputRef={inputRef}
              segundosParaReenviar={segundos}
              puedeReenviar={segundos <= 0}
              onReenviar={() => void enviar()}
              deshabilitado={enviando}
              etiquetaReenviar="Reenviar el código por WhatsApp"
            />
            {error ? (
              <Text style={[t.body, estilos.error, { color: c.danger }]} accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}
            <Presionable onPress={() => volver?.()} accessibilityRole="button" style={estilos.cambiar} disabled={enviando}>
              <Text style={[t.body, { color: c.goldInk, fontFamily: fuentes.seminegrita, fontSize: 16 }]}>{T.cambiarNumero}</Text>
            </Presionable>
          </>
        ) : null}

        {paso === 'listo' ? (
          <Text style={[t.body, estilos.ayuda, { color: c.textStrong }]} accessibilityLiveRegion="polite">
            {T.confirmado(enmascarado)}
          </Text>
        ) : null}
      </View>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  /** El cuerpo de `HojaDesdeAbajo` no trae relleno: cada hoja pone el suyo (20, como el título y el pie). */
  cuerpo: { paddingHorizontal: 20, paddingBottom: 8, gap: 10 },
  ayuda: { fontSize: 15 },
  actual: { fontVariant: ['tabular-nums'] },
  error: { fontSize: 15 },
  cambiar: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
