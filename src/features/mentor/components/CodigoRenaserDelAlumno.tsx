import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Aparicion } from '../../../components/Aparicion';
import { Card, MicroLabel } from '../../../components/ui';
import { useTheme } from '../../../theme/ThemeContext';
import { ENERGIA_MAXIMA, PREGUNTAS_RADAR } from '../../radar/config/configRadar';
import type { RegistroRadarApi } from '../../radar/types/radar.types';
import { useCodigoRenaserDelAlumno } from '../hooks/useCodigoRenaserDelAlumno';
import { diaLargo } from '../utils/fechasLegibles';

/**
 * El Código Renaser del aprendiz: lo que escribió, hora por hora, durante sus primeros días.
 *
 * **Esto es texto íntimo.** Alguien contestó "¿qué evito?" a las once de la mañana de su tercer
 * día. Por eso la sección no lo decora: sin iconos, sin colores de estado, sin insignias y sin
 * ninguna cifra que resuma o puntúe a la persona. Se muestra agrupado por día y ordenado por
 * hora, y nada más — leerlo es el objetivo, no medirlo.
 *
 * Las cuatro preguntas salen de `PREGUNTAS_RADAR`, las mismas constantes con las que se le
 * preguntaron. Copiarlas acá con otras palabras haría que el mentor lea un enunciado distinto
 * del que la persona contestó.
 *
 * ## Vacío es el caso normal
 *
 * El Código Renaser se apaga el día 8 y no vuelve, así que un aprendiz que va por el día 40 no
 * tiene registros nuevos. Una lista vacía es eso, no un fallo: una línea y se termina.
 *
 * ## Si el endpoint no está, acá no hay nada
 *
 * Un 404 (sin desplegar) o un 403 (ya no acompaña a esta persona) no dibujan la sección.
 */
export function CodigoRenaserDelAlumno({ grupoId, alumnoId }: { grupoId: string | null; alumnoId: string }) {
  const { c, t } = useTheme();
  const { dias, hayMas, cargando, cargandoMas, fallo, cargarMas } = useCodigoRenaserDelAlumno(
    grupoId,
    alumnoId,
  );

  if (fallo === 'no_disponible' || fallo === 'sin_permiso' || fallo === 'sin_celula') return null;
  /* Sin grupo no hay a quién preguntarle: no se dibuja un "Sin registros" que en realidad
     significa "no pregunté". */
  if (!grupoId) return null;

  return (
    <Aparicion retardo={200} style={{ marginTop: 20 }}>
      <MicroLabel>CÓDIGO RENASER</MicroLabel>
      <Card style={estilos.tarjeta}>
        {cargando ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 13 }]}>Cargando sus registros…</Text>
        ) : fallo ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 13, lineHeight: 19 }]}>
            {fallo === 'sin_red'
              ? 'No se pudieron cargar sus registros. Revisa tu conexión y vuelve a entrar.'
              : 'No se pudieron cargar sus registros.'}
          </Text>
        ) : dias.length === 0 ? (
          <Text style={[t.body, { color: c.textSoft, fontSize: 13 }]}>Sin registros.</Text>
        ) : (
          <>
            {dias.map((dia, indice) => (
              <View key={dia.fecha ?? 'sin-fecha'} style={indice > 0 ? estilos.diaSiguiente : undefined}>
                <Text style={[t.body, { color: c.text, fontSize: 13.5, fontFamily: 'Jost_500Medium' }]}>
                  {/* `null` sólo aparece si `createdAt` llegó ilegible. El registro se muestra
                      igual: perder lo que alguien escribió por no poder ubicarlo en el
                      calendario sería peor que mostrarlo sin fecha. */}
                  {dia.fecha ? diaLargo(dia.fecha) : 'Sin fecha'}
                </Text>
                {dia.registros.map(({ registro, hora }) => (
                  <RegistroDeHora key={registro.id} registro={registro} hora={hora} />
                ))}
              </View>
            ))}

            {hayMas ? (
              <Pressable
                onPress={() => void cargarMas()}
                disabled={cargandoMas}
                accessibilityRole="button"
                accessibilityLabel="Ver registros anteriores"
                accessibilityState={{ disabled: cargandoMas }}
                style={[estilos.verMas, { borderColor: c.border, opacity: cargandoMas ? 0.6 : 1 }]}
              >
                <Text style={[t.body, { color: c.goldInk, fontSize: 13.5, fontFamily: 'Jost_500Medium' }]}>
                  {cargandoMas ? 'Cargando…' : 'Ver registros anteriores'}
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
      </Card>
    </Aparicion>
  );
}

/** Un registro: la hora, las cuatro respuestas y el nivel de energía. En ese orden y sin adornos. */
function RegistroDeHora({ registro, hora }: { registro: RegistroRadarApi; hora: string | null }) {
  const { c, t } = useTheme();

  return (
    <View style={[estilos.registro, { borderColor: c.border }]}>
      <View style={estilos.cabecera}>
        {/* El guion es literal: si no se pudo leer la hora, no se inventa ninguna. */}
        <Text style={[t.micro, { color: c.micro, fontSize: 11.5 }]}>{hora ?? '—'}</Text>
        <Text style={[t.micro, { color: c.textSoft, fontSize: 11.5 }]}>
          Energía {registro.energyLevel} / {ENERGIA_MAXIMA}
        </Text>
      </View>

      {PREGUNTAS_RADAR.map(pregunta => {
        const texto = registro[pregunta.campo]?.trim();
        return (
          <View key={pregunta.campo} style={estilos.respuesta}>
            <Text style={[t.micro, { color: c.micro, fontSize: 11 }]}>{pregunta.titulo}</Text>
            <Text style={[t.body, { color: c.text, fontSize: 13.5, lineHeight: 19 }]}>
              {texto || '—'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { marginTop: 8 },
  diaSiguiente: { marginTop: 18 },
  registro: { borderTopWidth: 1, paddingTop: 10, marginTop: 10, gap: 8 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  respuesta: { gap: 2 },
  // 44 px: pulsable con el pulgar sin apuntar (AGENTS.md §4).
  verMas: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
});
