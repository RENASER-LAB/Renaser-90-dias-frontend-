import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { FormField } from '../../../components/FormField';
import { Icon } from '../../../components/Icon';
import { Presionable } from '../../../components/Presionable';
import { useEnfocarAlLlegar } from '../../../hooks/useEnfocarAlLlegar';
import { fuentes } from '../../../theme/fuentes';
import { useTheme } from '../../../theme/ThemeContext';
import { tacto } from '../../../utils/tacto';
import { OpcionElegible } from '../../onboarding/components/OpcionElegible';
import type { EscalaDeLaPregunta, PreguntaDelDiagnostico } from '../types/diagnostico.types';
import { limpiarNumeroTecleado, type RespuestaEnEdicion } from '../utils/respuestasEnEdicion';
import { avisoDeMaximo, textoDelContador } from '../utils/textosDelDiagnostico';
import { CampoDeFecha } from './CampoDeFecha';

/**
 * Cómo se contesta cada tipo de pregunta del diagnóstico (spec 026, FR-006). Todos reciben la respuesta en edición y devuelven
 * la nueva entera; ninguno guarda nada ni sabe de pasos. Medidas de la app: toques de 48 o más, texto de 16, tuteo.
 */

/** El `id` del campo para las pruebas de extremo a extremo (Maestro): `pregunta-<clave>`, p. ej. `pregunta-p2`. */
export function idDelCampo(pregunta: PreguntaDelDiagnostico): string {
  return `pregunta-${pregunta.clave}`;
}

export interface ControlProps {
  pregunta: PreguntaDelDiagnostico;
  valor: RespuestaEnEdicion;
  alCambiar: (nuevo: RespuestaEnEdicion) => void;
  /** El mensaje de lo que falta, si lo hay: el campo se pinta de rojo; el texto lo dice quien lo dibuja. */
  error?: string;
}

/* ───────────── Texto corto, número y párrafo ───────────── */

export function ControlDeTexto({
  pregunta,
  valor,
  alCambiar,
  error,
  enfocarAlLlegar = false,
}: ControlProps & { enfocarAlLlegar?: boolean }) {
  const campo = useRef<TextInput>(null);
  useEnfocarAlLlegar(campo, enfocarAlLlegar);
  return (
    <FormField
      ref={campo}
      label=""
      accessibilityLabel={pregunta.texto}
      testID={idDelCampo(pregunta)}
      value={valor.texto}
      onChangeText={texto => alCambiar({ ...valor, texto })}
      maxLength={pregunta.largoMaximo ?? undefined}
      error={error}
      mensajeDeErrorAparte
      autoCapitalize="sentences"
      returnKeyType="done"
      submitBehavior="blurAndSubmit"
    />
  );
}

export function ControlDeNumero({
  pregunta,
  valor,
  alCambiar,
  error,
  enfocarAlLlegar = false,
}: ControlProps & { enfocarAlLlegar?: boolean }) {
  const campo = useRef<TextInput>(null);
  useEnfocarAlLlegar(campo, enfocarAlLlegar);
  return (
    <FormField
      ref={campo}
      label=""
      accessibilityLabel={pregunta.texto}
      testID={idDelCampo(pregunta)}
      value={valor.texto}
      onChangeText={texto => alCambiar({ ...valor, texto: limpiarNumeroTecleado(texto) })}
      keyboardType="decimal-pad"
      error={error}
      mensajeDeErrorAparte
      returnKeyType="done"
      submitBehavior="blurAndSubmit"
    />
  );
}

