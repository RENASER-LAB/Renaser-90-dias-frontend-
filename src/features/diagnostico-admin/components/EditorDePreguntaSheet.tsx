import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../../components/Icon';
import { Interruptor } from '../../../components/Interruptor';
import { BotonPrincipal, BotonSecundario, TituloDeSeccion } from '../../../components/Legible';
import { HojaDesdeAbajo } from '../../../components/hojaDesdeAbajo/HojaDesdeAbajo';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { ChipDeOpcion } from '../../admin/components/ChipDeOpcion';
import { confirmar } from '../../admin/utils/dialogo';
import type { PreguntaAdmin, PreguntaRequest, SeccionAdmin } from '../types/diagnosticoAdmin.types';
import {
  alternarFormacion,
  AVISO_AL_QUITAR_UN_OBJETIVO,
  conDestino,
  conTipo,
  cuerpoDesde,
  dejaDeAlimentarUnObjetivo,
  faltasDeLaPregunta,
  formularioDesde,
  formularioNuevo,
  hayCambios,
  motivoParaNoCambiarElTipo,
  pasarMaximo,
  primeraFalta,
  textoDelMaximo,
  type FormularioDePregunta,
} from '../utils/borradorDePregunta';
import { preguntasQuePuedenSerCondicion } from '../utils/condiciones';
import { mensajeDeGuardar } from '../utils/textos';
import {
  esConsentimiento,
  FORMACIONES_ELEGIBLES,
  tipoAdmiteMaximo,
  tipoPideEscala,
  tipoPideOpciones,
  TIPOS_EN_ORDEN,
} from '../utils/tiposDePregunta';
import { EditorDeEscala } from './EditorDeEscala';
import { EditorDeOpciones } from './EditorDeOpciones';
import { ChipMarcable, Contador, CampoDeTexto, TextoDeError } from './piezas';
import { SelectorDeCondicion } from './SelectorDeCondicion';
import { SelectorDeDestino } from './SelectorDeDestino';

/**
 * El editor de una pregunta del diagnóstico (Administración, spec 026): texto, ayuda, tipo, si es obligatoria, sus opciones o su escala,
 * cuándo se muestra, qué alimenta y en qué formaciones. Una `HojaDesdeAbajo` a pantalla completa con «Guardar» fijo abajo.
 *
 * - Nada se guarda hasta «Guardar»; salir con cambios pregunta antes. «Guardar» siempre responde: si falta algo lo dice (en el campo y
 *   arriba del botón) en vez de quedar apagado sin explicación.
 * - Los 400 y 409 del servidor se muestran con su motivo arriba del botón («Ya alimenta la pregunta …»).
 * - Una pregunta protegida o con respuestas no cambia de tipo; una protegida tampoco se quita.
 * - Quitar el destino que alimenta un objetivo avisa antes («Las personas ya no tendrán ese objetivo preparado…»).
 */
