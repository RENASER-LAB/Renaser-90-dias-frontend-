import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Aparicion } from '../../../components/Aparicion';
import { TituloDeSeccion } from '../../../components/Legible';
import { Presionable } from '../../../components/Presionable';
import { Card } from '../../../components/ui';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { useLecturaDelDiagnostico, type CargarLecturaDelDiagnostico } from '../hooks/useLecturaDelDiagnostico';
import {
  NO_SE_PUDO_CARGAR_LA_LECTURA,
  NO_SE_PUDO_CARGAR_LA_LECTURA_SIN_RED,
  TITULO_DE_LA_SECCION_DE_LECTURA,
  TODAVIA_NO_LO_COMPLETA,
} from '../utils/textosDelDiagnostico';
import { LecturaDelDiagnosticoView } from './LecturaDelDiagnosticoView';

/**
 * «Diagnóstico inicial» en la ficha de una persona (spec 026, FR-011): lo que respondió, en solo lectura, para quien la
 * acompaña (el mentor o la guía del grupo, el líder, Administración y Alquimista). La propia persona lo lee en Yo → Mi diagnóstico.
 *
 * Mismo criterio que `TiempoLibreDeLaSemana` y `CierresDelDia`: `cargar` es de cada ficha y estable por persona; **un 403, un
 * 404, la ficha estándar o ningún diagnóstico no dibujan nada** (la ficha queda como estaba); **mientras llega la primera lectura
 * tampoco** (un marco que se retira después sería un parpadeo); un fallo de red se dice con «Reintentar». Si la persona todavía no
 * lo completó, la sección lo dice y muestra lo poco que haya respondido.
 */
export function SeccionDelDiagnosticoDeLaPersona({ cargar }: { cargar: CargarLecturaDelDiagnostico | null }) {
  const { vista, reintentar } = useLecturaDelDiagnostico(cargar);

  if (vista.tipo === 'cargando' || vista.tipo === 'oculta') return null;

  return (
    <Aparicion retardo={300} style={estilos.raiz}>
      <TituloDeSeccion>{TITULO_DE_LA_SECCION_DE_LECTURA}</TituloDeSeccion>
      <Card style={estilos.tarjeta}>
        {vista.tipo === 'error' ? (
          <Fallo sinRed={vista.sinRed} reintentando={vista.reintentando} alReintentar={reintentar} />
        ) : (
          <View style={estilos.cuerpo}>
            {vista.lectura.estado !== 'COMPLETADO' ? <AvisoDeIncompleto /> : null}
            {vista.lectura.secciones.length > 0 ? <LecturaDelDiagnosticoView lectura={vista.lectura} /> : null}
          </View>
        )}
      </Card>
    </Aparicion>
  );
}

function AvisoDeIncompleto() {
  const { c, t } = useTheme();
  return (
    <Text accessibilityRole="text" style={[t.body, estilos.aviso, { color: c.textSoft }]}>
      {TODAVIA_NO_LO_COMPLETA}
    </Text>
  );
}

function Fallo({ sinRed, reintentando, alReintentar }: { sinRed: boolean; reintentando: boolean; alReintentar: () => void }) {
  const { c, t } = useTheme();
  return (
    <View style={estilos.fallo}>
      <Text style={[t.body, estilos.aviso, { color: c.textSoft }]}>
        {sinRed ? NO_SE_PUDO_CARGAR_LA_LECTURA_SIN_RED : NO_SE_PUDO_CARGAR_LA_LECTURA}
      </Text>
      {reintentando ? (
        <Text style={[t.body, estilos.aviso, { color: c.textSoft }]}>Cargando…</Text>
      ) : (
        <Presionable
          onPress={alReintentar}
          accessibilityRole="button"
          accessibilityLabel="Reintentar"
          style={[estilos.reintentar, { borderColor: c.border }]}
        >
          <Text style={[t.body, estilos.textoReintentar, { color: c.goldInk }]}>Reintentar</Text>
        </Presionable>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { marginTop: 20 },
  tarjeta: { marginTop: 8 },
  cuerpo: { gap: 14 },
  aviso: { fontSize: 16, lineHeight: 23 },
  fallo: { gap: 12, alignItems: 'flex-start' },
  reintentar: { justifyContent: 'center', minHeight: 48, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  textoReintentar: { fontSize: 16, fontFamily: fuentes.media },
});
