import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../../../components/Icon';
import { BotonPrincipal, BotonSecundario } from '../../../../components/Legible';
import { Presionable } from '../../../../components/Presionable';
import { useSystemBackHandler } from '../../../../hooks/useSystemBackHandler';
import { ApiError, mensajeDeError } from '../../../../services/http/apiClient';
import { useResponsive } from '../../../../theme/responsive';
import { useTheme } from '../../../../theme/ThemeContext';
import { tacto } from '../../../../utils/tacto';
import { CabeceraAdmin } from '../../../admin/components/CabeceraAdmin';
import { ConfirmacionEnLinea } from '../../../../components/ConfirmacionEnLinea';
import { avisar, confirmar } from '../../../admin/utils/dialogo';
import { guardarBorradorDeTerminos, publicarTerminos } from '../api/terminosApi';
import type { VersionDeTerminosApi } from '../api/terminosSchemas';
import { PublicarTerminosSheet } from '../components/PublicarTerminosSheet';
import { VersionDeTerminosSheet } from '../components/VersionDeTerminosSheet';
import { useDetalleDeTerminos } from '../hooks/useTerminosAdmin';
import {
  MAX_CLAUSULA,
  agregarClausula,
  borradorDesde,
  cambiarClausula,
  clausulasQueCitanUnNumero,
  dicenLoMismo,
  hayCambios,
  insertarClausulaDespuesDe,
  loQueFaltaParaPublicar,
  moverClausula,
  quitarClausula,
  type BorradorDeTerminos,
} from '../utils/borradorDeTerminos';
import { tituloDeLaFormacion } from '../utils/estadoDeLosTerminos';

/**
 * El editor de los términos de una formación (spec 027, historia 1): título, introducción, cada cláusula (agregar, escribir, mover, quitar; la numeración sale sola de
 * la posición) y el texto de la casilla. Trabaja sobre el BORRADOR —nadie más lo ve—; «Vista previa» muestra lo que verá la persona sin guardar nada; «Guardar
 * borrador» lo conserva y «Publicar» lo convierte en la versión siguiente. Parte del borrador si lo hay, de la versión vigente si no.
 */
