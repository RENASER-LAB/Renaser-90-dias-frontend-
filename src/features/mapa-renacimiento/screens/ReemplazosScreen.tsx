import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import { PantallaPaso } from '../components/PantallaPaso';
import { Apoyo, Entrada, Etiqueta, PastillasMultiples, Pregunta } from '../components/Piezas';
import { LIMITES, PATRONES, esVago, faltantesDeReemplazos, frasearReemplazo, reemplazoValido, reemplazosValidos } from '../reglas';
import type { ProtocoloReemplazo } from '../tipos';
import { idLocal, type PropsPaso } from './props';

/** V07 · Patrones a reemplazar (§3 V07): 1–3 del catálogo, cada uno con disparador, conducta y respuesta. */
export function ReemplazosScreen({ estado }: PropsPaso) {
  const { c, t } = useTheme();
  const { mapa, actualizar, siguiente, anterior } = estado;
  const claves = mapa.reemplazos.map(r => r.patron);
  const valido = reemplazosValidos(mapa.reemplazos);

  const elegir = (nuevas: string[]) => actualizar(previo => {
    const vigentes = previo.reemplazos.filter(r => nuevas.includes(r.patron));
    const agregados = nuevas
      .filter(clave => !vigentes.some(r => r.patron === clave))
      .map<ProtocoloReemplazo>(clave => ({ id: idLocal(), patron: clave, disparador: '', conductaActual: '', respuestaAlternativa: '' }));
    return { ...previo, reemplazos: [...vigentes, ...agregados] };
  });

  const cambiar = (id: string, parche: Partial<ProtocoloReemplazo>) => actualizar(previo => ({
    ...previo,
    reemplazos: previo.reemplazos.map(r => (r.id === id ? { ...r, ...parche } : r)),
  }));

  return (
    <PantallaPaso
      paso={7}
      onAtras={anterior}
      boton={{ label: 'Guardar mis reemplazos', onPress: siguiente, disabled: !valido, faltan: faltantesDeReemplazos(mapa.reemplazos) }}
    >
      <Pregunta>¿Qué comportamientos actuales podrían impedir que cumplas tu mapa?</Pregunta>
      <Apoyo>Elige solo los que realmente aparecen en tu vida. Máximo tres.</Apoyo>

      <Etiqueta>Comportamientos ({claves.length}/{LIMITES.reemplazos})</Etiqueta>
      <PastillasMultiples opciones={PATRONES} valores={claves} onCambiar={elegir} maximo={LIMITES.reemplazos} />

      {mapa.reemplazos.map(r => {
        const etiqueta = PATRONES.find(p => p.clave === r.patron)?.etiqueta ?? r.patron;
        const completo = reemplazoValido(r);
        return (
          <View key={r.id} style={[styles.editor, { borderColor: completo ? c.gold : c.border, backgroundColor: c.cardBg }]}>
            <Text style={[t.micro, { color: c.gold, letterSpacing: 1 }]}>{etiqueta.toUpperCase()}</Text>

            <Etiqueta>Disparador</Etiqueta>
            <Entrada valor={r.disparador} onCambiar={v => cambiar(r.id, { disparador: v })} placeholder="Cuándo, dónde o ante qué ocurre" maximo={LIMITES.textoCorto.max} />

            <Etiqueta>Conducta actual</Etiqueta>
            <Entrada valor={r.conductaActual} onCambiar={v => cambiar(r.id, { conductaActual: v })} placeholder="Qué haces concretamente" maximo={LIMITES.textoCorto.max} />

            <Etiqueta>Respuesta alternativa</Etiqueta>
            <Entrada valor={r.respuestaAlternativa} onCambiar={v => cambiar(r.id, { respuestaAlternativa: v })} placeholder="Acción de 2–30 minutos, ejecutable de inmediato" maximo={LIMITES.textoCorto.max} />
            {r.respuestaAlternativa.trim() && esVago(r.respuestaAlternativa) ? (
              <Text style={[t.small, { color: '#E06A66', marginTop: 4 }]}>Necesita un verbo observable: algo que puedas hacer ahora mismo.</Text>
            ) : null}

            {completo ? (
              <View style={[styles.frase, { borderColor: c.gold, backgroundColor: c.cardBgAlt }]}>
                <Text style={[t.small, { color: c.text, lineHeight: 19 }]}>{frasearReemplazo(r)}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </PantallaPaso>
  );
}

const styles = StyleSheet.create({
  editor: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 14 },
  frase: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 14 },
});
