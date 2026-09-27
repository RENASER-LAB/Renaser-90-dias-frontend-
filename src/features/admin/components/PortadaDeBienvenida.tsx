import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { BotonPrincipal, BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { getTokenSesion, notificarSesionVencida } from '../../../services/http/apiClient';
import { useTheme } from '../../../theme/ThemeContext';
import { elegirFotoCuadrada } from '../../auth/utils/elegirFotoDePerfil';
import { subirImagenAS3 } from '../../community/api/wallApi';
import {
  confirmarPortadaDeBienvenida,
  rutaDeLaTarjetaDeMuestra,
  solicitarSubidaDePortada,
  volverALaPortadaOriginal,
} from '../api/bienvenidaApi';
import type { BienvenidaApi, PortadaDeBienvenidaApi } from '../api/bienvenidaSchemas';
import { useTarjetaDeMuestra } from '../hooks/useTarjetaDeMuestra';
import { accionesDeLaPortada, estadoDeLaPortada, mensajeDeErrorDeBienvenida, nombreParaLaMuestra } from '../utils/bienvenida';
import { confirmar } from '../utils/dialogo';
import { prepararPortadaCandidata } from '../utils/portadaCandidata';
import { traerTarjetaDeMuestra, type EntornoDeLaTarjeta } from '../utils/tarjetaDeMuestra';

/** El lienzo de la tarjeta que dibuja el servidor es de 1200 × 1200: la portada se sube de ese lado. */
export const LADO_DE_LA_PORTADA = 1200;

const MOTIVO_DEL_PERMISO =
  'Renaser necesita acceder a tus fotos para que puedas elegir la portada de la tarjeta de bienvenida.';

type Flujo =
  | { paso: 'quieto' }
  | { paso: 'subiendo' }
  | { paso: 'revisando' }
  | { paso: 'lista'; ruta: string; uri: string; nombre: string }
  | { paso: 'usando'; ruta: string; uri: string; nombre: string }
  | { paso: 'rechazada'; mensaje: string }
  | { paso: 'fallo'; mensaje: string };

/**
 * La portada de la tarjeta de bienvenida (backend D-210): cómo se ve hoy con el nombre de ejemplo,
 * cambiarla por una imagen del teléfono —con vista previa antes de usarla— y volver a la original.
 *
 * Nada queda vigente hasta «Usar esta portada»: subir la imagen solo deja una candidata, que el
 * servidor revisa (formato, peso, medidas y que el nombre se lea) al dibujar la vista previa.
 */
export function PortadaDeBienvenida({
  portada,
  nombre,
  entorno,
  onCambio,
}: {
  portada: PortadaDeBienvenidaApi;
  /** El nombre de ejemplo, tal como está escrito (vacío = «María»). */
  nombre: string;
  entorno: EntornoDeLaTarjeta;
  onCambio: (nueva: BienvenidaApi) => void;
}) {
  const { c, t } = useTheme();
  const [version, setVersion] = useState(0);
  const vigente = useTarjetaDeMuestra(nombre, version, entorno);
  const [flujo, setFlujo] = useState<Flujo>({ paso: 'quieto' });
  const [volviendo, setVolviendo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const acciones = accionesDeLaPortada(portada);
  const ocupado = flujo.paso === 'subiendo' || flujo.paso === 'revisando' || flujo.paso === 'usando' || volviendo;
  const cuerpo = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];

  // Si se sale de la pantalla con una candidata a la vista, su imagen (un object URL en web) se libera.
  const candidataALaVista = useRef<string | null>(null);
  candidataALaVista.current = flujo.paso === 'lista' || flujo.paso === 'usando' ? flujo.uri : null;
  useEffect(
    () => () => {
      if (candidataALaVista.current) entorno.liberar(candidataALaVista.current);
    },
    [entorno],
  );

  const soltarCandidata = () => {
    if (flujo.paso === 'lista' || flujo.paso === 'usando') entorno.liberar(flujo.uri);
  };

  const elegir = async () => {
    // Primero se saca de la pantalla la candidata anterior y recién después se libera su imagen.
    setFlujo({ paso: 'quieto' });
    soltarCandidata();
    setAviso(null);
    setError(null);
    const nombreDeLaMuestra = nombreParaLaMuestra(nombre);
    const resultado = await prepararPortadaCandidata({
      elegir: () => elegirFotoCuadrada({ lado: LADO_DE_LA_PORTADA, motivoDelPermiso: MOTIVO_DEL_PERMISO }),
      pedirSubida: solicitarSubidaDePortada,
      subir: subirImagenAS3,
      traerMuestra: async ruta => {
        const muestra = await traerTarjetaDeMuestra(
          rutaDeLaTarjetaDeMuestra(nombreDeLaMuestra, ruta),
          getTokenSesion(),
          entorno,
        );
        if (!muestra.ok && muestra.status === 401) notificarSesionVencida();
        return muestra;
      },
      alAvanzar: paso => setFlujo({ paso }),
    });
    if (resultado.tipo === 'cancelada') setFlujo({ paso: 'quieto' });
    else if (resultado.tipo === 'lista') setFlujo({ paso: 'lista', ruta: resultado.ruta, uri: resultado.uri, nombre: nombreDeLaMuestra });
    else setFlujo({ paso: resultado.tipo, mensaje: resultado.mensaje });
  };

  const usar = async () => {
    if (flujo.paso !== 'lista') return;
    setFlujo({ ...flujo, paso: 'usando' });
    try {
      const nueva = await confirmarPortadaDeBienvenida(flujo.ruta);
      setFlujo({ paso: 'quieto' });
      entorno.liberar(flujo.uri);
      setVersion(v => v + 1);
      setAviso('Listo: la tarjeta ya tiene la portada nueva.');
      onCambio(nueva);
    } catch (e) {
      setFlujo({ ...flujo, paso: 'lista' });
      setError(mensajeDeErrorDeBienvenida(e, 'No se pudo usar esta portada. Vuelve a intentar.'));
    }
  };

  const cancelar = () => {
    setFlujo({ paso: 'quieto' });
    soltarCandidata();
    setError(null);
  };

  const volverALaOriginal = async () => {
    const acepto = await confirmar(
      '¿Volver a la portada original?',
      'La tarjeta de bienvenida vuelve a tener la portada de Operaciones.',
      { ok: 'Sí, volver a la original' },
    );
    if (!acepto) return;
    setVolviendo(true);
    setAviso(null);
    setError(null);
    try {
      const nueva = await volverALaPortadaOriginal();
      setVersion(v => v + 1);
      setAviso('Listo: la tarjeta volvió a la portada original.');
      onCambio(nueva);
    } catch (e) {
      setError(mensajeDeErrorDeBienvenida(e, 'No se pudo volver a la portada original. Vuelve a intentar.'));
    } finally {
      setVolviendo(false);
    }
  };

  const hayCandidata = flujo.paso === 'lista' || flujo.paso === 'usando';

  return (
    <View style={{ gap: 12 }}>
      <TituloDeSeccion detalle={`Así la recibe una persona que se llama «${nombreParaLaMuestra(nombre)}».`}>
        La tarjeta de bienvenida
      </TituloDeSeccion>

      <VistaDeLaTarjeta
        uri={vigente.uri}
        cargando={vigente.cargando}
        error={vigente.error}
        descripcion={`Tarjeta de bienvenida con el nombre ${nombreParaLaMuestra(nombre)}`}
      />
      <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 23 }]}>{estadoDeLaPortada(portada)}</Text>

      {hayCandidata ? (
        <View style={[estilos.candidata, { borderColor: c.gold, backgroundColor: c.goldWash }]}>
          <Text style={[estilos.subtitulo, { color: c.textStrong }]}>Así se vería la tarjeta</Text>
          <Text style={cuerpo}>Con la imagen que elegiste y el nombre «{flujo.nombre}». Todavía no se usa.</Text>
          <VistaDeLaTarjeta uri={flujo.uri} cargando={false} error={null} descripcion="Tarjeta con la portada nueva" />
          <BotonPrincipal etiqueta="Usar esta portada" onPress={() => void usar()} cargando={flujo.paso === 'usando'} />
          <BotonSecundario etiqueta="Elegir otra" onPress={() => void elegir()} deshabilitado={flujo.paso === 'usando'} />
          <BotonSecundario etiqueta="Cancelar" onPress={cancelar} deshabilitado={flujo.paso === 'usando'} />
        </View>
      ) : null}

      {flujo.paso === 'subiendo' || flujo.paso === 'revisando' ? (
        <View style={estilos.fila}>
          <ActivityIndicator color={c.goldInk} />
          <Text style={[...cuerpo, { flexShrink: 1 }]}>
            {flujo.paso === 'subiendo' ? 'Subiendo la imagen…' : 'Revisando cómo queda la tarjeta…'}
          </Text>
        </View>
      ) : null}

      {flujo.paso === 'rechazada' || flujo.paso === 'fallo' ? (
        <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
          {flujo.mensaje}
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
          {error}
        </Text>
      ) : null}
      {aviso ? <Text style={[t.body, { color: c.success, fontSize: 16, lineHeight: 23 }]}>{aviso}</Text> : null}

      {!hayCandidata ? (
        <>
          <BotonSecundario
            etiqueta={flujo.paso === 'rechazada' ? 'Elegir otra imagen' : 'Cambiar la portada'}
            icono="image"
            onPress={() => void elegir()}
            deshabilitado={!acciones.puedeCambiar || ocupado}
          />
          {acciones.aviso ? <Text style={cuerpo}>{acciones.aviso}</Text> : null}
          {acciones.puedeVolver ? (
            <BotonSecundario
              etiqueta="Volver a la portada original"
              onPress={() => void volverALaOriginal()}
              cargando={volviendo}
              deshabilitado={ocupado && !volviendo}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

/** La tarjeta cuadrada, con su estado de carga y su error. */
function VistaDeLaTarjeta({
  uri,
  cargando,
  error,
  descripcion,
}: {
  uri: string | null;
  cargando: boolean;
  error: string | null;
  descripcion: string;
}) {
  const { c, t } = useTheme();
  return (
    <View style={[estilos.marco, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      {uri ? (
        <Image source={{ uri }} style={estilos.imagen} resizeMode="cover" accessible accessibilityLabel={descripcion} />
      ) : (
        <View style={[estilos.imagen, estilos.vacia]}>
          {cargando ? (
            <ActivityIndicator color={c.goldInk} />
          ) : (
            <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23, textAlign: 'center' }]}>
              {error ?? 'Sin vista previa.'}
            </Text>
          )}
        </View>
      )}
      {uri && error ? (
        <Text style={[t.body, estilos.errorSobreImagen, { color: c.danger, fontSize: 16 }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  marco: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 420, alignSelf: 'center' },
  imagen: { width: '100%', aspectRatio: 1 },
  vacia: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  errorSobreImagen: { padding: 10 },
  candidata: { borderWidth: 1.5, borderRadius: 16, padding: 14, gap: 12 },
  subtitulo: { fontFamily: 'Jost_500Medium', fontSize: 18, lineHeight: 24 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
