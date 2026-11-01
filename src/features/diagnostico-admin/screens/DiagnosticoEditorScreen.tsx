import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvisoDeAbajo } from '../../../components/AvisoDeAbajo';
import { BotonSecundario } from '../../../components/Legible';
import { useSystemBackHandler } from '../../../hooks/useSystemBackHandler';
import { useOcultarBarraAlDesplazar } from '../../../navigation/barraAlDesplazar/BarraInferior';
import { useResponsive } from '../../../theme/responsive';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { ESPACIO_PARA_LANZADOR } from '../../renasia/components/lugarDelLanzador';
import { CabeceraAdmin } from '../../admin/components/CabeceraAdmin';
import { avisar, confirmar } from '../../admin/utils/dialogo';
import {
  borrarSeccion,
  crearPregunta,
  crearSeccion,
  duplicarPregunta,
  editarPregunta,
  editarSeccion,
  moverPregunta,
  ordenarSecciones,
} from '../api/diagnosticoAdminApi';
import { EditorDePreguntaSheet } from '../components/EditorDePreguntaSheet';
import { EditorDeSeccionSheet } from '../components/EditorDeSeccionSheet';
import { Aviso, BotonDeAccion } from '../components/piezas';
import { PortadaDelEditor, SeccionDelEditor } from '../components/SeccionDelEditor';
import type { EstadoDelDiagnosticoAdmin } from '../hooks/useDiagnosticoAdmin';
import type { PreguntaAdmin, PreguntaRequest, SeccionAdmin } from '../types/diagnosticoAdmin.types';
import { destinoAlMover, ordenNuevoDeSecciones, puedeMoverPregunta, puedeMoverSeccion, type Direccion } from '../utils/reordenar';
import { textoDeLaPublicacion } from '../utils/publicar';
import { textoDelResultado, textoDeQuitarSeccion } from '../utils/quitarPreguntas';
import { cantidad, mensajeDeGuardar, textoDelFallo } from '../utils/textos';

/**
 * El editor del diagnóstico (Administración → Fichas → Diagnóstico inicial; spec 026): la portada y los pasos con sus preguntas, en el
 * orden en que las ve la persona. Crear, editar, duplicar y reordenar preguntas y secciones; todo toca el BORRADOR, y las personas
 * solo ven lo que se publica.
 *
 * - Cada cambio se manda al servidor y se relee el borrador antes de avisarlo (`ejecutar`): lo que se ve es lo que el servidor tiene.
 * - Subir y bajar son botones de 48, sin arrastre; una pregunta que llega al borde de su sección pasa a la de al lado.
 * - Un solo scroll. El aviso de lo guardado es el de abajo (`AvisoDeAbajo`), que se ve sin importar dónde se hizo el cambio en una
 *   lista larga.
 * - El atrás del sistema sube un nivel: de aquí a la lista de fichas.
 *
 * Movimiento (`emil-design-eng`): es una pantalla de trabajo que se usa seguido; solo responde al dedo (`Presionable`) y las hojas
 * son las de siempre. Nada se anima por su cuenta.
 */