export function ControlDeArea({ pregunta, valor, alCambiar, error }: ControlProps) {
  const { c, t } = useTheme();
  const maximo = pregunta.largoMaximo;
  const largo = valor.texto.length;
  const cercaDelTope = maximo !== null && largo >= maximo * 0.9;
  return (
    <View style={estilos.columna}>
      <FormField
        label=""
        accessibilityLabel={pregunta.texto}
      testID={idDelCampo(pregunta)}
        value={valor.texto}
        onChangeText={texto => alCambiar({ ...valor, texto })}
        multiline
        numberOfLines={6}
        maxLength={maximo ?? undefined}
        error={error}
      mensajeDeErrorAparte
        autoCapitalize="sentences"
      />
      {maximo !== null ? (
        <Text
          accessibilityLabel={`${largo} de ${maximo} caracteres`}
          style={[t.small, estilos.contador, { color: cercaDelTope ? c.danger : c.textSoft, fontSize: 14 }]}
        >
          {textoDelContador(largo, maximo)}
        </Text>
      ) : null}
    </View>
  );
}

/* ───────────── Opciones ───────────── */

export function ControlDeSeleccionUnica({ pregunta, valor, alCambiar }: ControlProps) {
  return (
    <View accessibilityRole="radiogroup" style={estilos.lista}>
      {pregunta.opciones.map(opcion => (
        <OpcionElegible
          key={opcion.valor}
          etiqueta={opcion.etiqueta}
          elegida={valor.texto === opcion.valor}
          onElegir={() => alCambiar({ ...valor, texto: opcion.valor })}
        />
      ))}
    </View>
  );
}

/** Una opción de varias: cuadrada (se pueden marcar varias), no redonda como la de elegir una sola. */
function OpcionDeVarias({
  etiqueta,
  marcada,
  alTocar,
}: {
  etiqueta: string;
  marcada: boolean;
  alTocar: () => void;
}) {
  const { c, t } = useTheme();
  return (
    <Presionable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
      accessibilityLabel={etiqueta}
      onPress={alTocar}
      style={[estilos.opcion, { borderColor: marcada ? c.gold : c.border, backgroundColor: marcada ? c.goldWash : c.cardBgAlt }]}
    >
      <Text
        numberOfLines={3}
        style={[t.body, estilos.textoOpcion, { color: marcada ? c.textStrong : c.text, fontFamily: marcada ? fuentes.media : fuentes.regular }]}
      >
        {etiqueta}
      </Text>
      <View style={[estilos.casilla, { borderColor: marcada ? c.gold : c.borderStrong, backgroundColor: marcada ? c.gold : 'transparent' }]}>
        {marcada ? <Icon name="check" size={16} color={c.onGold} strokeWidth={2.4} /> : null}
      </View>
    </Presionable>
  );
}

export function ControlDeVarias({ pregunta, valor, alCambiar }: ControlProps) {
  const { c, t } = useTheme();
  const maximo = pregunta.maximoOpciones;
  const [intentoDeMas, setIntentoDeMas] = useState(false);

  const alternar = (opcionValor: string) => {
    const yaEsta = valor.valores.includes(opcionValor);
    if (yaEsta) {
      tacto.seleccion();
      setIntentoDeMas(false);
      alCambiar({ ...valor, valores: valor.valores.filter(v => v !== opcionValor) });
      return;
    }
    if (maximo !== null && valor.valores.length >= maximo) {
      /* La tercera no se marca; un texto breve lo dice. */
      tacto.error();
      setIntentoDeMas(true);
      return;
    }
    tacto.seleccion();
    setIntentoDeMas(false);
    alCambiar({ ...valor, valores: [...valor.valores, opcionValor] });
  };

  return (
    <View style={estilos.columna}>
      {maximo !== null ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[t.body, estilos.aviso, { color: intentoDeMas ? c.danger : c.textSoft, fontFamily: intentoDeMas ? fuentes.media : fuentes.regular }]}
        >
          {avisoDeMaximo(maximo, intentoDeMas)}
        </Text>
      ) : null}
      <View accessibilityRole="list" style={estilos.lista}>
        {pregunta.opciones.map(opcion => (
          <OpcionDeVarias
            key={opcion.valor}
            etiqueta={opcion.etiqueta}
            marcada={valor.valores.includes(opcion.valor)}
            alTocar={() => alternar(opcion.valor)}
          />
        ))}
      </View>
    </View>
  );
}

/* ───────────── Escala y cuadrícula ───────────── */

