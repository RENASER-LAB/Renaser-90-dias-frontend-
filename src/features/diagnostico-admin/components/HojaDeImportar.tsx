import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BotonPrincipal, TituloDeSeccion } from '../../../components/Legible';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { ApiError } from '../../../services/http/apiClient';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { confirmar } from '../../admin/utils/dialogo';
import { confirmarImportacion, revisarImportacion } from '../api/diagnosticoAdminApi';
import { leerErroresDeImportacion } from '../api/diagnosticoAdminSchemas';
import { ARCHIVO_DE_LA_PLANTILLA, useDescargaDeFicha } from '../hooks/useDescargaDeFicha';
import type { ModoDeImportacion, ResultadoDeImportacion, VistaPreviaDeImportacion } from '../types/diagnosticoAdmin.types';
import {
  AYUDA_DE_PEGAR,
  hayTablaPegada,
  limpiarLoPegado,
  motivoParaNoConfirmar,
  OPCIONES_DE_IMPORTAR,
  resumenDeLaVistaPrevia,
  sePuedeConfirmar,
  textoDeLaAdvertencia,
  textoDelError,
  textoDelReemplazo,
} from '../utils/importacion';
import { cantidad, erroresDelCuerpo, mensajeDeGuardar } from '../utils/textos';
import { BotonDeAccion, CampoDeTexto, OpcionEnFila, TextoDeError } from './piezas';

/** Cuántas filas de la tabla se muestran en la vista previa (las demás se cuentan). */
const FILAS_A_LA_VISTA = 8;

/**
 * «Importar preguntas»: se pega una tabla (copiada de Excel o Google Sheets sale con tabuladores; también vale CSV con coma o punto y coma),
 * el servidor la revisa y dice qué entendió y qué errores tiene POR FILA (la cabecera es la fila 1, como en la hoja). Con errores no se
 * puede confirmar. Lo importado queda en borrador: nada llega a las personas hasta publicar.
 *
 * No hay selector de archivos en esta versión (pide un módulo nativo nuevo): se pega el texto. «Descargar plantilla» da el formato.
 */
