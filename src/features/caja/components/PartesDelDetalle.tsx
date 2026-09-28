import React from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Checkbox } from '../../../components/Checkbox';
import { useTheme } from '../../../theme/ThemeContext';
import type { DatosDelEnvio, DestinoDeCaja, ElementoDeContenido, PasoDelHistorial } from '../api/cajaSchemas';
import { lineasDelDestino } from '../utils/contenidoYDestino';
import { COURIERS_CONOCIDOS, notaDelPaso, textoDelCosto, textoDelPaso, type FormularioDeEnvio } from '../utils/estadosDeCaja';

/**
 * Las partes del detalle de una caja que solo muestran lo que llega: dónde enviarla, el checklist,
 * el envío y el historial. Sin llamadas al servidor: las acciones las hace la pantalla.
 */

export function Titulo({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Text accessibilityRole="header" style={[estilos.titulo, { color: c.textStrong }]}>
      {children}
    </Text>
  );
}

/** «Enviar a»: lo que pidió cambiar el aprendiz va primero y destacado; los teléfonos se tocan. */
export function DestinoDeLaCaja({ destino }: { destino: DestinoDeCaja | null | undefined }) {
  const { c, t } = useTheme();
  const lineas = lineasDelDestino(destino);
  return (
    <View style={{ gap: 8 }}>
      <Titulo>Enviar a</Titulo>
      {lineas.length === 0 ? (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Sin datos de envío.</Text>
      ) : (
        <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
          {lineas.map(linea => {
            const valor = (
              <Text
                style={[
                  t.body,
                  { color: linea.destacada ? c.goldInk : c.textStrong, fontSize: 16, fontFamily: linea.destacada ? 'Jost_700Bold' : 'Jost_400Regular' },
                ]}
              >
                {linea.valor}
              </Text>
            );
            return (
              <View key={linea.rotulo} style={estilos.linea}>
                <Text style={[t.body, estilos.rotulo, { color: c.textSoft }]}>{linea.rotulo}</Text>
                {linea.tipo === 'tel' ? (
                  <Pressable
                    onPress={() => void Linking.openURL(`tel:${linea.valor.replace(/[^\d+]/g, '')}`)}
                    accessibilityRole="link"
                    accessibilityLabel={`Llamar a ${linea.valor}`}
                    style={{ flex: 1 }}
                  >
                    {valor}
                  </Pressable>
                ) : (
                  <View style={{ flex: 1 }}>{valor}</View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function ChecklistDeLaCaja({
  contenido,
  editable,
  onAlternar,
}: {
  contenido: ElementoDeContenido[];
  editable: boolean;
  onAlternar: (valor: string) => void;
}) {
  const { c, t } = useTheme();
  if (contenido.length === 0) return null;
  const marcados = contenido.filter(e => e.marcado).length;
  return (
    <View style={{ gap: 8 }}>
      <Titulo>
        Contenido · {marcados}/{contenido.length}
      </Titulo>
      {contenido.map(e =>
        editable ? (
          <Checkbox key={e.valor} checked={!!e.marcado} title={e.etiqueta} onToggle={() => onAlternar(e.valor)} />
        ) : (
          <Text key={e.valor} style={[t.body, { color: e.marcado ? c.textStrong : c.textSoft, fontSize: 16 }]}>
            {e.marcado ? '✓ ' : '○ '}
            {e.etiqueta}
          </Text>
        ),
      )}
    </View>
  );
}

/** El formulario del envío, mientras se arma: por dónde, courier, código y costo. */
export function FormularioDelEnvio({
  valor,
  onCambio,
}: {
  valor: FormularioDeEnvio;
  onCambio: (nuevo: FormularioDeEnvio) => void;
}) {
  const { c, t } = useTheme();
  const campo = (clave: keyof FormularioDeEnvio, rotulo: string, extra?: { teclado?: 'decimal-pad'; ejemplo?: string }) => (
    <View style={{ gap: 6 }}>
      <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: 'Jost_500Medium' }]}>{rotulo}</Text>
      <TextInput
        value={valor[clave]}
        onChangeText={texto => onCambio({ ...valor, [clave]: texto })}
        placeholder={extra?.ejemplo}
        placeholderTextColor={c.micro}
        keyboardType={extra?.teclado}
        autoCorrect={false}
        accessibilityLabel={rotulo}
        style={[t.body, estilos.campo, { backgroundColor: c.cardBg, borderColor: c.border, color: c.text }]}
      />
    </View>
  );
  return (
    <View style={{ gap: 12 }}>
      <Titulo>Envío</Titulo>
      {campo('medio', 'Por dónde se envió', { ejemplo: 'Courier, inDrive…' })}
      {campo('courier', 'Courier')}
      <View style={estilos.atajos}>
        {COURIERS_CONOCIDOS.map(nombre => {
          const elegido = valor.courier.trim().toLowerCase() === nombre.toLowerCase();
          return (
            <Pressable
              key={nombre}
              onPress={() => onCambio({ ...valor, courier: nombre })}
              accessibilityRole="button"
              accessibilityLabel={nombre}
              accessibilityState={{ selected: elegido }}
              style={[estilos.atajo, { borderColor: elegido ? c.gold : c.border, backgroundColor: elegido ? c.goldWash : c.cardBg }]}
            >
              <Text style={[t.body, { color: c.textStrong, fontSize: 16 }]}>{nombre}</Text>
            </Pressable>
          );
        })}
      </View>
      {campo('codigo', 'Código', { ejemplo: 'Guía, placa o pedido' })}
      {campo('costo', 'Costo (S/)', { teclado: 'decimal-pad', ejemplo: '0.00' })}
    </View>
  );
}

/** El envío ya hecho: «Olva · 123456 · S/ 15.00». */
export function DatosDelEnvioHecho({ envio }: { envio: DatosDelEnvio | null | undefined }) {
  const { c, t } = useTheme();
  if (!envio) return null;
  const lineas = [
    envio.medio?.trim() ? ['Por dónde', envio.medio.trim()] : null,
    envio.courier?.trim() ? ['Courier', envio.courier.trim()] : null,
    envio.codigo?.trim() ? ['Código', envio.codigo.trim()] : null,
    textoDelCosto(envio.costo) ? ['Costo', textoDelCosto(envio.costo)!] : null,
  ].filter((l): l is string[] => l !== null);
  if (lineas.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <Titulo>Envío</Titulo>
      <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
        {lineas.map(([rotulo, valor]) => (
          <View key={rotulo} style={estilos.linea}>
            <Text style={[t.body, estilos.rotulo, { color: c.textSoft }]}>{rotulo}</Text>
            <Text style={[t.body, { color: c.textStrong, fontSize: 16, flex: 1 }]}>{valor}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function HistorialDeLaCaja({ historial }: { historial: PasoDelHistorial[] | null | undefined }) {
  const { c, t } = useTheme();
  if (!historial || historial.length === 0) return null;
  return (
    <View style={{ gap: 6 }}>
      <Titulo>Historial</Titulo>
      {historial.map((paso, i) => {
        const nota = notaDelPaso(paso);
        return (
          <View key={`${paso.estado}-${paso.en ?? i}-${i}`}>
            <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{textoDelPaso(paso)}</Text>
            {nota ? <Text style={[t.body, { color: c.textSoft, fontSize: 15, fontStyle: 'italic' }]}>«{nota}»</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontFamily: 'Jost_500Medium', fontSize: 18, lineHeight: 24 },
  tarjeta: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  linea: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  rotulo: { fontSize: 15, width: 104 },
  campo: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, minHeight: 52, fontSize: 17 },
  atajos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  atajo: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, justifyContent: 'center' },
});
