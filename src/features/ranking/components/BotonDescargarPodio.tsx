import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useCapacidades } from '../../admin/hooks/useCapacidades';
import { Icon, TAMANO_ICONO } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useTheme } from '../../../theme/ThemeContext';
import type { EntradaRankingDto } from '../api/rankingApi';
import { useCompartirPodio } from '../hooks/useCompartirPodio';
import { ANCHO_DE_LA_TARJETA, ALTO_DE_LA_TARJETA } from '../utils/medidasDelPodio';
import { podioParaCompartir } from '../utils/podioParaCompartir';
import type { ClaveDeTabla } from '../utils/tablasDeRanking';
import { TarjetaDelPodioParaCompartir } from './TarjetaDelPodioParaCompartir';

/**
 * «Descargar» en Comunidad → Ranking: la imagen del podio de la tabla que se está mirando, lista para
 * compartir (spec 006 del backend; pedido del dueño: «que haya opción para descargar en los podios»).
 *
 * - **Solo con el permiso del servidor**: la capacidad `canExportRanking` de `GET /mentor/context`
 *   (`useCapacidades().capacidades.exportarRanking`: líder de mentores, alquimista, administrador y Soporte TI).
 *   Sin ella —aprendiz, guía, mentor, o un backend anterior que no lo manda— no se dibuja nada, ni un hueco.
 *   Es lo que se MUESTRA: la imagen se arma en el teléfono con `GET /ranking`, que todos pueden leer, así que no
 *   hay nada que proteger más allá de no ofrecérselo a quien no le corresponde.
 * - **La consulta se hace al abrir Ranking** y no al abrir Comunidad (V-3 del 2026-09-26: lo que no se ve, no se
 *   pide): este componente solo se monta dentro de esa sección.
 * - **Sin filas no hay botón**: una tabla vacía daría una imagen de tres lugares libres.
 * - **Qué se descarga**: una foto fija de las filas del momento en que se toca (`podioParaCompartir`), las mismas
 *   de la tabla en pantalla. La tarjeta (`TarjetaDelPodioParaCompartir`) se monta FUERA de pantalla solo mientras
 *   se genera la imagen y se desmonta al terminar: el resto del tiempo no cuesta nada.
 *
 * La respuesta al tacto es la de toda la app (`Presionable`, escala 0,97 al apoyar); el botón mide 48 de alto
 * y, mientras prepara la imagen, dice «Preparando…» y no recibe otro toque. El éxito no lleva diálogo: se abre la
 * hoja de compartir (o baja el archivo en la web), que ya lo dice.
 */
export function BotonDescargarPodio({
  entradas,
  tabla,
  fechaDelCorte,
}: {
  /** Las filas de la tabla que se mira (`entradasDeLaTabla`), tal como las muestra la pantalla. */
  entradas: readonly EntradaRankingDto[];
  tabla: ClaveDeTabla;
  /** `RankingAgregadoDto.fecha`: la fecha del corte, que sale escrita en la imagen. */
  fechaDelCorte?: string | null;
}) {
  const { c } = useTheme();
  const { capacidades } = useCapacidades();
  const { enCurso, preparando, tarjetaRef, alTarjetaLista, compartir } = useCompartirPodio();

  if (!capacidades.exportarRanking || entradas.length === 0) return null;

  return (
    <View>
      <Presionable
        onPress={() => void compartir(podioParaCompartir(entradas, tabla, fechaDelCorte))}
        disabled={preparando}
        accessibilityRole="button"
        accessibilityLabel="Descargar la imagen del podio"
        accessibilityHint="Prepara una imagen vertical del podio para compartirla o guardarla"
        accessibilityState={{ disabled: preparando, busy: preparando }}
        style={[
          estilos.boton,
          { borderColor: c.borderStrong, backgroundColor: c.cardBg, opacity: preparando ? 0.6 : 1 },
        ]}
      >
        <Icon name="forward" size={TAMANO_ICONO.normal} color={c.goldInk} />
        <Text style={[estilos.texto, { color: c.goldInk }]}>{preparando ? 'Preparando…' : 'Descargar'}</Text>
      </Presionable>

      {enCurso ? (
        /* Fuera de pantalla, sin tocar y sin que el lector de pantalla pase por ahí: es solo el molde de la
           imagen. `left` negativo y no `opacity: 0`: la vista tiene que dibujarse de verdad para capturarse. */
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={estilos.fueraDePantalla}
        >
          <TarjetaDelPodioParaCompartir ref={tarjetaRef} podio={enCurso} onListo={alTarjetaLista} />
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  /* 48 de alto: el área táctil cómoda de la app (AGENTS.md §4). */
  boton: {
    minHeight: 48,
    /* Que «Descargar» y «Preparando…» ocupen lo mismo: al cambiar de texto, la línea de al lado no se re-acomoda. */
    minWidth: 152,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  texto: { fontFamily: 'Jost_700Bold', fontSize: 15, lineHeight: 20 },
  fueraDePantalla: {
    position: 'absolute',
    top: 0,
    left: -(ANCHO_DE_LA_TARJETA + 200),
    width: ANCHO_DE_LA_TARJETA,
    height: ALTO_DE_LA_TARJETA,
  },
});