export function DiagnosticoEditorScreen({ estado, onVolver }: { estado: EstadoDelDiagnosticoAdmin; onVolver: () => void }) {
  const barraAlDesplazar = useOcultarBarraAlDesplazar();
  const { c, t } = useTheme();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const { borrador, cargando, fallo, desactualizado, otraPersona, recargar, ejecutar } = estado;

  const [pregunta, setPregunta] = useState<{ pregunta: PreguntaAdmin | null; seccionId: number }>({ pregunta: null, seccionId: 0 });
  const [preguntaAbierta, setPreguntaAbierta] = useState(false);
  const [seccion, setSeccion] = useState<SeccionAdmin | null>(null);
  const [seccionAbierta, setSeccionAbierta] = useState(false);
  const [aviso, setAviso] = useState<{ clave: number; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const hojaAbierta = preguntaAbierta || seccionAbierta;
  const atras = useCallback(() => {
    onVolver();
    return true;
  }, [onVolver]);
  useSystemBackHandler(atras, !hojaAbierta);

  const secciones = useMemo(() => borrador?.secciones ?? [], [borrador]);
  const retiradas = useMemo(() => borrador?.retiradas ?? [], [borrador]);
  const portada = secciones.find(s => s.esPortada) ?? null;
  const pasos = secciones.filter(s => !s.esPortada);

  const avisarListo = (texto: string) => {
    tacto.logro();
    setAviso({ clave: Date.now(), texto });
  };

  /** Un cambio suelto de la lista (mover, quitar una sección): ocupa la pantalla un instante y dice el motivo si falla. */
  const correr = async (titulo: string, alFallar: string, accion: () => Promise<void>) => {
    if (ocupado) return;
    setOcupado(true);
    try {
      await accion();
    } catch (e) {
      tacto.error();
      avisar(titulo, mensajeDeGuardar(e, alFallar));
    } finally {
      setOcupado(false);
    }
  };

  const abrirPregunta = (p: PreguntaAdmin | null, seccionId: number) => {
    setPregunta({ pregunta: p, seccionId });
    setPreguntaAbierta(true);
  };

  const guardarPregunta = async (cuerpo: PreguntaRequest, original: PreguntaAdmin | null) => {
    await ejecutar(() => (original ? editarPregunta(original.id, cuerpo) : crearPregunta(cuerpo)));
    setPreguntaAbierta(false);
    avisarListo(original ? 'Pregunta guardada.' : 'Pregunta creada.');
  };

  const duplicar = async (p: PreguntaAdmin) => {
    await ejecutar(() => duplicarPregunta(p.id));
    setPreguntaAbierta(false);
    avisarListo('Pregunta duplicada. La copia quedó debajo.');
  };

  const mover = (p: PreguntaAdmin, direccion: Direccion) => {
    const destino = destinoAlMover(secciones, p.id, direccion);
    if (!destino) return;
    void correr('No se pudo mover la pregunta', 'No se pudo mover la pregunta. Vuelve a intentar.', () =>
      ejecutar(() => moverPregunta(p.id, destino)),
    );
  };

  const abrirSeccion = (s: SeccionAdmin | null) => {
    setSeccion(s);
    setSeccionAbierta(true);
  };

  const guardarSeccion = async (cuerpo: { titulo: string; descripcion: string | null }) => {
    const existente = seccion;
    await ejecutar(() => (existente ? editarSeccion(existente.id, cuerpo) : crearSeccion(cuerpo)));
    setSeccionAbierta(false);
    avisarListo(existente?.esPortada ? 'Portada guardada.' : existente ? 'Sección guardada.' : 'Sección creada.');
  };

  const moverSeccion = (s: SeccionAdmin, direccion: Direccion) => {
    const orden = ordenNuevoDeSecciones(secciones, s.id, direccion);
    if (!orden) return;
    void correr('No se pudo mover la sección', 'No se pudo mover la sección. Vuelve a intentar.', () => ejecutar(() => ordenarSecciones(orden)));
  };

  const quitarSeccion = async (s: SeccionAdmin) => {
    const texto = textoDeQuitarSeccion(s);
    if (!(await confirmar(texto.titulo, texto.mensaje, { ok: 'Quitar', destructivo: true }))) return;
    await correr('No se pudo quitar la sección', 'No se pudo quitar la sección. Vuelve a intentar.', async () => {
      const resultado = await ejecutar(() => borrarSeccion(s.id));
      avisarListo(`Sección quitada · ${textoDelResultado(resultado)}`);
    });
  };

  const cuerpo = [t.body, { color: c.textSoft, fontSize: 16, lineHeight: 23 }];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <CabeceraAdmin
        titulo="Diagnóstico inicial"
        subtitulo={borrador ? textoDeLaPublicacion(borrador.publicada) : null}
        onVolver={onVolver}
      />
      <View style={{ flex: 1 }}>
        <ScrollView
          {...barraAlDesplazar}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: horizontalPadding,
            paddingBottom: 36 + ESPACIO_PARA_LANZADOR + 56,
            maxWidth: contentMaxWidth,
            width: '100%',
            alignSelf: 'center',
            gap: 14,
          }}
        >
          {cargando && !borrador ? <Text style={cuerpo}>Cargando la ficha…</Text> : null}
          {!cargando && fallo && !borrador ? (
            <View style={{ gap: 10 }}>
              <Text accessibilityRole="alert" style={[t.body, { color: c.danger, fontSize: 16, lineHeight: 23 }]}>
                {textoDelFallo(fallo, 'No se pudo cargar el diagnóstico.')}
              </Text>
              {fallo !== 'sin_permiso' && fallo !== 'no_disponible' ? <BotonSecundario etiqueta="Reintentar" onPress={() => void recargar()} /> : null}
            </View>
          ) : null}

          {borrador ? (
            <>
              {otraPersona ? (
                <Aviso texto="Otra persona publicó cambios mientras editabas. Lo que ves es tu borrador; para ver lo vigente, actualiza.">
                  <View style={estilos.acciones}>
                    <BotonDeAccion etiqueta="Actualizar" icono="rotateCcw" onPress={() => void recargar()} />
                  </View>
                </Aviso>
              ) : null}
              {desactualizado ? (
                <Aviso texto="Tu último cambio quedó guardado, pero no pudimos actualizar la lista.">
                  <View style={estilos.acciones}>
                    <BotonDeAccion etiqueta="Actualizar" icono="rotateCcw" onPress={() => void recargar()} />
                  </View>
                </Aviso>
              ) : null}
              {borrador.noEntendidas > 0 ? (
                <Aviso
                  texto={`${cantidad(borrador.noEntendidas, 'pregunta es de un tipo', 'preguntas son de un tipo')} que esta versión de la app todavía no sabe mostrar: no aparece${borrador.noEntendidas === 1 ? '' : 'n'} acá, pero la ficha las conserva.`}
                />
              ) : null}

              {portada ? <PortadaDelEditor seccion={portada} onEditar={() => abrirSeccion(portada)} /> : null}

              {pasos.map(s => (
                <SeccionDelEditor
                  key={s.id}
                  seccion={s}
                  secciones={secciones}
                  retiradas={retiradas}
                  puedeSubir={puedeMoverSeccion(secciones, s.id, 'arriba')}
                  puedeBajar={puedeMoverSeccion(secciones, s.id, 'abajo')}
                  puedeMoverPregunta={(id, direccion) => !ocupado && puedeMoverPregunta(secciones, id, direccion)}
                  modoQuitar={false}
                  marcadas={[]}
                  onEditar={() => abrirSeccion(s)}
                  onMover={direccion => moverSeccion(s, direccion)}
                  onQuitar={() => void quitarSeccion(s)}
                  onAnadirPregunta={() => abrirPregunta(null, s.id)}
                  onAbrirPregunta={p => abrirPregunta(p, s.id)}
                  onMoverPregunta={mover}
                  onMarcar={() => undefined}
                />
              ))}

              {pasos.length === 0 ? <Text style={cuerpo}>La ficha todavía no tiene pasos. Añade una sección para empezar.</Text> : null}

              <View style={estilos.acciones}>
                <BotonDeAccion etiqueta="Añadir sección" icono="plus" onPress={() => abrirSeccion(null)} />
              </View>
            </>
          ) : null}
        </ScrollView>

        <AvisoDeAbajo aviso={aviso} onTerminar={() => setAviso(null)} />
      </View>

      <EditorDePreguntaSheet
        visible={preguntaAbierta}
        pregunta={pregunta.pregunta}
        seccionId={pregunta.seccionId}
        secciones={secciones}
        alCerrar={() => setPreguntaAbierta(false)}
        alGuardar={guardarPregunta}
        alDuplicar={duplicar}
      />
      <EditorDeSeccionSheet visible={seccionAbierta} seccion={seccion} alCerrar={() => setSeccionAbierta(false)} alGuardar={guardarSeccion} />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
