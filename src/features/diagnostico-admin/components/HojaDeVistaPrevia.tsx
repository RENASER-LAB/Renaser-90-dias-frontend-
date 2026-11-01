import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BotonPrincipal, TituloDeSeccion } from '../../../components/Legible';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { useTheme } from '../../../theme/ThemeContext';
import { ChipDeOpcion } from '../../admin/components/ChipDeOpcion';
import { listarFormaciones } from '../../formaciones/api/formacionesApi';
import { FiltroDeFormacion } from '../../formaciones/components/FiltroDeFormacion';
import type { TarjetaDeFormacion } from '../../formaciones/types/formaciones.types';
import { etiquetaDeDuracion } from '../../formaciones/utils/etiquetaDeDuracion';
import {
  DURACION_POR_DEFECTO_DE_LA_VISTA,
  duracionesDeLaVistaPrevia,
  duracionVigente,
  type ParametrosDeLaVistaPrevia,
} from '../utils/vistaPrevia';

/**
 * «Vista previa»: se elige para quién se quiere ver el diagnóstico (formación y duración) y se abre el recorrido de la persona con el
 * borrador, sin guardar nada. Las duraciones salen de lo que ofrece cada formación; si no se pudieron leer, las de siempre (3 meses y 1 año).
 */
export function HojaDeVistaPrevia({
  visible,
  alCerrar,
  alVer,
}: {
  visible: boolean;
  alCerrar: () => void;
  alVer: (parametros: ParametrosDeLaVistaPrevia) => void;
}) {
  const { c, t } = useTheme();
  const [formacion, setFormacion] = useState<string | null>(null);
  const [duracion, setDuracion] = useState(DURACION_POR_DEFECTO_DE_LA_VISTA);
  const [tarjetas, setTarjetas] = useState<TarjetaDeFormacion[] | null>(null);

  useEffect(() => {
    if (!visible || tarjetas) return;
    let vigente = true;
    listarFormaciones()
      .then(t => vigente && setTarjetas(t))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [visible, tarjetas]);

  const disponibles = useMemo(() => duracionesDeLaVistaPrevia(formacion, tarjetas), [formacion, tarjetas]);
  const elegida = duracionVigente(duracion, disponibles);

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={alCerrar}
      titulo="Vista previa"
      subtitulo="Cómo lo ve quien empieza. No se guarda nada."
      tamano="grande"
      pie={
        <View style={estilos.pie}>
          <BotonPrincipal etiqueta="Ver el diagnóstico" icono="eye" onPress={() => alVer({ formacion, duracionDias: elegida })} />
        </View>
      }
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={estilos.cuerpo}>
        <View style={{ gap: 10 }}>
          <TituloDeSeccion detalle="Cada formación ve solo las preguntas que le tocan.">Formación</TituloDeSeccion>
          <FiltroDeFormacion valor={formacion} onCambiar={setFormacion} />
        </View>
        <View style={{ gap: 10 }}>
          <TituloDeSeccion detalle="Los textos de la ficha dicen cuánto dura el programa.">Duración</TituloDeSeccion>
          <View style={estilos.chips} accessibilityRole="radiogroup" accessibilityLabel="Duración del programa">
            {disponibles.map(d => (
              <ChipDeOpcion key={d} etiqueta={etiquetaDeDuracion(d)} activo={elegida === d} onPress={() => setDuracion(d)} />
            ))}
          </View>
        </View>
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>
          Lo que verás es el borrador, con los cambios que todavía no publicaste.
        </Text>
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 22, paddingHorizontal: 20, paddingBottom: 24 },
  pie: { paddingHorizontal: 20, paddingBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