const ESCALA_POR_DEFECTO: EscalaDeLaPregunta = { min: 1, max: 5, etiquetaMin: null, etiquetaMax: null };
const MAXIMO_DE_NUMEROS = 21;
const NUMEROS_POR_FILA = 5;

/** Los números de la escala, repartidos en filas parejas (de a lo más cinco) para que cada uno siga midiendo 48 o más. */
export function numerosDeLaEscala(escala: EscalaDeLaPregunta): number[][] {
  const desde = Math.trunc(escala.min);
  const hasta = Math.max(desde, Math.min(Math.trunc(escala.max), desde + MAXIMO_DE_NUMEROS - 1));
  const numeros = Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
  const filas = Math.ceil(numeros.length / NUMEROS_POR_FILA);
  const porFila = Math.ceil(numeros.length / filas);
  return Array.from({ length: filas }, (_, i) => numeros.slice(i * porFila, (i + 1) * porFila));
}

export function FilaDeNumeros({
  escala,
  elegido,
  alElegir,
  etiquetaDe,
}: {
  escala: EscalaDeLaPregunta;
  elegido: number | null;
  alElegir: (n: number) => void;
  etiquetaDe?: (n: number) => string;
}) {
  const filas = numerosDeLaEscala(escala);
  const porFila = filas[0]?.length ?? NUMEROS_POR_FILA;
  return (
    <View accessibilityRole="radiogroup" style={estilos.numeros}>
      {filas.map((fila, i) => (
        <View key={i} style={estilos.filaDeNumeros}>
          {fila.map(n => (
            <OpcionElegible
              key={n}
              forma="circulo"
              etiqueta={String(n)}
              accessibilityLabel={etiquetaDe ? etiquetaDe(n) : String(n)}
              elegida={elegido === n}
              onElegir={() => alElegir(n)}
            />
          ))}
          {/* La última fila, si es más corta, deja el hueco: los círculos no se estiran más que los de arriba. */}
          {Array.from({ length: porFila - fila.length }, (_, k) => (
            <View key={`hueco-${k}`} style={estilos.hueco} />
          ))}
        </View>
      ))}
    </View>
  );
}

function ExtremosDeLaEscala({ escala }: { escala: EscalaDeLaPregunta }) {
  const { c, t } = useTheme();
  if (!escala.etiquetaMin && !escala.etiquetaMax) return null;
  return (
    <View style={estilos.extremos}>
      <Text style={[t.body, estilos.extremo, { color: c.textSoft }]}>
        {escala.etiquetaMin ? `${escala.min} · ${escala.etiquetaMin}` : ''}
      </Text>
      <Text style={[t.body, estilos.extremo, { color: c.textSoft, textAlign: 'right' }]}>
        {escala.etiquetaMax ? `${escala.max} · ${escala.etiquetaMax}` : ''}
      </Text>
    </View>
  );
}

export function ControlDeEscala({ pregunta, valor, alCambiar }: ControlProps) {
  const escala = pregunta.escala ?? ESCALA_POR_DEFECTO;
  return (
    <View style={estilos.columna}>
      <FilaDeNumeros escala={escala} elegido={valor.escala} alElegir={n => alCambiar({ ...valor, escala: n })} />
      <ExtremosDeLaEscala escala={escala} />
    </View>
  );
}

