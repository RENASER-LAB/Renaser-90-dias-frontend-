import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { BotonPrincipal, BotonSecundario } from '../../../components/Legible';
import { useTheme } from '../../../theme/ThemeContext';
import { guardarTextoDeBienvenida, volverAlTextoOriginal } from '../api/bienvenidaApi';
import type { BienvenidaApi, TextoDeBienvenidaApi } from '../api/bienvenidaSchemas';
import {
  MARCADOR_MENTOR,
  MENSAJE_APAGADO,
  MENTOR_DE_EJEMPLO,
  ayudaDeMarcadores,
  estadoDelTexto,
  insertarMarcador,
  largoDelTexto,
  marcadoresQueFaltan,
  mensajeDeErrorDeBienvenida,
  nombreParaLaMuestra,
  piezaDelTexto,
  revisarTexto,
  sePuedeGuardar,
  seManda,
  vistaPrevia,
} from '../utils/bienvenida';
import { confirmar } from '../utils/dialogo';

/**
 * Uno de los tres mensajes de la bienvenida (backend D-210): cómo lo lee hoy la persona, con el nombre
 * de ejemplo, y el editor para cambiarlo. «Guardar» solo se puede tocar con un texto que el servidor
 * va a aceptar: no vacío, hasta el largo máximo y con sus marcadores ({nombre}, y {mentor} en el del
 * grupo), ni uno de más.
 */
