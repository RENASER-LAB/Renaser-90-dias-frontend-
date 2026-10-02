import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../components/Icon';
import { BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { mensajeDeError } from '../../../services/http/apiClient';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { confirmar } from '../../admin/utils/dialogo';
import { subirImagenAS3 } from '../../community/api/wallApi';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/RenasiaLauncher';
import {
  confirmarFondo,
  guardarContenidoDeLaCaja,
  leerContenidoDeLaCaja,
  leerFondoDeLaCarta,
  pedirSubidaDelFondo,
  volverAlFondoOriginal,
} from '../api/cajaApi';
import type { FondoDeLaCarta as EstadoDelFondo } from '../api/cajaSchemas';
import { Titulo } from '../components/PartesDelDetalle';
import { elementosParaGuardar, type ElementoEnEdicion } from '../utils/contenidoYDestino';
import { textoDelFondo } from '../utils/estadosDeCaja';
import { elegirImagen, subirImagen } from '../utils/subirImagen';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';

/**
 * Lo que lleva toda caja (la lista del checklist) y el fondo de la carta (spec §3 y §7). Solo el
 * Admin. Cambiar la lista no toca lo ya marcado en cada caja: los elementos conservan su valor.
 */
export function CajaContenidoScreen({ onVolver }: { onVolver: () => void }) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const [elementos, setElementos] = useState<ElementoEnEdicion[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null);
  const siguienteClave = useRef(0);
  const nuevaClave = () => `e${siguienteClave.current++}`;

  useSystemBackHandler(() => {
    onVolver();
    return true;
  });

  const cargar = async () => {
    setCargando(true);
    setAviso(null);
    try {
      const contenido = await leerContenidoDeLaCaja();
      setElementos(contenido.elementos.map(e => ({ clave: nuevaClave(), valor: e.valor, etiqueta: e.etiqueta })));
    } catch (e) {
      setAviso({ texto: mensajeDeError(e, 'No se pudo cargar el contenido.'), error: true });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargar();
    // Solo al entrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cambiar = (clave: string, etiqueta: string) =>
    setElementos(lista => lista?.map(e => (e.clave === clave ? { ...e, etiqueta } : e)) ?? lista);
  const quitar = (clave: string) => setElementos(lista => lista?.filter(e => e.clave !== clave) ?? lista);
  const agregar = () => setElementos(lista => [...(lista ?? []), { clave: nuevaClave(), valor: null, etiqueta: '' }]);

  const guardar = async () => {
    if (!elementos) return;
    const resultado = elementosParaGuardar(elementos);
    if (!resultado.ok) {
      setAviso({ texto: resultado.mensaje, error: true });
      return;
    }
    setGuardando(true);
    setAviso(null);
    try {
      const guardado = await guardarContenidoDeLaCaja(resultado.elementos);
      setElementos(guardado.elementos.map(e => ({ clave: nuevaClave(), valor: e.valor, etiqueta: e.etiqueta })));
      setAviso({ texto: 'Guardado.', error: false });
    } catch (e) {
      setAviso({ texto: mensajeDeError(e, 'No se pudo guardar.'), error: true });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo="Contenido y carta" onVolver={onVolver} />
      <ScrollView
        {...barraAlDesplazar}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 36 + ESPACIO_PARA_LANZADOR,
          maxWidth: contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: 22,
        }}
      >
        <View style={{ gap: 10 }}>
          <Titulo>Lo que lleva la caja</Titulo>
          {cargando && !elementos ? <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Cargando…</Text> : null}
          {elementos?.map(e => (
            <View key={e.clave} style={estilos.fila}>
              <TextInput
                value={e.etiqueta}
                onChangeText={texto => cambiar(e.clave, texto)}
                placeholder="Nuevo elemento"
                placeholderTextColor={c.micro}
                accessibilityLabel="Elemento de la caja"
                style={[t.body, estilos.campo, { backgroundColor: c.cardBg, borderColor: c.border, color: c.text }]}
              />
              <Pressable
                onPress={() => quitar(e.clave)}
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${e.etiqueta || 'elemento'}`}
                hitSlop={6}
                style={[estilos.quitar, { borderColor: c.border }]}
              >
                <Icon name="close" size={18} color={c.danger} />
              </Pressable>
            </View>
          ))}
          {elementos ? (
            <>
              <BotonSecundario etiqueta="Agregar" icono="plus" onPress={agregar} deshabilitado={guardando} />
              <BotonPrincipal etiqueta="Guardar" onPress={() => void guardar()} cargando={guardando} />
            </>
          ) : !cargando ? (
            <BotonSecundario etiqueta="Reintentar" onPress={() => void cargar()} />
          ) : null}
          {aviso ? (
            <Text
              accessibilityRole={aviso.error ? 'alert' : undefined}
              style={[t.body, { color: aviso.error ? c.danger : c.success, fontSize: 16 }]}
            >
              {aviso.texto}
            </Text>
          ) : null}
        </View>

        <FondoDeLaCarta />
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Cambiar la imagen de fondo de la carta, o volver a la original. Se ve en «Ver carta» de cada caja.
 * Lee primero cómo está (`GET …/carta/fondo`): «Volver al original» solo si hay uno cambiado, y
 * «Cambiar fondo» solo si el servidor puede guardar la imagen.
 */
function FondoDeLaCarta() {
  const { c, t } = useTheme();
  const [fondo, setFondo] = useState<EstadoDelFondo | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; error: boolean } | null>(null);

  useEffect(() => {
    leerFondoDeLaCarta().then(setFondo, () => setFondo(null));
  }, []);

  const cambiar = async () => {
    setAviso(null);
    const resultado = await subirImagen({
      elegir: () => elegirImagen('galeria', 'elegir el fondo de la carta'),
      pedirSubida: pedirSubidaDelFondo,
      subir: subirImagenAS3,
      confirmar: confirmarFondo,
      alSubir: () => setOcupado(true),
    });
    setOcupado(false);
    if (resultado.tipo === 'lista') {
      setFondo(resultado.valor);
      setAviso({ texto: 'Listo: la carta tiene el fondo nuevo.', error: false });
    } else if (resultado.tipo === 'fallo') setAviso({ texto: resultado.mensaje, error: true });
  };

  const volver = async () => {
    if (!(await confirmar('¿Volver al fondo original?', undefined, { ok: 'Sí' }))) return;
    setOcupado(true);
    setAviso(null);
    try {
      setFondo(await volverAlFondoOriginal());
      setAviso({ texto: 'Listo: la carta volvió al fondo original.', error: false });
    } catch (e) {
      setAviso({ texto: mensajeDeError(e, 'No se pudo.'), error: true });
    } finally {
      setOcupado(false);
    }
  };

  const estado = textoDelFondo(fondo);
  // Sin estado leído se ofrecen los dos: el servidor dice que no si no corresponde.
  const puedeCambiar = fondo?.sePuedeCambiar !== false;
  const puedeVolver = fondo ? fondo.cambiado : true;

  return (
    <View style={{ gap: 10 }}>
      <Titulo>Fondo de la carta</Titulo>
      {estado ? <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{estado}</Text> : null}
      {puedeCambiar ? (
        <BotonSecundario etiqueta="Cambiar fondo" icono="image" onPress={() => void cambiar()} cargando={ocupado} />
      ) : (
        <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>Este servidor no guarda imágenes.</Text>
      )}
      {puedeVolver ? (
        <BotonSecundario etiqueta="Volver al original" onPress={() => void volver()} deshabilitado={ocupado} />
      ) : null}
      {aviso ? (
        <Text
          accessibilityRole={aviso.error ? 'alert' : undefined}
          style={[t.body, { color: aviso.error ? c.danger : c.success, fontSize: 16 }]}
        >
          {aviso.texto}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  campo: { flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, minHeight: 52, fontSize: 17 },
  quitar: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
