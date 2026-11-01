import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { fuentes } from '../../../theme/fuentes';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import { EditarFormacionSheet } from '../components/EditarFormacionSheet';
import { SeccionComunidadDeLaFormacion } from '../components/SeccionComunidadDeLaFormacion';
import { useDetalleDeFormacion } from '../hooks/useFormacionesAdmin';
import { estadoDeLaFormacion, lineaDeDuraciones, totalPorAtender } from '../utils/resumenDeFormacion';

/**
 * El detalle de una formación (Administración, spec 022, FR-025): resumen, personas, grupos y lo que hay por atender. Cada cifra sale
 * de la misma consulta que la lista a la que lleva (FR-026): «Ver personas» y «Ver grupos» abren esas listas ya filtradas por esta
 * formación. «Editar» cambia nombre, descripción, estado y duraciones. Solo Administración y Alquimista.
 */
export function FormacionDetalleAdminScreen({
  codigo,
  onVolver,
  onVerPersonas,
  onVerGrupos,
}: {
  codigo: string;
  onVolver: () => void;
  onVerPersonas: (codigo: string) => void;
  onVerGrupos: (codigo: string) => void;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const { detalle, cargando, fallo, recargar } = useDetalleDeFormacion(codigo);
  const [editando, setEditando] = useState(false);

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const resumen = detalle?.resumen ?? null;
  const porAtender = detalle ? totalPorAtender(detalle.porAtender) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo={resumen?.nombre ?? 'Formación'} subtitulo={resumen ? estadoDeLaFormacion(resumen) : null} onVolver={onVolver} />
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
          gap: 22,
        }}
      >
        {cargando && !detalle ? <ActivityIndicator color={c.goldInk} style={{ marginTop: 24 }} /> : null}

        {fallo ? (
          <View style={{ gap: 8 }}>
            <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16 }]}>
              {fallo.mensaje}
            </Text>
            {fallo.sinPermiso ? null : <BotonSecundario etiqueta="Reintentar" onPress={() => void recargar()} />}
          </View>
        ) : null}

        {detalle && resumen ? (
          <>
            <View style={estilos.seccion}>
              <TituloDeSeccion>Resumen</TituloDeSeccion>
              <View style={[estilos.caja, { backgroundColor: c.cardBg, borderColor: c.border }]}>
                {resumen.descripcion ? <Text style={[t.body, estilos.texto, { color: c.textSoft }]}>{resumen.descripcion}</Text> : null}
                <Fila etiqueta="Duración" valor={lineaDeDuraciones(resumen)} />
                <Fila etiqueta="Estado" valor={estadoDeLaFormacion(resumen)} />
              </View>
              <BotonSecundario etiqueta="Editar" icono="pencil" onPress={() => setEditando(true)} />
            </View>

            <View style={estilos.seccion}>
              <TituloDeSeccion>Personas</TituloDeSeccion>
              <View style={[estilos.caja, { backgroundColor: c.cardBg, borderColor: c.border }]}>
                <Fila etiqueta="Aprendices" valor={detalle.personas.aprendices} />
                <Fila etiqueta="Por empezar" valor={detalle.personas.porEmpezar} sangria />
                <Fila etiqueta="En curso" valor={detalle.personas.enCurso} sangria />
                <Fila etiqueta="Terminaron" valor={detalle.personas.terminaron} sangria />
                <Fila etiqueta="Personal que trabaja aquí" valor={detalle.personas.personal} />
              </View>
              <BotonSecundario etiqueta="Ver personas" onPress={() => onVerPersonas(codigo)} />
            </View>

            <View style={estilos.seccion}>
              <TituloDeSeccion>Grupos</TituloDeSeccion>
              <View style={[estilos.caja, { backgroundColor: c.cardBg, borderColor: c.border }]}>
                <Fila etiqueta="Grupos" valor={detalle.grupos.total} />
                <Fila etiqueta="Con mentor" valor={detalle.grupos.conMentor} sangria />
                <Fila etiqueta="Sin mentor" valor={detalle.grupos.sinMentor} sangria />
                <Fila etiqueta="De bienvenida" valor={detalle.grupos.recepcion} sangria />
              </View>
              <BotonSecundario etiqueta="Ver grupos" onPress={() => onVerGrupos(codigo)} />
            </View>

            <View style={estilos.seccion}>
              <TituloDeSeccion>Por atender</TituloDeSeccion>
              <View style={[estilos.caja, { backgroundColor: c.cardBg, borderColor: c.border }]}>
                {porAtender === 0 && detalle.porAtender.personalSinFormacion === 0 ? (
                  <Text style={[t.body, estilos.texto, { color: c.textSoft }]}>Nada por atender en esta formación.</Text>
                ) : (
                  <>
                    <Fila etiqueta="Grupos sin mentor" valor={detalle.porAtender.gruposSinMentor} resaltar />
                    <Fila etiqueta="Aprendices sin grupo" valor={detalle.porAtender.aprendicesSinGrupo} resaltar />
                    {/* No es de esta formación ni de otra (no tiene ninguna): se cuenta en todo Renaser y no se suma al número de la tarjeta. */}
                    {detalle.porAtender.personalSinFormacion > 0 ? (
                      <Fila etiqueta="Personal sin formación (en todo Renaser)" valor={detalle.porAtender.personalSinFormacion} resaltar />
                    ) : null}
                  </>
                )}
              </View>
            </View>

            {/* Spec 024: los cuatro tipos de comunidad de esta formación (prender / apagar). Contra un backend anterior no se dibuja. */}
            <SeccionComunidadDeLaFormacion codigo={codigo} />

            <EditarFormacionSheet
              visible={editando}
              resumen={resumen}
              alCerrar={() => setEditando(false)}
              alGuardar={() => void recargar()}
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Fila({ etiqueta, valor, sangria = false, resaltar = false }: { etiqueta: string; valor: number | string; sangria?: boolean; resaltar?: boolean }) {
  const { c, t } = useTheme();
  const destacado = resaltar && typeof valor === 'number' && valor > 0;
  return (
    <View accessible accessibilityLabel={`${etiqueta}: ${valor}`} style={[estilos.fila, sangria ? { paddingLeft: 16 } : null]}>
      <Text style={[t.body, estilos.etiqueta, { color: sangria ? c.textSoft : c.textStrong }]}>{etiqueta}</Text>
      <Text style={[t.body, estilos.valor, { color: destacado ? c.goldInk : c.textStrong }]}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: { gap: 10 },
  caja: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  texto: { fontSize: 16, lineHeight: 23, paddingVertical: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44 },
  etiqueta: { flex: 1, flexShrink: 1, fontSize: 16 },
  valor: { fontSize: 17, fontFamily: fuentes.seminegrita, fontVariant: ['tabular-nums'] },
});