export function EditorDeTerminosScreen({ formacion, onVolver }: { formacion: string; onVolver: () => void }) {
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const { detalle, cargando, fallo, recargar } = useDetalleDeTerminos(formacion);
  const [borrador, setBorrador] = useState<BorradorDeTerminos | null>(null);
  const [guardado, setGuardado] = useState<BorradorDeTerminos | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [enCurso, setEnCurso] = useState(false);
  const [errorDePublicar, setErrorDePublicar] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const vigente = detalle?.current ?? null;
  const baseNumero = vigente?.number ?? null;
  const delServidor = useMemo(() => {
    const origen: VersionDeTerminosApi | null = detalle?.draft ?? detalle?.current ?? null;
    return origen ? borradorDesde(origen) : null;
  }, [detalle]);

  /* La primera vez que llega el detalle arranca el borrador local; después lo que se escribe manda sobre lo que viene del servidor. */
  useEffect(() => {
    if (delServidor && borrador === null) {
      setBorrador(delServidor);
      setGuardado(detalle?.draft ? delServidor : null);
    }
  }, [delServidor, borrador, detalle]);

  const sinGuardar = borrador !== null && hayCambios(borrador, guardado);

  const salir = async () => {
    if (sinGuardar) {
      const sale = await confirmar('¿Salir sin guardar?', 'Lo que cambiaste en el borrador se pierde.', { ok: 'Salir sin guardar', destructivo: true });
      if (!sale) return;
    }
    onVolver();
  };

  useSystemBackHandler(() => {
    if (vistaPrevia) {
      setVistaPrevia(false);
      return true;
    }
    void salir();
    return true;
  });

  const faltas = borrador ? loQueFaltaParaPublicar(borrador) : [];
  const citas = borrador ? clausulasQueCitanUnNumero(borrador) : [];
  const vigenteComoBorrador = vigente ? borradorDesde(vigente) : null;
  const sinCambios = borrador ? dicenLoMismo(borrador, vigenteComoBorrador) : false;

  const guardar = async (): Promise<boolean> => {
    if (!borrador) return false;
    setEnCurso(true);
    try {
      const respuesta = await guardarBorradorDeTerminos(
        formacion,
        { title: borrador.titulo, introduction: borrador.introduccion, clauses: borrador.clausulas, checkboxText: borrador.textoCasilla },
        baseNumero,
      );
      if (respuesta) setGuardado(borrador);
      tacto.logro();
      setAviso('Borrador guardado');
      return true;
    } catch (e) {
      tacto.error();
      avisar(e instanceof ApiError && e.esConflicto ? 'Otra persona publicó' : 'No se pudo guardar', mensajeDeError(e, 'Inténtalo de nuevo.'));
      if (e instanceof ApiError && e.esConflicto) await alCambiarDeVersion();
      return false;
    } finally {
      setEnCurso(false);
    }
  };

  /** Otra persona publicó mientras se editaba: se vuelve a leer lo vigente y se deja a quien edita decidir qué hacer con sus cambios (FR-008). */
  const alCambiarDeVersion = async () => {
    await recargar();
  };

  const abrirPublicar = async () => {
    if (!borrador || faltas.length > 0) return;
    if (sinCambios) {
      avisar('Sin cambios', 'No hay cambios respecto de la versión vigente.');
      return;
    }
    if (citas.length > 0) {
      const sigue = await confirmar(
        'Hay cláusulas que citan un número',
        `Las cláusulas ${citas.join(', ')} citan otra por su número. Al mover o quitar cláusulas el número cambia y esa cita puede quedar mal. Revísalas antes de publicar.`,
        { ok: 'Publicar igual' },
      );
      if (!sigue) return;
    }
    setErrorDePublicar(null);
    setPublicando(true);
  };

  const publicar = async (nota: string, pide: boolean) => {
    if (!borrador) return;
    setEnCurso(true);
    setErrorDePublicar(null);
    try {
      if (sinGuardar && !(await guardar())) {
        setPublicando(false);
        return;
      }
      await publicarTerminos(formacion, nota, pide, baseNumero);
      tacto.logro();
      setPublicando(false);
      onVolver();
    } catch (e) {
      tacto.error();
      setErrorDePublicar(mensajeDeError(e, 'No pudimos publicar. Inténtalo de nuevo.'));
      if (e instanceof ApiError && e.esConflicto) await alCambiarDeVersion();
    } finally {
      setEnCurso(false);
    }
  };

  const previa: VersionDeTerminosApi | null = borrador
    ? {
        id: 'vista-previa',
        formation: formacion,
        state: 'BORRADOR',
        number: null,
        title: borrador.titulo,
        introduction: borrador.introduccion,
        clauses: borrador.clausulas,
        checkboxText: borrador.textoCasilla,
        asksNewAcceptance: false,
      }
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin titulo={tituloDeLaFormacion(formacion, detalle?.name)} subtitulo={sinGuardar ? 'Borrador · sin guardar' : 'Borrador'} onVolver={() => void salir()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: horizontalPadding, paddingBottom: 36, maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center', gap: 12 }}
        >
          {cargando ? <ActivityIndicator color={c.goldInk} style={{ marginTop: 16 }} /> : null}
          {fallo ? (
            <View style={{ gap: 10 }}>
              <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16 }]}>{fallo}</Text>
              <BotonSecundario etiqueta="Reintentar" onPress={() => void recargar()} />
            </View>
          ) : null}
          {aviso ? <ConfirmacionEnLinea texto={aviso} onTerminar={() => setAviso(null)} /> : null}

          {borrador ? (
            <>
              <Campo rotulo="Título" valor={borrador.titulo} alCambiar={v => setBorrador({ ...borrador, titulo: v })} maximo={120} />
              <Campo rotulo="Introducción (opcional)" valor={borrador.introduccion} alCambiar={v => setBorrador({ ...borrador, introduccion: v })} maximo={2000} multilinea />
              <Text style={[t.small, { color: c.textSoft, fontSize: 13 }]}>
                Puedes escribir {'{formacion}'} y {'{duracion}'}: cada persona los verá con el nombre de su formación y su duración.
              </Text>

              {borrador.clausulas.map((texto, i) => (
                <View key={i} style={[estilos.clausula, { backgroundColor: c.cardBg, borderColor: texto.trim() === '' ? c.danger : c.border }]}>
                  <View style={estilos.filaDeCabecera}>
                    <Text style={[t.cardTitle, { color: c.goldInk, fontSize: 16 }]}>{`Cláusula ${i + 1}`}</Text>
                    <View style={estilos.acciones}>
                      <Boton icono="subir" etiqueta={`Subir la cláusula ${i + 1}`} deshabilitado={i === 0} onPress={() => setBorrador(moverClausula(borrador, i, -1))} />
                      <Boton icono="bajar" etiqueta={`Bajar la cláusula ${i + 1}`} deshabilitado={i === borrador.clausulas.length - 1} onPress={() => setBorrador(moverClausula(borrador, i, 1))} />
                      <Boton icono="plus" etiqueta={`Agregar una cláusula después de la ${i + 1}`} onPress={() => setBorrador(insertarClausulaDespuesDe(borrador, i))} />
                      <Boton icono="trash" etiqueta={`Quitar la cláusula ${i + 1}`} onPress={() => setBorrador(quitarClausula(borrador, i))} />
                    </View>
                  </View>
                  <TextInput
                    value={texto}
                    onChangeText={v => setBorrador(cambiarClausula(borrador, i, v))}
                    multiline
                    placeholder="Escribe la cláusula"
                    placeholderTextColor={c.micro}
                    accessibilityLabel={`Texto de la cláusula ${i + 1}`}
                    style={[t.body, estilos.texto, { color: c.text }]}
                  />
                  <Text style={[t.small, { color: texto.length > MAX_CLAUSULA ? c.danger : c.micro, fontSize: 13, textAlign: 'right' }]}>{`${texto.length} / ${MAX_CLAUSULA}`}</Text>
                </View>
              ))}
              <BotonSecundario etiqueta="Agregar una cláusula" icono="plus" onPress={() => setBorrador(agregarClausula(borrador))} />

              <Campo rotulo="Texto de la casilla de aceptación" valor={borrador.textoCasilla} alCambiar={v => setBorrador({ ...borrador, textoCasilla: v })} maximo={200} />

              {faltas.length > 0 ? (
                <View accessibilityRole="alert" style={{ gap: 2 }}>
                  {faltas.map(f => (
                    <Text key={f} style={[t.body, { color: c.danger, fontSize: 15 }]}>{f}</Text>
                  ))}
                </View>
              ) : null}
              {sinCambios ? <Text style={[t.body, { color: c.textSoft, fontSize: 15 }]}>No hay cambios respecto de la versión vigente.</Text> : null}

              <BotonSecundario etiqueta="Vista previa" onPress={() => setVistaPrevia(true)} />
              <BotonSecundario etiqueta="Guardar borrador" onPress={() => void guardar()} cargando={enCurso} deshabilitado={!sinGuardar} />
              <BotonPrincipal etiqueta="Publicar" onPress={() => void abrirPublicar()} deshabilitado={faltas.length > 0 || sinCambios || enCurso} />
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <VersionDeTerminosSheet visible={vistaPrevia} version={previa} titulo="Vista previa" alCerrar={() => setVistaPrevia(false)} />
      <PublicarTerminosSheet visible={publicando} esLaPrimera={vigente === null} enCurso={enCurso} error={errorDePublicar} alCerrar={() => setPublicando(false)} alPublicar={(nota, pide) => void publicar(nota, pide)} />
    </SafeAreaView>
  );
}

