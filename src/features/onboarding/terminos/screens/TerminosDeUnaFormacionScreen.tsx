import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotonPeligro, BotonPrincipal, BotonSecundario, TituloDeSeccion } from '../../../../components/Legible';
import { Presionable } from '../../../../components/Presionable';
import { useSystemBackHandler } from '../../../../hooks/useSystemBackHandler';
import { useOcultarBarraAlDesplazar } from '../../../../navigation/barraAlDesplazar/BarraInferior';
import { mensajeDeError } from '../../../../services/http/apiClient';
import { useResponsive } from '../../../../theme/responsive';
import { useTheme } from '../../../../theme/ThemeContext';
import { tacto } from '../../../../utils/tacto';
import { ESPACIO_PARA_LANZADOR } from '../../../renasia/components/RenasiaLauncher';
import { CabeceraAdmin } from '../../../admin/components/CabeceraAdmin';
import { avisar, confirmar } from '../../../admin/utils/dialogo';
import { descartarBorradorDeTerminos, leerVersionDeTerminos, restaurarComoBorradorDeTerminos } from '../api/terminosApi';
import type { VersionDeTerminosApi } from '../api/terminosSchemas';
import { VersionDeTerminosSheet } from '../components/VersionDeTerminosSheet';
import { useDetalleDeTerminos } from '../hooks/useTerminosAdmin';
import { fechaDeVersion, lineaDelHistorial, textoDeAceptantes, tituloDeLaFormacion } from '../utils/estadoDeLosTerminos';

/**
 * Los términos de UNA formación (spec 027): la versión vigente con cuántas personas la aceptaron, el borrador si lo hay, «Editar», y el historial —cada
 * versión con su fecha, su autor, su nota y cuántas la aceptaron—, que se puede abrir, ver quiénes la aceptaron y restaurar como borrador (no se publica sola).
 */
export function TerminosDeUnaFormacionScreen({
  formacion,
  onVolver,
  onEditar,
}: {
  formacion: string;
  onVolver: () => void;
  onEditar: (formacion: string) => void;
}) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const { detalle, cargando, fallo, recargar } = useDetalleDeTerminos(formacion);
  const [viendo, setViendo] = useState<VersionDeTerminosApi | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  useSystemBackHandler(() => {
    if (viendo) {
      setViendo(null);
      return true;
    }
    onVolver();
    return true;
  });

  const vigente = detalle?.current ?? null;
  const borrador = detalle?.draft ?? null;
  const aceptantes = detalle?.versions.find(v => v.version.number === vigente?.number)?.acceptedCount ?? 0;

  const abrirVersion = async (numero: number) => {
    try {
      const version = await leerVersionDeTerminos(formacion, numero);
      if (version) setViendo(version);
    } catch (e) {
      avisar('No se pudo abrir', mensajeDeError(e, 'Inténtalo de nuevo.'));
    }
  };

  const restaurar = async (numero: number) => {
    if (borrador) {
      const acepto = await confirmar('¿Reemplazar el borrador?', 'Ya hay un borrador sin publicar. Restaurar esta versión lo reemplaza.', { ok: 'Reemplazar', destructivo: true });
      if (!acepto) return;
    }
    setTrabajando(true);
    try {
      await restaurarComoBorradorDeTerminos(formacion, numero);
      tacto.logro();
      setViendo(null);
      await recargar();
      onEditar(formacion);
    } catch (e) {
      avisar('No se pudo restaurar', mensajeDeError(e, 'Inténtalo de nuevo.'));
    } finally {
      setTrabajando(false);
    }
  };

  const descartar = async () => {
    const acepto = await confirmar('¿Descartar el borrador?', 'Se pierde lo que cambiaste y no se publica nada.', { ok: 'Descartar', destructivo: true });
    if (!acepto) return;
    setTrabajando(true);
    try {
      await descartarBorradorDeTerminos(formacion);
      await recargar();
    } catch (e) {
      avisar('No se pudo descartar', mensajeDeError(e, 'Inténtalo de nuevo.'));
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo={tituloDeLaFormacion(formacion, detalle?.name)} subtitulo={vigente?.number != null ? `Versión ${vigente.number}` : 'Por revisar'} onVolver={onVolver} />
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
        {cargando ? <ActivityIndicator color={c.goldInk} style={{ marginTop: 16 }} /> : null}
        {fallo ? (
          <View style={{ gap: 10 }}>
            <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16 }]}>{fallo}</Text>
            <BotonSecundario etiqueta="Reintentar" onPress={() => void recargar()} />
          </View>
        ) : null}

        {detalle ? (
          <>
            <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: vigente ? c.border : c.gold }]}>
              {vigente ? (
                <>
                  <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 18 }]}>{`Versión ${vigente.number} · vigente`}</Text>
                  <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{`Publicada el ${fechaDeVersion(vigente.publishedAt)}`}</Text>
                  {vigente.note ? <Text style={[t.body, { color: c.text, fontSize: 16 }]}>{vigente.note}</Text> : null}
                  <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{textoDeAceptantes(aceptantes)}</Text>
                </>
              ) : (
                <>
                  <Text style={[t.cardTitle, { color: c.goldInk, fontSize: 18 }]}>Por revisar</Text>
                  <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>
                    Todavía no hay términos publicados. Mientras tanto, nadie puede ser aceptado en esta formación. Revisa el borrador, que parte de los de la Escuela, y publícalo.
                  </Text>
                </>
              )}
              {borrador ? <Text style={[t.body, { color: c.goldInk, fontSize: 16 }]}>Hay un borrador sin publicar.</Text> : null}
            </View>

            <BotonPrincipal etiqueta={borrador ? 'Seguir editando' : vigente ? 'Editar' : 'Revisar y publicar'} onPress={() => onEditar(formacion)} deshabilitado={trabajando} />
            {vigente?.number != null ? <BotonSecundario etiqueta="Ver el texto vigente" onPress={() => void abrirVersion(vigente.number as number)} /> : null}
            {borrador ? <BotonPeligro etiqueta="Descartar el borrador" onPress={() => void descartar()} deshabilitado={trabajando} /> : null}

            {detalle.versions.length > 0 ? <TituloDeSeccion>Historial</TituloDeSeccion> : null}
            {detalle.versions.map(item => (
              <Presionable
                key={item.version.id}
                onPress={() => void abrirVersion(item.version.number as number)}
                accessibilityRole="button"
                accessibilityLabel={`Abrir la versión ${item.version.number}`}
                style={[estilos.fila, { backgroundColor: c.cardBg, borderColor: c.border }]}
              >
                <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 22 }]}>{lineaDelHistorial(item.version, item.publishedByName, item.acceptedCount)}</Text>
                {item.version.note ? <Text style={[t.body, { color: c.textSoft, fontSize: 15 }]}>{item.version.note}</Text> : null}
                {item.version.asksNewAcceptance ? <Text style={[t.small, { color: c.goldInk, fontSize: 14 }]}>Pidió aceptar de nuevo</Text> : null}
              </Presionable>
            ))}
          </>
        ) : null}
      </ScrollView>
      <VersionDeTerminosSheet visible={viendo !== null} version={viendo} titulo="Términos y condiciones" alCerrar={() => setViendo(null)} alRestaurar={n => void restaurar(n)} />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 6 },
  fila: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 4, minHeight: 56 },
});