export function ControlDeCuadricula({ pregunta, valor, alCambiar }: ControlProps) {
  const { c, t } = useTheme();
  const escala = pregunta.escala ?? ESCALA_POR_DEFECTO;
  const respondidas = pregunta.opciones.filter(o => typeof valor.filas[o.valor] === 'number').length;

  return (
    <View style={estilos.cuadricula}>
      <ExtremosDeLaEscala escala={escala} />
      <Text accessibilityLiveRegion="polite" style={[t.body, estilos.aviso, { color: c.textSoft }]}>
        {`${respondidas} de ${pregunta.opciones.length} respondidas`}
      </Text>
      {pregunta.opciones.map(fila => {
        const hecha = typeof valor.filas[fila.valor] === 'number';
        return (
          <View key={fila.valor} style={[estilos.filaTarjeta, { borderColor: hecha ? c.gold : c.border, backgroundColor: c.cardBgAlt }]}>
            <View style={estilos.tituloDeFila}>
              <Text style={[t.body, estilos.etiquetaDeFila, { color: c.textStrong, fontFamily: fuentes.media }]}>{fila.etiqueta}</Text>
              {hecha ? <Icon name="check" size={16} color={c.goldInk} strokeWidth={2.4} /> : null}
            </View>
            <FilaDeNumeros
              escala={escala}
              elegido={valor.filas[fila.valor] ?? null}
              alElegir={n => alCambiar({ ...valor, filas: { ...valor.filas, [fila.valor]: n } })}
              etiquetaDe={n => `${fila.etiqueta}: ${n}`}
            />
          </View>
        );
      })}
    </View>
  );
}

/* ───────────── Fecha y consentimiento ───────────── */

export function ControlDeFecha({ pregunta, valor, alCambiar, error }: ControlProps) {
  return <CampoDeFecha etiqueta={pregunta.texto} valor={valor.texto} alCambiar={texto => alCambiar({ ...valor, texto })} hayError={!!error} />;
}

/**
 * El consentimiento: el texto de la declaración (que viene en `ayuda`) encima de la casilla, completo y sin su propio
 * scroll (un solo scroll por pantalla); la etiqueta de la casilla es la de su única opción.
 */
export function ControlDeConsentimiento({ pregunta, valor, alCambiar, error }: ControlProps) {
  const { c, t } = useTheme();
  const etiqueta = pregunta.opciones[0]?.etiqueta ?? 'He leído y acepto la declaración';
  const alternar = () => {
    tacto.seleccion();
    alCambiar({ ...valor, marcada: !valor.marcada });
  };
  return (
    <View style={estilos.columna}>
      {pregunta.ayuda ? (
        <View style={[estilos.declaracion, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
          <Text style={[t.body, { color: c.text, fontSize: 16, lineHeight: 24 }]}>{pregunta.ayuda}</Text>
        </View>
      ) : null}
      <Presionable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: valor.marcada }}
        accessibilityLabel={etiqueta}
        onPress={alternar}
        style={[
          estilos.consentimiento,
          {
            borderColor: valor.marcada ? c.gold : error ? c.danger : c.borderStrong,
            backgroundColor: valor.marcada ? c.goldWash : c.cardBgAlt,
          },
        ]}
      >
        <View style={[estilos.casillaGrande, { borderColor: valor.marcada ? c.gold : c.tabInactive, backgroundColor: valor.marcada ? c.gold : 'transparent' }]}>
          {valor.marcada ? <Icon name="check" size={16} color={c.onGold} strokeWidth={2.4} /> : null}
        </View>
        <Text style={[t.body, estilos.textoConsentimiento, { color: c.textStrong, fontFamily: fuentes.media }]}>{etiqueta}</Text>
      </Presionable>
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 10 },
  lista: { gap: 10 },
  aviso: { fontSize: 15, lineHeight: 21 },
  contador: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  opcion: {
    minHeight: 56,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  textoOpcion: { flex: 1, fontSize: 16, lineHeight: 22 },
  casilla: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  numeros: { gap: 8 },
  filaDeNumeros: { flexDirection: 'row', gap: 8 },
  hueco: { flex: 1 },
  extremos: { flexDirection: 'row', gap: 12 },
  extremo: { flex: 1, fontSize: 14, lineHeight: 20 },
  cuadricula: { gap: 12 },
  filaTarjeta: { borderWidth: 1.5, borderRadius: 14, padding: 14, gap: 10 },
  tituloDeFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  etiquetaDeFila: { flex: 1, fontSize: 16, lineHeight: 22 },
  declaracion: { borderWidth: 1, borderRadius: 14, padding: 16 },
  consentimiento: {
    minHeight: 64,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  casillaGrande: { width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  textoConsentimiento: { flex: 1, fontSize: 16, lineHeight: 22 },
});
