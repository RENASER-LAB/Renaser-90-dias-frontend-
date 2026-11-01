import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BotonSecundario } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';
import { fechaCorta } from '../../admin/utils/fechas';
import { useFormacionDeUnaPersona } from '../hooks/useFormacionDeUnaPersona';
import { etiquetaDeDuracion } from '../utils/etiquetaDeDuracion';
import { detalleDeLaParticipacion, tituloDeLaParticipacion } from '../utils/historialDeFormaciones';
import { nombreLargoDeFormacion } from '../utils/nombreDeFormacion';
import { TrasladarAprendizSheet } from './TrasladarAprendizSheet';

/**
 * La formación de una persona en su ficha de Administración (spec 022, historias 4 y 7): en cuál está y por cuánto tiempo, lo que ya
 * cursó antes (su historial) y, solo para un aprendiz, «Pasar a otra formación». Si el servidor no la ofrece (un backend anterior)
 * la sección no se dibuja y la ficha queda como estaba.
 */
export function FormacionDeLaPersona({
  personaId,
  nombre,
  esAprendiz,
  alTrasladar,
}: {
  personaId: string;
  nombre: string;
  /** Solo un aprendiz se traslada: el personal trabaja en las formaciones que se le asignan (en «Equipo y roles»). */
  esAprendiz: boolean;
  /** Quedó trasladada: la ficha relee lo suyo (su día, su grupo). */
  alTrasladar?: (destinoNombre: string) => void;
}) {
  const { c, t } = useTheme();
  const { datos, disponible, recargar } = useFormacionDeUnaPersona(personaId);
  const [trasladando, setTrasladando] = useState(false);

  if (!disponible || !datos) return null;
  const actual = datos.formacion;

  return (
    <View style={[estilos.tarjeta, { backgroundColor: c.cardBg, borderColor: c.border }]}>
      <Text accessibilityRole="header" style={[t.small, estilos.rotulo, { color: c.textSoft }]}>
        Formación
      </Text>
      {actual ? (
        <Text style={[t.body, estilos.principal, { color: c.textStrong }]}>
          {`${nombreLargoDeFormacion(actual)} · ${etiquetaDeDuracion(datos.duracionDias)}`}
        </Text>
      ) : (
        <Text style={[t.body, estilos.principal, { color: c.textSoft }]}>Todavía no tiene un programa en una formación.</Text>
      )}

      {datos.historial.length > 0 ? (
        <View style={{ gap: 10, marginTop: 4 }}>
          <Text style={[t.small, estilos.rotulo, { color: c.textSoft }]}>Antes cursó</Text>
          {datos.historial.map((anterior, i) => (
            <View key={`${anterior.formacion}-${anterior.fechaFin}-${i}`} style={{ gap: 2 }}>
              <Text style={[t.body, { color: c.textStrong, fontSize: 16 }]}>{tituloDeLaParticipacion(anterior)}</Text>
              <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>
                {detalleDeLaParticipacion(anterior, fechaCorta)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {esAprendiz && actual ? (
        <>
          <BotonSecundario etiqueta="Pasar a otra formación" onPress={() => setTrasladando(true)} />
          <TrasladarAprendizSheet
            visible={trasladando}
            personaId={personaId}
            nombre={nombre}
            formacionActual={actual}
            alCerrar={() => setTrasladando(false)}
            alTrasladar={destino => {
              void recargar();
              alTrasladar?.(destino);
            }}
          />
        </>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8, width: '100%' },
  rotulo: { fontSize: 13 },
  principal: { fontSize: 17, lineHeight: 24 },
});
