import { fuentes } from '../../../theme/fuentes';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { Interruptor } from '../../../components/Interruptor';
import { BotonSecundario } from '../../../components/Legible';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { CabeceraAdmin } from '../components/CabeceraAdmin';
import { useCodigoRenaserEnFichas, type FalloDelCodigoRenaser } from '../hooks/useCodigoRenaserEnFichas';
import {
  confirmacionDelCambio,
  ETIQUETA_DEL_INTERRUPTOR,
  SUBTITULO_DE_LA_PANTALLA,
  TEXTO_NO_DISPONIBLE,
  TEXTO_NO_SE_PUDO_LEER,
  TEXTO_SIN_PERMISO,
  TEXTO_SIN_RED,
  textoDeLoHecho,
  textoDelEstado,
  textoDelUltimoCambio,
  TITULO_DE_LA_PANTALLA,
} from '../utils/codigoRenaserEnFichas';
import { confirmar } from '../utils/dialogo';

const TEXTO_DEL_FALLO: Record<FalloDelCodigoRenaser, string> = {
  sin_permiso: TEXTO_SIN_PERMISO,
  no_disponible: TEXTO_NO_DISPONIBLE,
  sin_red: TEXTO_SIN_RED,
  error: TEXTO_NO_SE_PUDO_LEER,
};

/**
 * «Código Renaser en las fichas» (spec 034, D-299; pedido del dueño del 2026-10-31): un solo interruptor que decide si el
 * mentor, la guía y el líder ven el Código Renaser de los aprendices en sus fichas. Yo → Administración → Más opciones; solo
 * ADMIN y ALCHEMIST (Administración se muestra por `canAdminister`), y un 403 del servidor igual se dice con palabras.
 *
 * - **Cambiar pide una confirmación que dice qué va a pasar** (sin motivo escrito, decisión del dueño) y rige en el acto. El
 *   interruptor es el del servidor: no se mueve hasta que éste acepta (`useCodigoRenaserEnFichas`); si falla, queda donde estaba
 *   y se dice qué pasó, con «Reintentar».
 * - **Queda constancia**: «Último cambio: <nombre>, <fecha y hora>». No se avisa a la persona ni al mentor.
 *
 * Movimiento (`emil-design-eng`, `animate-expo`): se usa pocas veces, así que nada nuevo se anima. El `Interruptor` mueve su
 * pulgar como siempre (180 ms, al instante con «reducir movimiento») y la confirmación en línea trae su fundido y su
 * `tacto.logro()` una sola vez, al quedar guardado.
 */
export function CodigoRenaserEnFichasAdminScreen({ onVolver }: { onVolver: () => void }) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const { estado, cargando, guardando, fallo, cambiar, reintentar } = useCodigoRenaserEnFichas();
  const [hecho, setHecho] = useState<{ clave: number; texto: string } | null>(null);

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const alTocar = async (haciaVisible: boolean) => {
    const pregunta = confirmacionDelCambio(haciaVisible);
    if (!(await confirmar(pregunta.titulo, pregunta.mensaje, { ok: pregunta.ok }))) return;
    const nuevo = await cambiar(haciaVisible);
    if (nuevo) {
      tacto.logro();
      setHecho({ clave: Date.now(), texto: textoDeLoHecho(nuevo.visible) });
    }
  };

  const ultimo = estado ? textoDelUltimoCambio(estado.ultimoCambio) : null;
  const cuerpo = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo={TITULO_DE_LA_PANTALLA} subtitulo={SUBTITULO_DE_LA_PANTALLA} onVolver={onVolver} />
      <ScrollView
        {...barraAlDesplazar}
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 12,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {cargando && !estado ? <Text style={cuerpo}>Cargando…</Text> : null}

        {estado ? (
          <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}>
            <View style={estilos.fila}>
              <Text style={[t.body, estilos.etiqueta, { color: c.textStrong, fontSize: 17 }]}>{ETIQUETA_DEL_INTERRUPTOR}</Text>
              <Interruptor
                valor={estado.visible}
                onCambiar={nuevo => void alTocar(nuevo)}
                etiqueta={ETIQUETA_DEL_INTERRUPTOR}
                deshabilitado={guardando}
              />
            </View>
            <Text style={cuerpo} accessibilityLiveRegion="polite">
              {textoDelEstado(estado)}
            </Text>
            {ultimo ? <Text style={[t.small, { color: c.textSoft, fontSize: 16 }]}>{ultimo}</Text> : null}
          </View>
        ) : null}

        {hecho ? (
          <ConfirmacionEnLinea key={hecho.clave} texto={hecho.texto} onTerminar={() => setHecho(null)} />
        ) : null}

        {fallo ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
              {TEXTO_DEL_FALLO[fallo]}
            </Text>
            {fallo !== 'sin_permiso' && fallo !== 'no_disponible' ? (
              <BotonSecundario etiqueta="Reintentar" onPress={() => void reintentar()} />
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 17, gap: 10 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  etiqueta: { flex: 1, fontFamily: fuentes.media, fontSize: 17, lineHeight: 24 },
});
