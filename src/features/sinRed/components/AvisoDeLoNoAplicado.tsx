import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import { BotonSecundario, BotonPrincipal } from '../../../components/Legible';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { useAuth } from '../../../context/AuthContext';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { descartarAvisos, leerAvisos, suscribirAvisos, type AvisoDeLoNoAplicado as Aviso } from '../avisosDeLoNoAplicado';
import { cuandoLoHiciste, tituloDeLaHoja } from '../utils/textoDeLosAvisos';

/**
 * Spec 048, fase 3 (FR-015, FR-016, FR-019, P9): la hoja corta con lo que hiciste sin señal y el servidor no aplicó (o aplicó sin
 * puntos). Sale cuando se abre Hoy y hay avisos sin ver; al cerrarla se quitan (no hay historial). Mientras no se ve, el globo del
 * ícono de conexión dice «1 cosa no se aplicó» (`AnfitrionSinRed`). Cada aviso trae el nombre de lo que no se aplicó, cuándo lo
 * hiciste, el motivo y, si escribiste algo, ese texto para que lo copies y lo vuelvas a hacer.
 */
export function AvisoDeLoNoAplicado() {
  const { user } = useAuth();
  const cuentaId = user?.id ?? null;
  const enHoy = useIsFocused();
  const { c, t } = useTheme();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  /** Los que se están viendo: se fijan al abrir, para que un aviso que llega con la hoja abierta no la cambie a medias. */
  const [vistos, setVistos] = useState<Aviso[] | null>(null);

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
    if (enHoy && vistos === null && avisos.length > 0) setVistos(avisos);
  }, [enHoy, vistos, avisos]);

  const cerrar = useCallback(() => {
    setVistos(null);
    if (cuentaId) void descartarAvisos(cuentaId);
  }, [cuentaId]);

  const copiar = useCallback(async (texto: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Portapapeles = require('expo-clipboard') as typeof import('expo-clipboard');
      await Portapapeles.setStringAsync(texto);
    } catch {
      /* sin portapapeles: el texto se puede seleccionar a mano */
    }
  }, []);

  const lista = vistos ?? [];
  return (
    <HojaDesdeAbajo
      visible={enHoy && vistos !== null && lista.length > 0}
      alCerrar={cerrar}
      titulo={tituloDeLaHoja(lista)}
      subtitulo="Lo hiciste sin conexión."
      tamano="grande"
      etiquetaCerrar="Cerrar"
      pie={<BotonPrincipal etiqueta="Entendido" onPress={cerrar} testID="aviso-no-aplicado-entendido" />}
    >
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={estilos.cuerpo}>
        {lista.map(aviso => (
          <View key={aviso.id} style={[estilos.tarjeta, { backgroundColor: c.cardBgAlt, borderColor: c.border }]} accessibilityRole="summary">
            <Text style={[t.cardTitle, { color: c.textStrong, flexShrink: 1 }]}>{aviso.etiqueta}</Text>
            <Text style={[t.small, { color: c.textSoft, fontSize: 13.5 }]}>{cuandoLoHiciste(aviso.hechoEn)}</Text>
            <Text style={[t.body, { color: c.textStrong, fontSize: 15 }]}>{aviso.motivo}</Text>
            {aviso.texto ? (
              <View style={estilos.escribiste}>
                <Text style={[t.small, { color: c.textSoft, fontFamily: fuentes.seminegrita, fontSize: 13.5 }]}>Lo que escribiste</Text>
                <Text selectable style={[t.body, { color: c.textStrong, fontSize: 15 }]}>{aviso.texto}</Text>
                <BotonSecundario etiqueta="Copiar lo que escribí" onPress={() => void copiar(aviso.texto ?? '')} compacto />
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 12, paddingBottom: 12 },
  tarjeta: { width: '100%', borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 14, gap: 6 },
  escribiste: { gap: 6, marginTop: 4 },
});
