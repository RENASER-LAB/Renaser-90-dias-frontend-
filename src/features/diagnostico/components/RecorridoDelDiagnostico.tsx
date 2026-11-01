import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton } from '../../../components/GoldButton';
import { Presionable } from '../../../components/Presionable';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { BarraDeAvance } from '../../onboarding/components/BarraDeAvance';
import { MarcoDePaso } from '../../onboarding/components/MarcoDePaso';
import { useRecorridoDelDiagnostico } from '../hooks/useRecorridoDelDiagnostico';
import type { PropiedadesDelRecorrido } from '../types/diagnostico.types';
import { descripcionDelAvance } from '../utils/pasosDelRecorrido';
import { QUE_SIGUE_EN_EL_INGRESO } from '../utils/textosDelDiagnostico';
import { CierreDelDiagnostico } from './CierreDelDiagnostico';
import { PasoDelDiagnostico } from './PasoDelDiagnostico';
import { PortadaDelDiagnostico } from './PortadaDelDiagnostico';

/**
 * El recorrido completo del diagnóstico (spec 026): portada → pasos cortos → cierre. Lo usan la persona (en su ficha de ingreso
 * y, ya dentro de la app, desde Hoy o Yo) y la vista previa de Administración: la misma pantalla con otro origen de datos.
 *
 * Es la ficha estándar con otro contenido: el mismo esqueleto de pantalla (`MarcoDePaso`: barra arriba, un solo scroll, botón
 * fijo abajo que sube con el teclado), la misma barra de avance y las mismas opciones grandes. La lógica vive en
 * `useRecorridoDelDiagnostico` y en `utils/`.
 *
 * **Movimiento** (`emil-design-eng`, `animate-expo`): el único propio es el de `MarcoDePaso` —el paso nuevo entra 25 px con un
 * fundido de 260 ms, desde el lado hacia el que se avanza; con «reducir movimiento», solo fundido— y el relleno de la barra.
 * Las respuestas cambian al instante (se hacen decenas de veces) y los toques usan el `Presionable` de siempre.
 *
 * **Atrás** (flecha y gesto del sistema): sube un paso; en el primero vuelve a la portada; en la portada llama a `onSalir`.
 */
export function RecorridoDelDiagnostico(props: PropiedadesDelRecorrido) {
  const { c } = useTheme();
  const { datos, modo, onSalir, onContinuar, textoQueSigue, etiquetaContinuar } = props;
  const r = useRecorridoDelDiagnostico(props);

  useSystemBackHandler(() => {
    r.atras();
    return true;
  }, true);

  if (r.cargando) {
    return (
      <SafeAreaView style={[estilos.cargando, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.goldInk} size="large" />
      </SafeAreaView>
    );
  }

  if (r.fase === 'portada') {
    return (
      <MarcoDePaso
        alVolver={onSalir}
        etiquetaVolver={modo === 'vistaPrevia' ? 'Cerrar' : 'Salir'}
        accesibilidadVolver={modo === 'vistaPrevia' ? 'Cerrar la vista previa' : 'Salir del diagnóstico'}
        claveContenido="portada"
        pie={<GoldButton label="EMPEZAR" onPress={r.empezar} icon="arrow" />}
      >
        <PortadaDelDiagnostico datos={datos} />
      </MarcoDePaso>
    );
  }

  if (r.fase === 'cierre' && r.resultado) {
    return (
      <MarcoDePaso
        claveContenido="cierre"
        pie={<GoldButton label={(etiquetaContinuar ?? 'Continuar').toUpperCase()} onPress={() => onContinuar?.()} icon="arrow" />}
      >
        <CierreDelDiagnostico resultado={r.resultado} queSigue={textoQueSigue ?? QUE_SIGUE_EN_EL_INGRESO} />
      </MarcoDePaso>
    );
  }

  if (!r.paso) return null;

  const etiquetaDelBoton = r.esUltimo ? (modo === 'vistaPrevia' ? 'CERRAR VISTA PREVIA' : 'TERMINAR') : 'SIGUIENTE';

  return (
    <MarcoDePaso
      alVolver={r.atras}
      etiquetaVolver={r.indice === 0 ? 'Volver' : undefined}
      accesibilidadVolver={r.indice === 0 ? 'Volver a la portada' : 'Volver al paso anterior'}
      cabecera={
        <BarraDeAvance
          rellenos={r.rellenos}
          descripcion={descripcionDelAvance(r.pasos, r.indice)}
          pasoActual={r.indice + 1}
          totalPasos={r.pasos.length}
        />
      }
      claveContenido={r.paso.clave}
      direccion={r.direccion}
      desplazarA={r.desplazar}
      pie={
        <View style={estilos.pie}>
          {r.fallo ? (
            <View accessibilityLiveRegion="polite" style={[estilos.fallo, { borderColor: c.danger, backgroundColor: c.cardBgAlt }]}>
              <Text style={[estilos.textoDelFallo, { color: c.danger }]}>{r.fallo.mensaje}</Text>
              {r.fallo.tipo !== 'faltaAlgo' ? (
                <Presionable
                  accessibilityRole="button"
                  accessibilityLabel="Reintentar"
                  onPress={() => void r.siguiente()}
                  style={[estilos.reintentar, { borderColor: c.border }]}
                >
                  <Text style={[estilos.textoReintentar, { color: c.goldInk }]}>Reintentar</Text>
                </Presionable>
              ) : null}
            </View>
          ) : null}
          <GoldButton label={etiquetaDelBoton} onPress={() => void r.siguiente()} loading={r.guardando} icon="arrow" />
        </View>
      }
    >
      <PasoDelDiagnostico
        paso={r.paso}
        valores={r.valores}
        errores={r.errores}
        alCambiar={r.cambiar}
        alMedir={r.alMedir}
      />
    </MarcoDePaso>
  );
}

const estilos = StyleSheet.create({
  cargando: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pie: { gap: 10 },
  fallo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 52,
  },
  textoDelFallo: { flex: 1, fontSize: 15, lineHeight: 21, fontFamily: fuentes.media },
  reintentar: { minHeight: 48, minWidth: 48, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, justifyContent: 'center' },
  textoReintentar: { fontSize: 16, fontFamily: fuentes.media },
});
