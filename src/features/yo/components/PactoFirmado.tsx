import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { useTheme } from '../../../theme/ThemeContext';
import { DURACION_MS } from '../../../theme/movimiento';
import { light, space } from '../../../theme/tokens';
import { useFirmaDelPacto } from '../hooks/useFirmaDelPacto';
import { fechaDeFirma } from '../utils/navegacionDeYo';

/**
 * El papel de la firma: el blanco del lienzo en tema claro (`cardBgAlt`), en los DOS temas.
 *
 * El PNG guardado es una foto del recuadro donde se firmó (`SignatureCanvas.capturarComoPngBase64`):
 * trazo dorado sobre el fondo del tema de ese momento, con su borde dorado. Casi siempre es oro sobre
 * blanco, y en oscuro se ve como lo que es, la hoja firmada, sobre la tarjeta oscura. No se invierte:
 * es la imagen que la persona aprobó, e invertirla volvería azul el dorado. El papel cubre además una
 * firma con fondo transparente y trazo oscuro, que sobre la tarjeta oscura no se vería.
 */
const PAPEL = light.cardBgAlt;

/**
 * La forma del lienzo (todo el ancho × 145 de alto) mientras baja la imagen; al llegar se toma la del PNG
 * (`onLoad`), así el papel mide lo mismo que la firma y no le quedan franjas arriba y abajo.
 */
const PROPORCION_DEL_LIENZO = 5 / 2;

/**
 * El pie del Pacto cuando ya está firmado (decisión 12 del dueño, 2026-10-05): en solo lectura, con la
 * firma dibujada arriba y la fecha debajo.
 *
 * **Antes**: quien ya había firmado entraba a revisar su Pacto y encontraba el lienzo vacío y
 * «Sellar mi compromiso» otra vez, como si no hubiera firmado nunca.
 *
 * **De dónde sale cada cosa:**
 * - La **fecha**: `pactSignedAt` de `GET /api/v1/onboarding/state` (el mismo dato que pone el ✓ en
 *   «Mi onboarding»).
 * - La **firma dibujada**: `GET /api/v1/onboarding/pact/signature` (backend D-253, 2026-10-05), una URL
 *   de lectura de 15 minutos del PNG que se subió al sellar. Solo devuelve la de quien pregunta.
 *
 * > **Corregido 2026-10-05 (mismo día).** Decía que la firma no se dibujaba porque «no hay ningún
 * > endpoint que la devuelva»: `GET /onboarding/answers` traía solo el `mediaId` y `MediaController`
 * > solo tenía la subida. D-253 agregó ese endpoint.
 *
 * **Sin imagen queda como antes** («Firmado el …» y nada más): si el backend es anterior a D-253, si no
 * hay firma guardada (404), sin red, o si la imagen no carga. Se recuerda QUÉ URL falló, no que
 * «falló»: al volver a abrir el Pacto llega una URL nueva y se intenta de nuevo.
 */
export function PactoFirmado({ firmadoEn }: { firmadoEn: string | null }) {
  const { c, t } = useTheme();
  const fecha = fechaDeFirma(firmadoEn);
  const titulo = fecha ? `Firmado el ${fecha}` : 'Pacto firmado';
  const encontrada = useFirmaDelPacto();
  const [urlQueFallo, setUrlQueFallo] = useState<string | null>(null);
  const [proporcion, setProporcion] = useState(PROPORCION_DEL_LIENZO);
  const firma = encontrada && encontrada.uri !== urlQueFallo ? encontrada : null;

  return (
    <View
      accessible
      accessibilityLabel={`${firma ? 'Tu firma del Pacto. ' : ''}${titulo}. Tu firma quedó guardada en tu expediente.`}
      style={[estilos.caja, { borderColor: c.border, backgroundColor: c.cardBg }]}
    >
      {firma && (
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
      )}
      <View style={estilos.fila}>
        <View style={[estilos.marca, { backgroundColor: c.successWash }]}>
          <Icon name="check" size={TAMANO_ICONO.normal} color={c.success} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[t.cardTitle, { color: c.textStrong }]}>{titulo}</Text>
          <Text style={[t.body, { color: c.textSoft }]}>Tu firma quedó guardada en tu expediente.</Text>
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    width: '100%',
    gap: 14,
    borderWidth: 1,
    borderRadius: space.radius,
    padding: space.cardPad,
  },
  // El PNG trae las esquinas del lienzo (radio 14) y acá se muestra a ~0,88 de su ancho: 12.
  papel: { width: '100%', borderRadius: space.radiusSm, overflow: 'hidden' },
  firma: { width: '100%' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  marca: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
