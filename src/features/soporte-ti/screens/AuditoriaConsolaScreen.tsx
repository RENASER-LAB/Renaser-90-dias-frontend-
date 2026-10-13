import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonSecundario } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { ChipDeOpcion } from '../../admin/components/ChipDeOpcion';
import { mensajeDeFallo } from '../../admin/utils/mensajes';
import { leerAuditoria, TAMANO_DE_PAGINA_DE_AUDITORIA } from '../api/soporteTiApi';
import type { CambioAuditado } from '../api/soporteTiSchemas';
import { actorDe, fechaYHora, hayMasPaginas, queHacerConElError, resumenDelCambio, tipoDeCambio } from '../utils/consola';

/**
 * La auditoría de la consola (spec 002, FR-007): cada cambio, desbloqueo, confirmación con contraseña y apertura o
 * cierre del circuito de la IA, del más nuevo al más viejo, de a 20. Solo lectura: no se edita ni se borra desde
 * ninguna parte. Abierta desde una funcionalidad, muestra la suya; «Todas» quita el filtro.
 */
export function AuditoriaConsolaScreen({
  clave,
  nombres,
  onBloqueada,
  onVolver,
}: {
  /** La funcionalidad de la que se vino, o `null` (toda la auditoría). */
  clave: string | null;
  /** Clave → nombre visible, para no mostrar la clave cruda. */
  nombres: ReadonlyMap<string, string>;
  onBloqueada: () => void;
  onVolver: () => void;
}) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const [filtro, setFiltro] = useState<string | null>(clave);
  const [filas, setFilas] = useState<CambioAuditado[]>([]);
  const [pagina, setPagina] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  /** El filtro con el que se pidió: una respuesta de un filtro anterior no pisa la lista. */
  const filtroPedido = useRef(filtro);

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const pedir = useCallback(
    async (numero: number) => {
      const conFiltro = filtroPedido.current;
      setCargando(true);
      setFallo(null);
      try {
        const respuesta = await leerAuditoria({ clave: conFiltro, pagina: numero });
        if (conFiltro !== filtroPedido.current) return;
        setFilas(actual => (numero === 0 ? respuesta.contenido : [...actual, ...respuesta.contenido]));
        setPagina(numero);
        setHayMas(hayMasPaginas(numero, respuesta.contenido.length, TAMANO_DE_PAGINA_DE_AUDITORIA, respuesta.total));
      } catch (e) {
        if (queHacerConElError(e) === 'desbloquear') {
          onBloqueada();
          return;
        }
        setFallo(mensajeDeFallo(e, 'No se pudo leer la auditoría.'));
      } finally {
        setCargando(false);
      }
    },
    [onBloqueada],
  );

  useEffect(() => {
    filtroPedido.current = filtro;
    setFilas([]);
    setHayMas(false);
    void pedir(0);
  }, [filtro, pedir]);

  const ayuda = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Auditoría" subtitulo={filtro ? nombres.get(filtro) ?? filtro : 'Todas las funcionalidades'} onVolver={onVolver} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 36,
          paddingHorizontal: horizontalPadding,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 12,
        }}
      >
        {clave ? (
          <View style={estilos.chips} accessibilityRole="radiogroup">
            <ChipDeOpcion etiqueta={nombres.get(clave) ?? clave} activo={filtro === clave} onPress={() => setFiltro(clave)} />
            <ChipDeOpcion etiqueta="Todas" activo={filtro === null} onPress={() => setFiltro(null)} />
          </View>
        ) : null}

        {cargando && filas.length === 0 ? <Text style={ayuda}>Cargando la auditoría…</Text> : null}
        {!cargando && !fallo && filas.length === 0 ? <Text style={ayuda}>Todavía no hay cambios registrados.</Text> : null}

        {filas.map((cambio, i) => {
          const resumen = resumenDelCambio(cambio);
          const actor = actorDe(cambio);
          const nombre = cambio.clave ? nombres.get(cambio.clave) ?? cambio.clave : null;
          return (
            <View key={cambio.id ?? `${cambio.creadoEn}-${i}`} style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              <Text style={[t.small, { color: c.textSoft, fontSize: 13 }]}>
                {fechaYHora(cambio.creadoEn)} · {tipoDeCambio(cambio.tipo)}
              </Text>
              {nombre ? <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: 'Jost_500Medium' }]}>{nombre}</Text> : null}
              {resumen ? <Text style={[t.body, { color: c.text, fontSize: 16 }]}>{resumen}</Text> : null}
              {cambio.motivo ? <Text style={ayuda}>Motivo: {cambio.motivo}</Text> : null}
              <Text style={ayuda}>{actor ? `Por ${actor}` : cambio.tipo?.toUpperCase() === 'AUTOMATICO' ? 'Lo hizo el sistema' : 'Sin autor registrado'}</Text>
            </View>
          );
        })}

        {fallo ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
              {fallo}
            </Text>
            <BotonSecundario etiqueta="Reintentar" onPress={() => void pedir(filas.length > 0 ? pagina + 1 : 0)} />
          </View>
        ) : null}
        {!fallo && hayMas ? <BotonSecundario etiqueta="Ver más" onPress={() => void pedir(pagina + 1)} cargando={cargando} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fila: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 4 },
});
