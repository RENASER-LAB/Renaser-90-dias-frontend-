import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { ConfirmacionEnLinea } from '../../../components/ConfirmacionEnLinea';
import { BotonPrincipal, BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { ApiError, getTokenSesion, notificarSesionVencida } from '../../../services/http/apiClient';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { confirmar } from '../../admin/utils/dialogo';
import { mensajeDeErrorDeBienvenida } from '../../admin/utils/bienvenida';
import { prepararPortadaCandidata } from '../../admin/utils/portadaCandidata';
import { entornoDeLaPlataforma, traerTarjetaDeMuestra } from '../../admin/utils/tarjetaDeMuestra';
import { elegirFotoCuadrada } from '../../auth/utils/elegirFotoDePerfil';
import { FotoDelGrupo, FotoDelPrograma } from '../../chat/components/AvatarDeChat';
import { subirImagenAS3 } from '../../community/api/wallApi';
import {
  confirmarImagenDeLaFormacion,
  leerImagenDeLaFormacion,
  rutaDeLaVistaDeLaImagen,
  solicitarSubidaDeImagen,
  volverALaImagenOriginal,
  type ImagenDeLaFormacionApi,
} from '../api/imagenDeLaFormacionApi';
import { FORMACION_POR_DEFECTO } from '../types/formaciones.types';
import { accionesDeLaImagen, estadoDeLaImagen, etiquetaDeVolver, imagenEsDe } from '../utils/imagenDeLaFormacion';

/** La imagen se sube cuadrada: en el chat es un círculo y el servidor la recorta al centro. */
export const LADO_DE_LA_IMAGEN = 1200;
const LADO_DE_LA_VISTA = 72;

const MOTIVO_DEL_PERMISO = 'Renaser necesita acceder a tus fotos para que puedas elegir la imagen de la formación.';

type Flujo =
  | { paso: 'quieto' }
  | { paso: 'subiendo' }
  | { paso: 'revisando' }
  | { paso: 'lista'; ruta: string; uri: string }
  | { paso: 'usando'; ruta: string; uri: string }
  | { paso: 'rechazada'; mensaje: string }
  | { paso: 'fallo'; mensaje: string };

/**
 * «Imagen de la formación» en el detalle de una formación (Administración, spec 035, D-308): la imagen que ve esa formación en el chat, en su
 * comunidad general y en sus grupos sin foto propia. Elegir una del teléfono (con vista previa antes de usarla), verla como queda y volver atrás.
 *
 * - Nada queda vigente hasta «Usar esta imagen»: subirla solo deja una candidata que el servidor revisa (formato, peso y medidas).
 * - Sin imagen propia, el Diplomado y la Certificación usan la de la Escuela; sin ninguna, el chat usa el fénix y la tarjeta de siempre.
 * - Movimiento: ninguno propio. Lo guardado se dice con `ConfirmacionEnLinea` y una vibración de logro; los errores, en el texto.
 * - **Contra un backend anterior** (404) o sin permiso (403) la sección no se dibuja: la pantalla queda como estaba.
 */
export function ImagenDeLaFormacion({ codigo }: { codigo: string }) {
  const { c, t } = useTheme();
  const entorno = useMemo(() => entornoDeLaPlataforma(), []);
  const [imagen, setImagen] = useState<ImagenDeLaFormacionApi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [noDisponible, setNoDisponible] = useState(false);
  const [vigente, setVigente] = useState<string | null>(null);
  const [flujo, setFlujo] = useState<Flujo>({ paso: 'quieto' });
  const [volviendo, setVolviendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ clave: number; texto: string } | null>(null);
  const turno = useRef(0);
  const enLaEscuela = codigo.toUpperCase() === FORMACION_POR_DEFECTO;

  const leer = useCallback(async () => {
    const mio = ++turno.current;
    setCargando(true);
    try {
      const leida = await leerImagenDeLaFormacion(codigo);
      if (mio !== turno.current) return;
      setImagen(imagenEsDe(leida, codigo) ? leida : null);
      setNoDisponible(!imagenEsDe(leida, codigo));
    } catch (e) {
      if (mio !== turno.current) return;
      // Un backend anterior (404) o una cuenta sin permiso (403): la sección no se dibuja.
      setNoDisponible(e instanceof ApiError && (e.status === 404 || e.status === 403));
      if (!(e instanceof ApiError && (e.status === 404 || e.status === 403))) setError(mensajeDeErrorDeBienvenida(e, 'No pudimos leer la imagen. Revisa tu conexión.'));
    } finally {
      if (mio === turno.current) setCargando(false);
    }
  }, [codigo]);

  useEffect(() => {
    void leer();
    return () => {
      turno.current += 1;
    };
  }, [leer]);

  // La imagen vigente tal como se sirve en el chat. Sin imagen subida el servidor dice 404 y quedan las de la app.
  const claveDeLaVista = `${imagen?.hayImagen ?? false}|${imagen?.ultimoCambio?.en ?? ''}`;
  useEffect(() => {
    if (!imagen) return undefined;
    let valida = true;
    if (!imagen.hayImagen) {
      setVigente(previa => {
        if (previa) entorno.liberar(previa);
        return null;
      });
      return undefined;
    }
    void traerTarjetaDeMuestra(rutaDeLaVistaDeLaImagen(codigo), getTokenSesion(), entorno).then(resultado => {
      if (!valida) {
        if (resultado.ok) entorno.liberar(resultado.uri);
        return;
      }
      if (!resultado.ok && resultado.status === 401) notificarSesionVencida();
      setVigente(previa => {
        if (previa) entorno.liberar(previa);
        return resultado.ok ? resultado.uri : null;
      });
    });
    return () => {
      valida = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cuando cambia la imagen vigente (`claveDeLaVista`), no por cada render
  }, [codigo, claveDeLaVista, entorno]);

  // Si se sale con una candidata a la vista, su imagen (un object URL en web) se libera.
  const candidata = useRef<string | null>(null);
  candidata.current = flujo.paso === 'lista' || flujo.paso === 'usando' ? flujo.uri : null;
  useEffect(
    () => () => {
      if (candidata.current) entorno.liberar(candidata.current);
    },
    [entorno],
  );

  const soltarCandidata = () => {
    if (flujo.paso === 'lista' || flujo.paso === 'usando') entorno.liberar(flujo.uri);
  };

  const elegir = async () => {
    setFlujo({ paso: 'quieto' });
    soltarCandidata();
    setError(null);
    setAviso(null);
    const resultado = await prepararPortadaCandidata({
      elegir: () => elegirFotoCuadrada({ lado: LADO_DE_LA_IMAGEN, motivoDelPermiso: MOTIVO_DEL_PERMISO }),
      pedirSubida: tipo => solicitarSubidaDeImagen(codigo, tipo),
      subir: subirImagenAS3,
      traerMuestra: async ruta => {
        const muestra = await traerTarjetaDeMuestra(rutaDeLaVistaDeLaImagen(codigo, ruta), getTokenSesion(), entorno);
        if (!muestra.ok && muestra.status === 401) notificarSesionVencida();
        return muestra;
      },
      alAvanzar: paso => setFlujo({ paso }),
    });
    if (resultado.tipo === 'cancelada') setFlujo({ paso: 'quieto' });
    else if (resultado.tipo === 'lista') setFlujo({ paso: 'lista', ruta: resultado.ruta, uri: resultado.uri });
    else setFlujo({ paso: resultado.tipo, mensaje: resultado.mensaje });
  };

  const usar = async () => {
    if (flujo.paso !== 'lista') return;
    setFlujo({ ...flujo, paso: 'usando' });
    try {
      const nueva = await confirmarImagenDeLaFormacion(codigo, flujo.ruta);
      entorno.liberar(flujo.uri);
      setFlujo({ paso: 'quieto' });
      setImagen(nueva);
      tacto.logro();
      setAviso({ clave: Date.now(), texto: 'Listo: el chat ya usa la imagen nueva.' });
    } catch (e) {
      setFlujo({ ...flujo, paso: 'lista' });
      setError(mensajeDeErrorDeBienvenida(e, 'No se pudo usar esta imagen. Vuelve a intentar.'));
    }
  };

  const cancelar = () => {
    soltarCandidata();
    setFlujo({ paso: 'quieto' });
    setError(null);
  };

  const volver = async () => {
    const acepto = await confirmar(
      enLaEscuela ? '¿Volver a la imagen de siempre?' : '¿Volver a la imagen de la Escuela?',
      enLaEscuela
        ? 'La comunidad y los grupos sin foto propia vuelven a mostrar el fénix y la tarjeta de siempre.'
        : 'La comunidad y los grupos sin foto propia de esta formación vuelven a mostrar la imagen de la Escuela.',
      { ok: enLaEscuela ? 'Sí, volver a la de siempre' : 'Sí, volver a la de la Escuela' },
    );
    if (!acepto) return;
    setVolviendo(true);
    setError(null);
    setAviso(null);
    try {
      setImagen(await volverALaImagenOriginal(codigo));
      tacto.logro();
      setAviso({ clave: Date.now(), texto: enLaEscuela ? 'Listo: el chat volvió a la imagen de siempre.' : 'Listo: el chat usa la imagen de la Escuela.' });
    } catch (e) {
      setError(mensajeDeErrorDeBienvenida(e, 'No se pudo volver atrás. Vuelve a intentar.'));
    } finally {
      setVolviendo(false);
    }
  };

  if (noDisponible || (cargando && !imagen)) return null;

  const acciones = imagen ? accionesDeLaImagen(imagen) : null;
  const hayCandidata = flujo.paso === 'lista' || flujo.paso === 'usando';
  const ocupado = flujo.paso === 'subiendo' || flujo.paso === 'revisando' || flujo.paso === 'usando' || volviendo;
  const cuerpo = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];

  return (
    <View style={estilos.seccion}>
      <TituloDeSeccion detalle="La ven la comunidad y los grupos sin foto propia.">Imagen de la formación</TituloDeSeccion>

      {imagen ? (
        <>
          <VistaEnElChat uri={vigente} descripcion="Así se ve hoy en el chat" />
          <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 23 }]}>{estadoDeLaImagen(imagen)}</Text>
        </>
      ) : null}

      {hayCandidata ? (
        <View style={[estilos.candidata, { borderColor: c.gold, backgroundColor: c.goldWash }]}>
          <Text style={[estilos.subtitulo, { color: c.textStrong }]}>Así se vería en el chat</Text>
          <Text style={cuerpo}>Con la imagen que elegiste. Todavía no se usa.</Text>
          <VistaEnElChat uri={flujo.uri} descripcion="Cómo se vería con la imagen nueva" />
          <BotonPrincipal etiqueta="Usar esta imagen" onPress={() => void usar()} cargando={flujo.paso === 'usando'} />
          <BotonSecundario etiqueta="Elegir otra" onPress={() => void elegir()} deshabilitado={flujo.paso === 'usando'} />
          <BotonSecundario etiqueta="Cancelar" onPress={cancelar} deshabilitado={flujo.paso === 'usando'} />
        </View>
      ) : null}

      {flujo.paso === 'subiendo' || flujo.paso === 'revisando' ? (
        <View style={estilos.fila}>
          <ActivityIndicator color={c.goldInk} />
          <Text style={[...cuerpo, { flexShrink: 1 }]}>
            {flujo.paso === 'subiendo' ? 'Subiendo la imagen…' : 'Revisando cómo queda…'}
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
      {aviso ? <ConfirmacionEnLinea key={aviso.clave} texto={aviso.texto} onTerminar={() => setAviso(null)} /> : null}

      {!hayCandidata && acciones ? (
        <>
          <BotonSecundario
            etiqueta={flujo.paso === 'rechazada' ? 'Elegir otra imagen' : 'Cambiar la imagen'}
            icono="image"
            onPress={() => void elegir()}
            deshabilitado={!acciones.puedeCambiar || ocupado}
          />
          {acciones.aviso ? <Text style={cuerpo}>{acciones.aviso}</Text> : null}
          {acciones.puedeVolver ? (
            <BotonSecundario
              etiqueta={etiquetaDeVolver(codigo)}
              onPress={() => void volver()}
              cargando={volviendo}
              deshabilitado={ocupado && !volviendo}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

/**
 * Cómo se ve en el chat: dos círculos, el de la comunidad y el de un grupo sin foto propia. Con imagen, los dos la llevan; sin ella, cada uno
 * lleva lo de siempre de la app (el fénix y la tarjeta). Es lo mismo que dibuja `AvatarDeChat`.
 */
function VistaEnElChat({ uri, descripcion }: { uri: string | null; descripcion: string }) {
  const { c, t } = useTheme();
  const circulo = { width: LADO_DE_LA_VISTA, height: LADO_DE_LA_VISTA, borderRadius: LADO_DE_LA_VISTA / 2, borderWidth: 1.5, borderColor: c.gold };
  return (
    <View accessible accessibilityLabel={descripcion} style={estilos.vista}>
      <View style={estilos.columna}>
        {uri ? <Image source={{ uri }} style={circulo} accessibilityIgnoresInvertColors /> : <FotoDelPrograma size={LADO_DE_LA_VISTA} />}
        <Text style={[t.body, estilos.leyenda, { color: c.textSoft }]}>Comunidad</Text>
      </View>
      <View style={estilos.columna}>
        {uri ? <Image source={{ uri }} style={circulo} accessibilityIgnoresInvertColors /> : <FotoDelGrupo size={LADO_DE_LA_VISTA} />}
        <Text style={[t.body, estilos.leyenda, { color: c.textSoft }]}>Grupos</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: { gap: 10 },
  vista: { flexDirection: 'row', gap: 28, alignItems: 'flex-start' },
  columna: { alignItems: 'center', gap: 6 },
  leyenda: { fontSize: 15, lineHeight: 20 },
  candidata: { borderWidth: 1.5, borderRadius: 16, padding: 14, gap: 12 },
  subtitulo: { fontFamily: fuentes.media, fontSize: 18, lineHeight: 24 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