export function HojaDeImportar({
  visible,
  hayPublicada,
  alCerrar,
  alImportar,
}: {
  visible: boolean;
  hayPublicada: boolean;
  alCerrar: () => void;
  /** Lo que el servidor hizo; quien la muestra relee el borrador y lo dice. La hoja se cierra sola. */
  alImportar: (modo: ModoDeImportacion, texto: string) => Promise<ResultadoDeImportacion>;
}) {
  const { c, t } = useTheme();
  const { descargando, descargar } = useDescargaDeFicha();
  const [texto, setTexto] = useState('');
  const [vista, setVista] = useState<VistaPreviaDeImportacion | null>(null);
  const [modo, setModo] = useState<ModoDeImportacion>('ANADIR');
  const [revisando, setRevisando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [erroresDelServidor, setErroresDelServidor] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;
    setTexto('');
    setVista(null);
    setModo('ANADIR');
    setError(null);
    setErroresDelServidor([]);
    setRevisando(false);
    setImportando(false);
  }, [visible]);

  const cerrar = async () => {
    if (texto.trim() !== '' && !importando && !(await confirmar('¿Salir sin importar?', 'Se pierde la tabla que pegaste.', { ok: 'Salir' }))) return;
    alCerrar();
  };

  const cambiarTexto = (nuevo: string) => {
    setTexto(nuevo);
    // Lo revisado era de otro texto: hay que revisar de nuevo.
    setVista(null);
    setError(null);
    setErroresDelServidor([]);
  };

  const revisar = async () => {
    const limpio = limpiarLoPegado(texto);
    setRevisando(true);
    setError(null);
    try {
      const v = await revisarImportacion(limpio);
      if (!v) {
        tacto.error();
        setError('No se pudo leer la respuesta del servidor. Vuelve a intentar.');
        return;
      }
      setVista(v);
      if (v.errores.length > 0) tacto.error();
    } catch (e) {
      tacto.error();
      setError(mensajeDeGuardar(e, 'No se pudo revisar la tabla. Vuelve a intentar.'));
    } finally {
      setRevisando(false);
    }
  };

  const importar = async () => {
    if (!vista || !sePuedeConfirmar(vista)) return;
    if (modo === 'REEMPLAZAR') {
      const sigue = await confirmar('¿Reemplazar la ficha?', `La ficha pasa a ser solo lo que pegaste. ${textoDelReemplazo(vista)}`, {
        ok: 'Reemplazar',
        destructivo: true,
      });
      if (!sigue) return;
    }
    setImportando(true);
    setError(null);
    try {
      await alImportar(modo, limpiarLoPegado(texto));
    } catch (e) {
      tacto.error();
      // Con errores el servidor no guarda nada y devuelve la misma lista que la revisión.
      const delCuerpo = e instanceof ApiError ? leerErroresDeImportacion(erroresDelCuerpo(e)) : [];
      if (delCuerpo.length > 0) setErroresDelServidor(delCuerpo.map(textoDelError));
      setError(mensajeDeGuardar(e, 'No se pudo importar. Vuelve a intentar.'));
    } finally {
      setImportando(false);
    }
  };

  const filasDelTexto = limpiarLoPegado(texto).split('\n').filter(f => f.trim() !== '').length;
  const puedeRevisar = hayTablaPegada(texto);
  const noSePuede = vista ? motivoParaNoConfirmar(vista) : null;

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={() => void cerrar()}
      titulo="Importar preguntas"
      subtitulo="Lo importado queda en borrador"
      tamano="completa"
      etiquetaCerrar="Cerrar sin importar"
      pie={
        <View style={estilos.pie}>
          {error ? <TextoDeError texto={error} /> : null}
          {vista && sePuedeConfirmar(vista) ? (
            <BotonPrincipal etiqueta={modo === 'REEMPLAZAR' ? 'Reemplazar la ficha' : 'Añadir al final'} onPress={() => void importar()} cargando={importando} />
          ) : (
            <BotonPrincipal etiqueta="Revisar" onPress={() => void revisar()} cargando={revisando} deshabilitado={!puedeRevisar} />
          )}
        </View>
      }
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={estilos.cuerpo}>
        <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }]}>{AYUDA_DE_PEGAR}</Text>
        <View style={estilos.acciones}>
          <BotonDeAccion etiqueta={descargando ? 'Preparando…' : 'Descargar plantilla'} icono="share" deshabilitado={descargando} onPress={() => void descargar(ARCHIVO_DE_LA_PLANTILLA)} />
        </View>

        <CampoDeTexto
          rotulo="Tabla de preguntas"
          ayuda={filasDelTexto > 0 ? `Pegaste ${cantidad(filasDelTexto, 'fila', 'filas')}, con la cabecera.` : 'La primera fila lleva los nombres de las columnas.'}
          value={texto}
          onChangeText={cambiarTexto}
          multiline
          numberOfLines={8}
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          placeholder={'Sección\tClave\tPregunta\tAyuda\tTipo\t…'}
          style={estilos.tabla}
        />

        {vista ? (
          <View style={{ gap: 14 }}>
            <View style={{ gap: 4 }}>
              <Text accessibilityLiveRegion="polite" style={[t.cardTitle, { color: vista.errores.length > 0 ? c.danger : c.textStrong }]}>
                {resumenDeLaVistaPrevia(vista)}
              </Text>
              {vista.filas.length > 0 ? (
                <View style={{ gap: 2 }}>
                  {vista.filas.slice(0, FILAS_A_LA_VISTA).map(f => (
                    <Text key={f.numero} style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]} numberOfLines={2}>
                      {`Fila ${f.numero} · ${f.seccion} · ${f.texto}${f.tipo ? ` · ${f.tipo}` : ''}`}
                    </Text>
                  ))}
                  {vista.filas.length > FILAS_A_LA_VISTA ? (
                    <Text style={[t.body, { color: c.textSoft, fontSize: 16 }]}>{`y ${vista.filas.length - FILAS_A_LA_VISTA} más`}</Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            {vista.errores.length > 0 ? (
              <View style={{ gap: 6 }} accessibilityRole="alert">
                <TituloDeSeccion>{cantidad(vista.errores.length, 'error', 'errores')}</TituloDeSeccion>
                {vista.errores.map((e, i) => (
                  <Text key={`${e.fila}-${i}`} style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 22 }]}>
                    {textoDelError(e)}
                  </Text>
                ))}
              </View>
            ) : null}

            {vista.advertencias.length > 0 ? (
              <View style={{ gap: 6 }}>
                <TituloDeSeccion detalle="No impiden importar.">{cantidad(vista.advertencias.length, 'aviso', 'avisos')}</TituloDeSeccion>
                {vista.advertencias.map((a, i) => (
                  <Text key={`${a.fila}-${i}`} style={[t.body, { color: c.goldInk, fontSize: 16, lineHeight: 22 }]}>
                    {textoDeLaAdvertencia(a)}
                  </Text>
                ))}
              </View>
            ) : null}

            {noSePuede ? <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 22, fontFamily: fuentes.media }]}>{noSePuede}</Text> : null}

            {sePuedeConfirmar(vista) ? (
              <View style={{ gap: 10 }}>
                <TituloDeSeccion>Cómo importar</TituloDeSeccion>
                <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
                  {OPCIONES_DE_IMPORTAR.map(o => (
                    <OpcionEnFila key={o.modo} etiqueta={o.etiqueta} detalle={o.detalle} marcada={modo === o.modo} onPress={() => setModo(o.modo)} />
                  ))}
                </View>
                {modo === 'REEMPLAZAR' ? (
                  <Text style={[t.body, { color: c.goldInk, fontSize: 16, lineHeight: 22 }]}>
                    {textoDelReemplazo(vista)}
                    {hayPublicada ? ' Las personas siguen viendo la versión publicada hasta que publiques.' : ''}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {erroresDelServidor.length > 0 ? (
          <View style={{ gap: 6 }} accessibilityRole="alert">
            {erroresDelServidor.map(e => (
              <Text key={e} style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 22 }]}>
                {e}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 16, paddingHorizontal: 20, paddingBottom: 32 },
  pie: { gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tabla: { minHeight: 180, maxHeight: 300 },
});
