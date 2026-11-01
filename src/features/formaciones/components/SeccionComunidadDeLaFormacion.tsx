import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { Interruptor } from '../../../components/Interruptor';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { useComunidadDeLaFormacion } from '../hooks/useComunidadDeLaFormacion';
import { NOMBRE_DEL_TIPO, lineaDelTipo } from '../utils/comunidadDeLaFormacion';

/**
 * «Comunidad» en el detalle de una formación (Administración, spec 024): los cuatro tipos de comunidad —general, grupo con mentor,
 * soporte y directos— con un interruptor cada uno. Apagar uno **esconde** sus conversaciones para toda la formación sin borrar un
 * mensaje (vuelven al prender) y pide confirmación diciendo cuántas esconde; prender guarda al instante. Rige al instante y sin app
 * nueva. Solo Administración y Alquimista (la pantalla que la contiene ya es de ellos).
 *
 * Cada fila mide 64 y el interruptor, 48 de área táctil; el nombre va a 17 px y la línea de ayuda a 15. Lo guardado se dice con
 * `ConfirmacionEnLinea` (y una vibración de logro); los errores, en un diálogo.
 *
 * **Contra un backend anterior** (404/403 al leer) la sección no se dibuja: la pantalla queda como estaba.
 */
export function SeccionComunidadDeLaFormacion({ codigo }: { codigo: string }) {
  const { c, t } = useTheme();
  const { comunidad, cargando, fallo, ocupados, aviso, limpiarAviso, cambiar, recargar } = useComunidadDeLaFormacion(codigo);

  if (fallo?.noDisponible) return null;
  if (cargando && !comunidad) return null;

  return (
    <View style={estilos.seccion}>
      <TituloDeSeccion>Comunidad</TituloDeSeccion>
      {fallo ? (
        <View style={{ gap: 8 }}>
          <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16 }]}>
            {fallo.mensaje}
          </Text>
          <BotonSecundario etiqueta="Reintentar" onPress={() => void recargar()} />
        </View>
      ) : null}
      {comunidad ? (
        <View style={[estilos.caja, { backgroundColor: c.cardBg, borderColor: c.border }]}>
          {comunidad.tipos.map((tipo, indice) => (
            <View
              key={tipo.tipo}
              style={[estilos.fila, indice > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider } : null]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[t.body, estilos.nombre, { color: c.textStrong }]}>{NOMBRE_DEL_TIPO[tipo.tipo]}</Text>
                <Text style={[t.small, estilos.ayuda, { color: c.textSoft }]}>{lineaDelTipo(tipo)}</Text>
              </View>
              <Interruptor
                valor={tipo.prendido}
                onCambiar={nuevo => void cambiar(tipo.tipo, nuevo)}
                etiqueta={NOMBRE_DEL_TIPO[tipo.tipo]}
                deshabilitado={ocupados[tipo.tipo] === true}
              />
            </View>
          ))}
        </View>
      ) : null}
      {aviso ? <ConfirmacionEnLinea key={aviso.clave} texto={aviso.texto} onTerminar={limpiarAviso} /> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: { gap: 10 },
  caja: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 8 },
  nombre: { fontSize: 17, fontFamily: fuentes.media },
  ayuda: { fontSize: 15, lineHeight: 20 },
});
