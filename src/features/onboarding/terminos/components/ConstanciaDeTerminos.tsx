import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { BotonSecundario } from '../../../../components/Legible';
import { useTheme } from '../../../../theme/ThemeContext';
import { nombreLargoDeFormacion } from '../../../formaciones/utils/nombreDeFormacion';
import { leerConstanciaDeUnaPersona } from '../api/terminosApi';
import type { ConstanciaApi } from '../api/terminosSchemas';
import { fechaDeVersion } from '../utils/estadoDeLosTerminos';

/**
 * La constancia de los términos en la ficha de una persona (spec 027, FR-019): qué versión aceptó, de qué formación, cuándo y con qué firma. Si nunca aceptó
 * dice «Todavía no aceptó los términos». Si el servidor no lo ofrece (un backend anterior) no se dibuja nada.
 */
export function ConstanciaDeTerminos({ personaId }: { personaId: string }) {
  const { c, t } = useTheme();
  const [constancias, setConstancias] = useState<ConstanciaApi[] | null>(null);

  useEffect(() => {
    let vigente = true;
    setConstancias(null);
    leerConstanciaDeUnaPersona(personaId).then(lista => vigente && setConstancias(lista));
    return () => {
      vigente = false;
    };
  }, [personaId]);

  if (constancias === null) return null;

  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}>
      <Text accessibilityRole="header" style={[t.small, { color: c.textSoft, fontSize: 13 }]}>Términos y condiciones</Text>
      {constancias.length === 0 ? (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Todavía no aceptó los términos.</Text>
      ) : (
        constancias.map((item, i) => (
          <View key={`${item.formation}-${item.number}-${i}`} style={{ gap: 6 }}>
            <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 23 }]}>
              {`Aceptó los términos de ${nombreLargoDeFormacion(item.formation)}, versión ${item.number}, el ${fechaDeVersion(item.acceptedAt)}.`}
            </Text>
            {item.signatureUrl ? (
              <BotonSecundario etiqueta="Ver su firma" onPress={() => void Linking.openURL(item.signatureUrl as string)} />
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8, width: '100%' },
});
