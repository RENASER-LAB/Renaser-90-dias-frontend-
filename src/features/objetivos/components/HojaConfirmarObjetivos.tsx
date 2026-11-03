import { fuentes } from '../../../theme/fuentes';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { GoldButton } from '../../../components/GoldButton';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import type { ResultadoDeConfirmar } from '../hooks/useRocasMaestras';
import type { EjeObjetivo, RocaMaestraApi } from '../types/objetivos.types';
import { ETIQUETA_EJE } from '../types/objetivos.types';
import { iconoDelEje } from '../utils/iconoDelEje';
import {
  MAXIMO_DEL_OBJETIVO,
  objetivosParaConfirmar,
  primerProblema,
  problemaDelObjetivo,
  type ObjetivoParaConfirmar,
} from '../utils/objetivosPorConfirmar';
import { usePlazoDelObjetivo } from '../context/PlazoDelObjetivo';

export const AVISO_DE_UNA_VEZ = 'Puedes reescribirlos una vez. Después quedan fijos.';

/**
 * La hoja donde se revisan y confirman los objetivos de 90 días que nacieron del diagnóstico (spec 026).
 *
 * Un campo por objetivo por confirmar (el de la prioridad principal primero), con su texto editable y un contador «n / 500»:
 * **nunca se recorta en silencio** — si pasa del tope se dice y «Confirmar mis objetivos» espera a que se acorte. El aviso
 * «Puedes reescribirlos una vez. Después quedan fijos.» va a la vista arriba, no escondido. Confirmar manda un `PUT` por eje, en
 * serie; si uno falla se dice CUÁL, los que ya se confirmaron salen de la hoja y se puede reintentar con el resto.
 *
 * Movimiento: ninguno propio (la hoja trae el suyo). El botón confirma con `tacto.error()` ante un fallo; el éxito
 * (`tacto.logro()` y la línea «quedaron confirmados») lo pone quien la usa, junto con el objetivo.
 */