export function EditorDePreguntaSheet({
  visible,
  pregunta,
  seccionId,
  secciones,
  alCerrar,
  alGuardar,
  alDuplicar,
}: {
  visible: boolean;
  /** `null` = pregunta nueva, en la sección `seccionId`. */
  pregunta: PreguntaAdmin | null;
  seccionId: number;
  secciones: readonly SeccionAdmin[];
  alCerrar: () => void;
  /** Guarda en el servidor. Si lanza, la hoja dice el motivo y sigue abierta; si no, quien llama la cierra. */
  alGuardar: (cuerpo: PreguntaRequest, original: PreguntaAdmin | null) => Promise<void>;
  alDuplicar?: (pregunta: PreguntaAdmin) => Promise<void>;
}) {
  const { c, t } = useTheme();
  const original = useMemo(() => (pregunta ? formularioDesde(pregunta) : formularioNuevo(seccionId)), [pregunta, seccionId]);
  const [form, setForm] = useState<FormularioDePregunta>(original);
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [duplicando, setDuplicando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Cada vez que se abre parte de lo que el servidor tiene (y no de una edición que se dejó a medias). */
  useEffect(() => {
    if (!visible) return;
    setForm(original);
    setIntento(false);
    setError(null);
    setGuardando(false);
    setDuplicando(false);
  }, [visible, original]);

  const cambiado = hayCambios(form, original);
  const preguntaId = pregunta?.id ?? null;
  const faltas = useMemo(() => faltasDeLaPregunta(form, { secciones, preguntaId }), [form, secciones, preguntaId]);
  const falta = primeraFalta(faltas);
  const candidatas = useMemo(() => preguntasQuePuedenSerCondicion(secciones, preguntaId, form.seccionId), [secciones, preguntaId, form.seccionId]);
  const noCambiaDeTipo = motivoParaNoCambiarElTipo(pregunta);
  const nombreDeLaSeccion = secciones.find(s => s.id === form.seccionId)?.titulo ?? null;

  const cambiar = (parcial: Partial<FormularioDePregunta>) => {
    setError(null);
    setForm(f => ({ ...f, ...parcial }));
  };

  const cerrar = async () => {
    if (cambiado && !guardando && !(await confirmar('¿Salir sin guardar?', 'Se pierden los cambios de esta pregunta.', { ok: 'Salir' }))) return;
    alCerrar();
  };

  const guardar = async () => {
    setIntento(true);
    if (falta) {
      tacto.error();
      return;
    }
    if (dejaDeAlimentarUnObjetivo(pregunta, form)) {
      const sigue = await confirmar('Esta pregunta deja de alimentar un objetivo', AVISO_AL_QUITAR_UN_OBJETIVO, { ok: 'Guardar de todos modos' });
      if (!sigue) return;
    }
    setGuardando(true);
    setError(null);
    try {
      await alGuardar(cuerpoDesde(form, pregunta), pregunta);
    } catch (e) {
      tacto.error();
      setError(mensajeDeGuardar(e, 'No se pudo guardar la pregunta. Vuelve a intentar.'));
    } finally {
      setGuardando(false);
    }
  };

  const duplicar = async () => {
    if (!pregunta || !alDuplicar) return;
    setDuplicando(true);
    setError(null);
    try {
      await alDuplicar(pregunta);
    } catch (e) {
      tacto.error();
      setError(mensajeDeGuardar(e, 'No se pudo duplicar la pregunta. Vuelve a intentar.'));
    } finally {
      setDuplicando(false);
    }
  };

  const ver = (campo: keyof typeof faltas) => (intento ? (faltas[campo] ?? null) : null);
  const esNueva = pregunta === null;
  const detalleDelTipo = TIPOS_EN_ORDEN.find(x => x.valor === form.tipo)?.detalle;

  return (
    <HojaDesdeAbajo
      visible={visible}
      alCerrar={() => void cerrar()}
      titulo={esNueva ? 'Pregunta nueva' : 'Editar pregunta'}
      subtitulo={nombreDeLaSeccion ? `En «${nombreDeLaSeccion}»` : undefined}
      tamano="completa"
      etiquetaCerrar="Cerrar sin guardar"
      pie={
        <View style={estilos.pie}>
          {intento && falta ? <TextoDeError texto={`Falta: ${falta}`} /> : null}
          {error ? <TextoDeError texto={error} /> : null}
          <BotonPrincipal etiqueta={esNueva ? 'Crear pregunta' : 'Guardar'} onPress={() => void guardar()} cargando={guardando} deshabilitado={duplicando} />
        </View>
      }
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={estilos.cuerpo}>
        {pregunta?.protegida || (pregunta && pregunta.respuestas > 0) ? (
          <View style={[estilos.nota, { backgroundColor: c.cardBgAlt, borderColor: c.border }]}>
            {pregunta.protegida ? (
              <View style={estilos.notaFila}>
                <Icon name="lock" size={16} color={c.textSoft} />
                <Text style={[t.body, { color: c.textStrong, fontSize: 16, lineHeight: 22, flexShrink: 1 }]}>
                  Protegida: no se quita ni cambia de tipo. Su texto, su ayuda y su orden sí.
                </Text>
              </View>
            ) : null}
            {pregunta.respuestas > 0 ? (
              <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>
                {pregunta.respuestas === 1 ? '1 persona la respondió.' : `${pregunta.respuestas} personas la respondieron.`}
              </Text>
            ) : null}
          </View>
        ) : null}

        <CampoDeTexto
          rotulo="Pregunta"
          value={form.texto}
          onChangeText={texto => cambiar({ texto })}
          placeholder="Ej.: ¿Cuál es tu nombre completo?"
          multiline
          numberOfLines={3}
          error={ver('texto')}
          autoCapitalize="sentences"
        />

        <CampoDeTexto
          rotulo={esConsentimiento(form.tipo) ? 'Texto de la declaración' : 'Ayuda (opcional)'}
          ayuda={
            esConsentimiento(form.tipo)
              ? 'Se muestra completo encima de la casilla. Sin él no se puede publicar.'
              : 'Una línea que se lee bajo la pregunta.'
          }
          value={form.ayuda}
          onChangeText={ayuda => cambiar({ ayuda })}
          multiline
          numberOfLines={esConsentimiento(form.tipo) ? 5 : 2}
          autoCapitalize="sentences"
        />

        <View style={{ gap: 10 }}>
          <TituloDeSeccion detalle={noCambiaDeTipo ?? detalleDelTipo}>Tipo de respuesta</TituloDeSeccion>
          <View style={estilos.chips} accessibilityRole="radiogroup" accessibilityLabel="Tipo de respuesta">
            {TIPOS_EN_ORDEN.map(x => (
              <ChipDeOpcion
                key={x.valor}
                etiqueta={x.etiqueta}
                activo={form.tipo === x.valor}
                deshabilitado={noCambiaDeTipo !== null && form.tipo !== x.valor}
                onPress={() => setForm(f => conTipo(f, x.valor))}
              />
            ))}
          </View>
        </View>

        <View style={[estilos.interruptor, { backgroundColor: c.cardBg, borderColor: c.border }]}>
          <View style={{ flex: 1, flexShrink: 1 }}>
            <Text style={[t.body, { color: c.textStrong, fontSize: 16, fontFamily: fuentes.media }]}>Obligatoria</Text>
            <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>La persona no avanza sin responderla.</Text>
          </View>
          <Interruptor etiqueta="Obligatoria" valor={form.requerida} onCambiar={requerida => cambiar({ requerida })} />
        </View>

        {tipoPideOpciones(form.tipo) || esConsentimiento(form.tipo) ? (
          <View style={{ gap: 10 }}>
            {esConsentimiento(form.tipo) ? null : (
              <TituloDeSeccion detalle={form.tipo === 'CUADRICULA' ? 'Cada fila lleva la misma escala.' : undefined}>
                {form.tipo === 'CUADRICULA' ? 'Filas' : 'Opciones'}
              </TituloDeSeccion>
            )}
            <EditorDeOpciones
              tipo={form.tipo}
              opciones={form.opciones}
              destino={form.alimenta}
              onCambiar={opciones => cambiar({ opciones })}
              error={ver('opciones')}
              errorDeCodigos={ver('codigos')}
            />
          </View>
        ) : null}

        {tipoAdmiteMaximo(form.tipo) ? (
          <View style={{ gap: 6 }}>
            <Contador
              rotulo="Máximo de opciones"
              valor={textoDelMaximo(form.maximoOpciones)}
              onMenos={() => cambiar({ maximoOpciones: pasarMaximo(form.maximoOpciones, -1, form.opciones.length) })}
              onMas={() => cambiar({ maximoOpciones: pasarMaximo(form.maximoOpciones, 1, form.opciones.length) })}
              menosApagado={form.maximoOpciones === null}
              masApagado={form.maximoOpciones !== null && form.maximoOpciones >= Math.max(form.opciones.length, 1)}
            />
            {ver('maximo') ? <TextoDeError texto={ver('maximo') as string} /> : null}
          </View>
        ) : null}

        {tipoPideEscala(form.tipo) ? (
          <View style={{ gap: 10 }}>
            <TituloDeSeccion>Escala</TituloDeSeccion>
            <EditorDeEscala valor={form} onCambiar={cambiar} error={ver('escala')} />
          </View>
        ) : null}

        <SelectorDeCondicion
          activa={form.condicionActiva}
          condicion={form.condicion}
          candidatas={candidatas}
          onCambiar={({ condicionActiva, condicion }) => cambiar({ condicionActiva, condicion })}
          error={ver('condicion')}
        />

        <SelectorDeDestino
          tipo={form.tipo}
          valor={form.alimenta}
          secciones={secciones}
          preguntaId={preguntaId}
          onCambiar={alimenta => setForm(f => conDestino(f, alimenta))}
          error={ver('alimenta')}
        />

        <View style={{ gap: 10 }}>
          <TituloDeSeccion detalle="Si no eliges ninguna, se muestra en todas.">Se muestra en</TituloDeSeccion>
          <View style={estilos.chips}>
            {FORMACIONES_ELEGIBLES.map(f => (
              <ChipMarcable
                key={f.codigo}
                etiqueta={f.etiqueta}
                marcado={form.formaciones.includes(f.codigo)}
                onPress={() => cambiar({ formaciones: alternarFormacion(form.formaciones, f.codigo) })}
              />
            ))}
          </View>
        </View>

        {pregunta && alDuplicar ? (
          <View style={{ gap: 6 }}>
            <BotonSecundario
              etiqueta="Duplicar esta pregunta"
              icono="copy"
              onPress={() => void duplicar()}
              cargando={duplicando}
              deshabilitado={cambiado || guardando}
            />
            <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>
              {cambiado ? 'Guarda tus cambios antes de duplicar.' : 'La copia no lleva respuestas ni «alimenta».'}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </HojaDesdeAbajo>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { gap: 22, paddingHorizontal: 20, paddingBottom: 32 },
  pie: { gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interruptor: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 14, minHeight: 64 },
  nota: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  notaFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
