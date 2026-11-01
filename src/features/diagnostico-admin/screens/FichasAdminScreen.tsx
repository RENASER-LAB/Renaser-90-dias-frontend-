import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { Presionable } from '../../../components/Presionable';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { fuentes } from '../../../theme/fuentes';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/lugarDelLanzador';
import { useDiagnosticoAdmin } from '../hooks/useDiagnosticoAdmin';
import { textoDeLaPublicacion } from '../utils/publicar';
import { resumenDeContenido } from '../utils/resumenDeLaFicha';
import { textoDelFallo } from '../utils/textos';
import { AsignarDiagnosticoVariasScreen } from './AsignarDiagnosticoVariasScreen';
import { DiagnosticoEditorScreen } from './DiagnosticoEditorScreen';

type Vista = 'lista' | 'editor' | 'asignar';

/**
 * Administración → Más opciones → «Fichas» (spec 026): las dos fichas con las que alguien puede entrar al programa. La estándar es la de
 * siempre y no se edita acá; el diagnóstico se arma, se publica y se asigna desde aquí. Solo ADMIN y ALQUIMISTA llegan (Administración se
 * muestra por `canAdminister`); un 403 igual se dice con palabras.
 *
 * Es un subnivel de la pila de `AdminScreen`: guarda su propia vista (lista ↔ editor ↔ asignar en lote) y el atrás del sistema sube un
 * nivel por vez (editor → lista → Más opciones). El borrador se lee una vez y lo comparten la lista y el editor.
 */
export function FichasAdminScreen({ onBack }: { onBack: () => void }) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const [vista, setVista] = useState<Vista>('lista');
  const estado = useDiagnosticoAdmin(true);
  const { borrador, cargando, fallo, recargar } = estado;

  const alVolver = useCallback(() => {
    onBack();
    return true;
  }, [onBack]);
  useSystemBackHandler(alVolver, vista === 'lista');

  if (vista === 'editor') {
    return <DiagnosticoEditorScreen estado={estado} onVolver={() => setVista('lista')} />;
  }
  if (vista === 'asignar') {
    return <AsignarDiagnosticoVariasScreen onVolver={() => setVista('lista')} />;
  }

  const cuerpo = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Fichas" subtitulo="Qué se le pregunta a quien entra" onVolver={onBack} />
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
      >
        {cargando && !borrador ? <Text style={cuerpo}>Cargando las fichas…</Text> : null}
        {!cargando && fallo && !borrador ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
              {textoDelFallo(fallo, 'No se pudieron cargar las fichas.')}
            </Text>
            {fallo !== 'sin_permiso' && fallo !== 'no_disponible' ? <BotonSecundario etiqueta="Reintentar" onPress={() => void recargar()} /> : null}
          </View>
        ) : null}

        <TituloDeSeccion>Fichas de ingreso</TituloDeSeccion>

        <Presionable
          onPress={() => setVista('editor')}
          disabled={!borrador}
          accessibilityRole="button"
          accessibilityLabel={
            borrador
              ? `Diagnóstico inicial. ${resumenDeContenido(borrador)}. ${textoDeLaPublicacion(borrador.publicada)}${borrador.hayCambiosSinPublicar ? '. Tiene cambios sin publicar' : ''}`
              : 'Diagnóstico inicial'
          }
          style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border, opacity: borrador ? 1 : 0.6 }]}
        >
          <View style={[estilos.baldosa, { backgroundColor: c.goldWash }]}>
            <Icon name="listChecks" size={20} color={c.gold} />
          </View>
          <View style={{ flex: 1, flexShrink: 1, gap: 2 }}>
            <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media }]}>Diagnóstico inicial</Text>
            {borrador ? (
              <>
                <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{resumenDeContenido(borrador)}</Text>
                <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{textoDeLaPublicacion(borrador.publicada)}</Text>
                {borrador.hayCambiosSinPublicar ? (
                  <Text style={[t.body, { color: c.goldInk, fontSize: 16, fontFamily: fuentes.media }]}>Tiene cambios sin publicar</Text>
                ) : null}
              </>
            ) : (
              <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{cargando ? 'Cargando…' : 'No disponible'}</Text>
            )}
          </View>
          <Icon name="chevron" size={16} color={c.chevron} />
        </Presionable>

        {/* La estándar es la de siempre: se ve para saber que existe, pero no se abre ni se edita (por eso va con borde punteado y candado). */}
        <View
          accessible
          accessibilityLabel="Ficha inicial estándar. La de siempre. No se edita aquí."
          style={[estilos.fila, { borderColor: c.border, borderStyle: 'dashed', backgroundColor: 'transparent' }]}
        >
          <View style={[estilos.baldosa, { backgroundColor: c.cardBgAlt }]}>
            <Icon name="lock" size={20} color={c.chevron} />
          </View>
          <View style={{ flex: 1, flexShrink: 1, gap: 2 }}>
            <Text style={[t.body, { color: c.textSoft, fontSize: 16, fontFamily: fuentes.media }]}>Ficha inicial estándar</Text>
            <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>La de siempre. No se edita aquí.</Text>
          </View>
        </View>

        <TituloDeSeccion detalle="Cambia la ficha de ingreso de quienes ya están dentro. Una persona suelta se cambia desde su ficha en Personas.">
          Personas
        </TituloDeSeccion>
        <BotonSecundario etiqueta="Asignar a varias personas" icono="users" onPress={() => setVista('asignar')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14, minHeight: 72 },
  baldosa: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