export function HojaConfirmarObjetivos({
  visible,
  pendientes,
  guardando,
  alCerrar,
  alConfirmar,
}: {
  visible: boolean;
  /** Los objetivos por confirmar, ya en el orden de la pantalla. */
  pendientes: readonly RocaMaestraApi[];
  guardando: boolean;
  alCerrar: () => void;
  alConfirmar: (items: ObjetivoParaConfirmar[]) => Promise<ResultadoDeConfirmar>;
}) {
  const { c, t } = useTheme();
  const plazo = usePlazoDelObjetivo();
  /* Lo que la persona escribió; el eje sin tocar muestra lo que dijo el diagnóstico. Se limpia al cerrar la hoja. */
  const [borradores, setBorradores] = useState<Partial<Record<EjeObjetivo, string>>>({});
  const [fallo, setFallo] = useState<{ eje: EjeObjetivo; mensaje: string; ya: EjeObjetivo[] } | null>(null);
  /* Los errores de «vacío» y «largo» solo se enseñan después del primer intento o si ya se tocó ese campo. */
  const [tocados, setTocados] = useState<Partial<Record<EjeObjetivo, boolean>>>({});

  useEffect(() => {
    if (visible) return;
    setBorradores({});
    setFallo(null);
    setTocados({});
  }, [visible]);

  const items = useMemo(() => objetivosParaConfirmar(pendientes, borradores), [pendientes, borradores]);
  const problema = primerProblema(items);
  const textoDe = (roca: RocaMaestraApi) => borradores[roca.eje] ?? roca.objetivo;

  const confirmar = async () => {
    if (guardando) return;
    if (problema) {
      setTocados(Object.fromEntries(items.map(i => [i.eje, true])));
      tacto.error();
      return;
    }
    setFallo(null);
    const r = await alConfirmar(items);
    if (r.ok) return;
    tacto.error();
    setFallo({ eje: r.falloEn, mensaje: r.mensaje, ya: r.confirmados });
  };

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={alCerrar}
      titulo={`Revisa tus objetivos de ${plazo}`}
      tamano="grande"
      pie={
        <GoldButton
          label="Confirmar mis objetivos"
          onPress={() => void confirmar()}
          loading={guardando}
          textStyle={estilos.textoDelBoton}
        />
      }
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={estilos.cuerpo} showsVerticalScrollIndicator={false}>
        <View style={[estilos.aviso, { backgroundColor: c.goldWash }]} accessibilityRole="text">
          <Icon name="info" size={TAMANO_ICONO.normal} color={c.goldInk} />
          <Text style={[t.body, estilos.textoDelAviso, { color: c.textStrong }]}>{AVISO_DE_UNA_VEZ}</Text>
        </View>

        {pendientes.map(roca => {
          const texto = textoDe(roca);
          const largo = texto.trim().length;
          const prob = problemaDelObjetivo(texto);
          const verError = prob !== null && (tocados[roca.eje] === true || prob === 'largo');
          const ayuda = verError ? (prob === 'largo' ? `Máximo ${MAXIMO_DEL_OBJETIVO} caracteres.` : 'Escribe tu objetivo.') : null;
          return (
            <View key={roca.eje} style={estilos.campo}>
              <View style={estilos.filaDelEje}>
                <Icon name={iconoDelEje(roca.eje)} size={TAMANO_ICONO.chico} color={c.goldInk} />
                <Text style={[t.small, estilos.nombreDelEje, { color: c.goldInk }]}>{ETIQUETA_EJE[roca.eje]}</Text>
              </View>
              <TextInput
                value={texto}
                onChangeText={nuevo => {
                  setBorradores(previos => ({ ...previos, [roca.eje]: nuevo }));
                  setTocados(previos => ({ ...previos, [roca.eje]: true }));
                  if (fallo?.eje === roca.eje) setFallo(null);
                }}
                multiline
                // Sin `maxLength`: cortar lo escrito (o lo que trajo el diagnóstico) en silencio no es una opción. El contador avisa.
                accessibilityLabel={`Tu objetivo de ${plazo} en ${ETIQUETA_EJE[roca.eje]}`}
                placeholder="Escribe a dónde quieres llegar"
                placeholderTextColor={c.tabInactive}
                style={[
                  estilos.input,
                  { color: c.text, backgroundColor: c.cardBgAlt, borderColor: verError || fallo?.eje === roca.eje ? c.danger : c.border },
                ]}
              />
              <View style={estilos.pieDelCampo}>
                <Text style={[t.small, estilos.ayuda, { color: c.danger }]}>{ayuda ?? ''}</Text>
                <Text
                  style={[t.small, estilos.contador, { color: largo > MAXIMO_DEL_OBJETIVO ? c.danger : c.textSoft }]}
                  accessibilityLabel={`${largo} de ${MAXIMO_DEL_OBJETIVO} caracteres`}
                >
                  {largo} / {MAXIMO_DEL_OBJETIVO}
                </Text>
              </View>
            </View>
          );
        })}

        {fallo ? (
          <View style={[estilos.error, { backgroundColor: c.dangerWash, borderLeftColor: c.danger }]} accessibilityRole="alert">
            <Text style={[t.body, { color: c.danger, fontFamily: fuentes.negrita }]}>
              No pudimos confirmar tu objetivo de {ETIQUETA_EJE[fallo.eje]}.
            </Text>
            <Text style={[t.body, { color: c.danger }]}>{fallo.mensaje}</Text>
            {fallo.ya.length > 0 ? (
              <Text style={[t.body, { color: c.textStrong }]}>
                Ya quedó confirmado: {fallo.ya.map(eje => ETIQUETA_EJE[eje]).join(', ')}. Vuelve a intentarlo con el resto.
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 16, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 14 },
  textoDelAviso: { flex: 1, fontSize: 16, lineHeight: 22, fontFamily: fuentes.media },
  campo: { gap: 8 },
  filaDelEje: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nombreDelEje: { fontFamily: fuentes.negrita, fontSize: 15, letterSpacing: 0 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 96, fontSize: 16, lineHeight: 22, textAlignVertical: 'top' },
  pieDelCampo: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  ayuda: { flex: 1, fontSize: 14 },
  contador: { fontSize: 14, fontVariant: ['tabular-nums'] },
  error: { gap: 4, borderLeftWidth: 3, borderRadius: 8, padding: 12 },
  /** El botón de siempre trae versalitas espaciadas de 11 px: acá es una frase en tipo oración de 16. */
  textoDelBoton: { fontSize: 16, letterSpacing: 0 },
});