function Campo({ rotulo, valor, alCambiar, maximo, multilinea = false }: { rotulo: string; valor: string; alCambiar: (v: string) => void; maximo: number; multilinea?: boolean }) {
  const { c, t } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[t.small, { color: c.textSoft, fontSize: 14 }]}>{rotulo}</Text>
      <TextInput
        value={valor}
        onChangeText={alCambiar}
        maxLength={maximo}
        multiline={multilinea}
        accessibilityLabel={rotulo}
        style={[t.body, estilos.campo, { backgroundColor: c.cardBg, borderColor: c.border, color: c.text, minHeight: multilinea ? 96 : 52 }]}
      />
    </View>
  );
}

function Boton({ icono, etiqueta, onPress, deshabilitado = false }: { icono: 'subir' | 'bajar' | 'plus' | 'trash'; etiqueta: string; onPress: () => void; deshabilitado?: boolean }) {
  const { c } = useTheme();
  return (
    <Presionable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: deshabilitado }}
      style={[estilos.boton, { opacity: deshabilitado ? 0.35 : 1 }]}
    >
      {/* No hay flechas arriba/abajo en `Icon`: es el chevron de siempre girado (270° mira arriba, 90° abajo). */}
      {icono === 'subir' || icono === 'bajar' ? (
        <View style={{ transform: [{ rotate: icono === 'subir' ? '270deg' : '90deg' }] }}>
          <Icon name="chevron" size={20} color={c.textStrong} />
        </View>
      ) : (
        <Icon name={icono} size={20} color={c.textStrong} />
      )}
    </Presionable>
  );
}

const estilos = StyleSheet.create({
  clausula: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 6 },
  filaDeCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  acciones: { flexDirection: 'row', gap: 0 },
  boton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  texto: { fontSize: 16, lineHeight: 23, minHeight: 72, textAlignVertical: 'top' },
  campo: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, textAlignVertical: 'top' },
});