export function MensajeDeBienvenida({
  texto,
  largoMaximo,
  nombre,
  onCambio,
}: {
  texto: TextoDeBienvenidaApi;
  largoMaximo: number;
  /** El nombre de ejemplo, tal como está escrito (vacío = «María»). */
  nombre: string;
  onCambio: (nueva: BienvenidaApi) => void;
}) {
  const { c, t } = useTheme();
  const pieza = piezaDelTexto(texto.clave);
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(texto.texto);
  const [seleccion, setSeleccion] = useState<{ start: number; end: number } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [volviendo, setVolviendo] = useState(false);
  const [errorDelServidor, setErrorDelServidor] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Lo que llega del servidor manda mientras no se está escribiendo (después de guardar o de volver).
  useEffect(() => {
    if (!editando) setBorrador(texto.texto);
  }, [texto.texto, editando]);

  const muestra = nombreParaLaMuestra(nombre);
  const llevaMentor = texto.marcadores.includes(MARCADOR_MENTOR);
  const revision = revisarTexto(borrador, texto.marcadores, largoMaximo);
  const largo = largoDelTexto(borrador);
  const faltan = marcadoresQueFaltan(borrador, texto.marcadores);
  const ocupado = guardando || volviendo;
  const cuerpo = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];
  const peligro = [t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }];

  const empezar = () => {
    setBorrador(texto.texto);
    setSeleccion(null);
    setErrorDelServidor(null);
    setAviso(null);
    setEditando(true);
  };

  const cancelar = () => {
    setBorrador(texto.texto);
    setErrorDelServidor(null);
    setEditando(false);
  };

  const agregar = (marcador: string) => {
    const resultado = insertarMarcador(borrador, marcador, seleccion);
    setBorrador(resultado.texto);
    setSeleccion({ start: resultado.cursor, end: resultado.cursor });
    setErrorDelServidor(null);
  };

  const guardar = async () => {
    if (!revision.ok) return;
    setGuardando(true);
    setErrorDelServidor(null);
    try {
      const nueva = await guardarTextoDeBienvenida(texto.clave, revision.texto);
      setEditando(false);
      setAviso('Guardado. Desde ahora sale este mensaje.');
      onCambio(nueva);
    } catch (e) {
      setErrorDelServidor(mensajeDeErrorDeBienvenida(e, 'No se pudo guardar el mensaje. Vuelve a intentar.'));
    } finally {
      setGuardando(false);
    }
  };

  const volverAlOriginal = async () => {
    const acepto = await confirmar(
      '¿Volver al texto original?',
      `«${pieza.titulo}» vuelve a ser el texto que preparó Operaciones.`,
      { ok: 'Sí, volver al original' },
    );
    if (!acepto) return;
    setVolviendo(true);
    setErrorDelServidor(null);
    setAviso(null);
    try {
      const nueva = await volverAlTextoOriginal(texto.clave);
      setEditando(false);
      setAviso('Listo: volvió al texto original.');
      onCambio(nueva);
    } catch (e) {
      setErrorDelServidor(mensajeDeErrorDeBienvenida(e, 'No se pudo volver al texto original. Vuelve a intentar.'));
    } finally {
      setVolviendo(false);
    }
  };

  return (
    <View style={[estilos.tarjeta, { borderColor: c.border, backgroundColor: c.cardBg }]}>
      <Text accessibilityRole="header" style={[estilos.titulo, { color: c.textStrong }]}>
        {pieza.titulo}
      </Text>
      {pieza.detalle ? <Text style={cuerpo}>{pieza.detalle}</Text> : null}
      <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 23 }]}>{estadoDelTexto(texto)}</Text>

      {editando ? (
        <View style={{ gap: 10 }}>
          <TextInput
            value={borrador}
            onChangeText={v => {
              setBorrador(v);
              setErrorDelServidor(null);
            }}
            onSelectionChange={e => setSeleccion(e.nativeEvent.selection)}
            multiline
            editable={!ocupado}
            accessibilityLabel={`Texto de «${pieza.titulo}»`}
            style={[
              t.body,
              estilos.editor,
              { backgroundColor: c.bg, borderColor: c.borderStrong, color: c.text, fontSize: 17, lineHeight: 24 },
            ]}
          />
          <Text style={[t.body, { color: largo > largoMaximo ? c.danger : c.textSoft, fontSize: 16 }]}>
            {largo} de {largoMaximo}
          </Text>
          <Text style={cuerpo}>{ayudaDeMarcadores(texto.marcadores)}</Text>
          {faltan.map(marcador => (
            <BotonSecundario
              key={marcador}
              etiqueta={`Agregar ${marcador}`}
              icono="plus"
              accessibilityLabel={`Agregar ${marcador} donde está el cursor`}
              onPress={() => agregar(marcador)}
              deshabilitado={ocupado}
            />
          ))}
          {!revision.ok ? (
            <Text accessibilityRole="alert" style={peligro}>
              {revision.error}
            </Text>
          ) : null}
          {errorDelServidor ? (
            <Text accessibilityRole="alert" style={peligro}>
              {errorDelServidor}
            </Text>
          ) : null}
          <Text style={[estilos.rotulo, { color: c.textStrong }]}>Así se verá</Text>
          <Previa texto={vistaPrevia(borrador, muestra)} />
          {llevaMentor ? <Text style={cuerpo}>{MENTOR_DE_EJEMPLO} es un mentor de ejemplo.</Text> : null}
          <BotonPrincipal
            etiqueta="Guardar"
            onPress={() => void guardar()}
            cargando={guardando}
            deshabilitado={!sePuedeGuardar(borrador, texto.texto, texto.marcadores, largoMaximo)}
          />
          <BotonSecundario etiqueta="Cancelar" onPress={cancelar} deshabilitado={ocupado} />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {seManda(texto.texto) ? (
            <>
              <Text style={[estilos.rotulo, { color: c.textStrong }]}>Así lo lee «{muestra}»</Text>
              <Previa texto={vistaPrevia(texto.texto, muestra)} />
              {llevaMentor ? <Text style={cuerpo}>{MENTOR_DE_EJEMPLO} es un mentor de ejemplo.</Text> : null}
            </>
          ) : (
            <Text style={cuerpo}>{MENSAJE_APAGADO}</Text>
          )}
          {errorDelServidor ? (
            <Text accessibilityRole="alert" style={peligro}>
              {errorDelServidor}
            </Text>
          ) : null}
          {aviso ? <Text style={[t.body, { color: c.success, fontSize: 16, lineHeight: 23 }]}>{aviso}</Text> : null}
          <BotonSecundario etiqueta="Editar" onPress={empezar} deshabilitado={ocupado} />
          {texto.cambiado ? (
            <BotonSecundario
              etiqueta="Volver al texto original"
              onPress={() => void volverAlOriginal()}
              cargando={volviendo}
              deshabilitado={guardando}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}

/** El mensaje como burbuja del chat, para que se lea como lo va a leer la persona. */
function Previa({ texto }: { texto: string }) {
  const { c, t } = useTheme();
  return (
    <View style={[estilos.previa, { backgroundColor: c.goldWash, borderColor: c.border }]}>
      <Text style={[t.body, { color: c.text, fontSize: 17, lineHeight: 25 }]}>{texto || ' '}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  titulo: { fontFamily: 'Jost_500Medium', fontSize: 18, lineHeight: 24 },
  rotulo: { fontFamily: 'Jost_500Medium', fontSize: 16, lineHeight: 22 },
  editor: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, minHeight: 160, textAlignVertical: 'top' },
  previa: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
});
