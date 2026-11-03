import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonSecundario } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { RecorridoDelDiagnostico } from '../../diagnostico/components/RecorridoDelDiagnostico';
import type { DiagnosticoParaLaPersona } from '../../diagnostico/types/diagnostico.types';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { leerVistaPreviaDelDiagnostico } from '../api/diagnosticoAdminApi';
import { falloDe, textoDelFallo, type FalloDeFichas } from '../utils/textos';
import type { ParametrosDeLaVistaPrevia } from '../utils/vistaPrevia';

/**
 * La vista previa a pantalla completa: el MISMO recorrido que hace la persona (`RecorridoDelDiagnostico`, `modo: 'vistaPrevia'`) con los
 * datos del borrador para esa formación y duración. No guarda nada, ni en el servidor ni en el teléfono, y no navega al terminar: el
 * último paso y «atrás» en el primero cierran la vista previa.
 *
 * Mientras llega, o si no hay nada que mostrar (esa formación no tiene preguntas), lo dice con la cabecera de siempre para poder volver.
 */
export function VistaPreviaDelDiagnosticoScreen({ parametros, onSalir }: { parametros: ParametrosDeLaVistaPrevia; onSalir: () => void }) {
  const { c, t } = useTheme();
  const { horizontalPadding } = useResponsive();
  const [datos, setDatos] = useState<DiagnosticoParaLaPersona | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState<FalloDeFichas | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    try {
      setDatos(await leerVistaPreviaDelDiagnostico(parametros));
    } catch (e) {
      setFallo(falloDe(e));
    } finally {
      setCargando(false);
    }
  }, [parametros]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const hayRecorrido = !cargando && !fallo && datos !== null && datos.secciones.length > 0;
  /* Con el recorrido en pantalla, el atrás lo atiende él (un paso a la vez); sin recorrido, lo atiende esta pantalla. */
  useSystemBackHandler(() => {
    onSalir();
    return true;
  }, !hayRecorrido);

  if (hayRecorrido && datos) {
    return <RecorridoDelDiagnostico datos={datos} modo="vistaPrevia" onSalir={onSalir} onContinuar={onSalir} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Vista previa" onVolver={onSalir} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: horizontalPadding, gap: 12, paddingBottom: 36 }}>
        {cargando ? <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Preparando la vista previa…</Text> : null}
        {fallo ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
              {textoDelFallo(fallo, 'No se pudo preparar la vista previa.')}
            </Text>
            {fallo !== 'sin_permiso' && fallo !== 'no_disponible' ? <BotonSecundario etiqueta="Reintentar" onPress={() => void cargar()} /> : null}
          </View>
        ) : null}
        {!cargando && !fallo ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
            Para esa formación y esa duración el diagnóstico no tiene preguntas. Prueba con otra formación o revisa a qué formaciones se muestra cada pregunta.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
