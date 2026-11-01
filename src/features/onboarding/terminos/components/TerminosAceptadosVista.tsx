import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { Icon, TAMANO_ICONO } from '../../../../components/Icon';
import { DURACION_MS } from '../../../../theme/movimiento';
import { light, space } from '../../../../theme/tokens';
import { useTheme } from '../../../../theme/ThemeContext';
import { fuenteDeLaFirma } from '../../../yo/utils/firmaDelPacto';
import { fechaDeFirma } from '../../../yo/utils/navegacionDeYo';
import type { TerminosAceptadosApi } from '../api/terminosSchemas';
import { ContenidoDeLosTerminos } from './ContenidoDeLosTerminos';

/** El papel de la firma: el blanco del lienzo en los dos temas, como la del Pacto (`PactoFirmado`). */
const PAPEL = light.cardBgAlt;
const PROPORCION_DEL_LIENZO = 5 / 2;

/**
 * «Términos y condiciones» que la persona aceptó, en solo lectura (spec 027, FR-023; Yo → Mi onboarding → Términos y condiciones): el número de versión, el día
 * en que los aceptó, la firma que dibujó y el texto tal como lo aceptó, aunque Administración haya publicado otro después. Sin botones: no se puede aceptar ni
 * firmar de nuevo desde acá (si hay unos nuevos que aceptar, la app los pide al abrir).
 *
 * Sin firma (no quedó guardada, el archivo ya no está o la imagen no carga) se ve igual, sin ese recuadro.
 */
export function TerminosAceptadosVista({ aceptados }: { aceptados: TerminosAceptadosApi }) {
  const { c, t } = useTheme();
  const version = aceptados.version;
  const fecha = fechaDeFirma(aceptados.acceptedAt);
  const numero = version.number;
  const titulo = numero ? `Versión ${numero}` : 'Versión aceptada';
  const encontrada = fuenteDeLaFirma(aceptados.signatureUrl);
  const [urlQueFallo, setUrlQueFallo] = useState<string | null>(null);
  const [proporcion, setProporcion] = useState(PROPORCION_DEL_LIENZO);
  const firma = encontrada && encontrada.uri !== urlQueFallo ? encontrada : null;

  return (
    <View style={{ gap: 14 }}>
      <View
        accessible
        accessibilityLabel={`${titulo}. ${fecha ? `Aceptada el ${fecha}.` : 'Aceptada.'}${firma ? ' Con tu firma.' : ''}`}
        style={[estilos.caja, { borderColor: c.border, backgroundColor: c.cardBg }]}
      >
        <View style={estilos.fila}>
          <View style={[estilos.marca, { backgroundColor: c.successWash }]}>
            <Icon name="check" size={TAMANO_ICONO.normal} color={c.success} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[t.cardTitle, { color: c.textStrong }]}>{titulo}</Text>
            <Text style={[t.body, { color: c.textSoft }]}>{fecha ? `Aceptada el ${fecha}` : 'Aceptada'}</Text>
          </View>
        </View>
        {firma ? (
          <View style={[estilos.papel, { backgroundColor: PAPEL }]}>
            <Image
              source={firma}
              style={[estilos.firma, { aspectRatio: proporcion }]}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={DURACION_MS.fundido}
              onLoad={({ source }) => {
                if (source.width > 0 && source.height > 0) setProporcion(source.width / source.height);
              }}
              onError={() => setUrlQueFallo(firma.uri)}
              accessible={false}
            />
          </View>
        ) : null}
      </View>

      <Text style={[t.cardTitle, { color: c.textStrong, fontSize: 18, lineHeight: 25 }]}>{version.title}</Text>
      <ContenidoDeLosTerminos introduccion={version.introduction ?? ''} clausulas={version.clauses} />
      <Text style={[t.body, { color: c.textSoft, fontSize: 15 }]}>Esto es lo que aceptaste. Solo se puede leer.</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { width: '100%', gap: 14, borderWidth: 1, borderRadius: space.radius, padding: space.cardPad },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  marca: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  papel: { width: '100%', borderRadius: space.radiusSm, overflow: 'hidden' },
  firma: { width: '100%' },
});
