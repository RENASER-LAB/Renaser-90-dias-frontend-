import React from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../../../theme/ThemeContext';
import { pasarLimiteDeLaEscala, type FormularioDePregunta } from '../utils/borradorDePregunta';
import { CampoDeTexto, Contador, TextoDeError } from './piezas';

type CamposDeLaEscala = Pick<FormularioDePregunta, 'escalaMin' | 'escalaMax' | 'etiquetaMin' | 'etiquetaMax'>;

/** «1 = Muy insatisfecho(a) · 5 = Muy satisfecho(a)», o solo «De 1 a 5» si no hay etiquetas. */
export function resumenDeLaEscala(e: CamposDeLaEscala): string {
  const min = e.etiquetaMin.trim() ? `${e.escalaMin} = ${e.etiquetaMin.trim()}` : `${e.escalaMin}`;
  const max = e.etiquetaMax.trim() ? `${e.escalaMax} = ${e.etiquetaMax.trim()}` : `${e.escalaMax}`;
  return e.etiquetaMin.trim() || e.etiquetaMax.trim() ? `${min} · ${max}` : `De ${e.escalaMin} a ${e.escalaMax}`;
}

/** La escala de una pregunta de escala o de cuadrícula: de qué número a cuál y qué significan los extremos. */
export function EditorDeEscala({
  valor,
  onCambiar,
  error,
}: {
  valor: CamposDeLaEscala;
  onCambiar: (parcial: Partial<CamposDeLaEscala>) => void;
  error?: string | null;
}) {
  const { c, t } = useTheme();
  const bajaMin = pasarLimiteDeLaEscala(valor, 'min', -1);
  const subeMin = pasarLimiteDeLaEscala(valor, 'min', 1);
  const bajaMax = pasarLimiteDeLaEscala(valor, 'max', -1);
  const subeMax = pasarLimiteDeLaEscala(valor, 'max', 1);
  return (
    <View style={{ gap: 12 }}>
      <Contador
        rotulo="Desde"
        valor={`${valor.escalaMin}`}
        onMenos={() => onCambiar(bajaMin)}
        onMas={() => onCambiar(subeMin)}
        menosApagado={bajaMin.escalaMin === valor.escalaMin}
        masApagado={subeMin.escalaMin === valor.escalaMin}
      />
      <Contador
        rotulo="Hasta"
        valor={`${valor.escalaMax}`}
        onMenos={() => onCambiar(bajaMax)}
        onMas={() => onCambiar(subeMax)}
        menosApagado={bajaMax.escalaMax === valor.escalaMax}
        masApagado={subeMax.escalaMax === valor.escalaMax}
      />
      <CampoDeTexto
        rotulo={`Qué significa el ${valor.escalaMin} (opcional)`}
        value={valor.etiquetaMin}
        onChangeText={etiquetaMin => onCambiar({ etiquetaMin })}
        placeholder="Ej.: Muy insatisfecho(a)"
        maxLength={80}
      />
      <CampoDeTexto
        rotulo={`Qué significa el ${valor.escalaMax} (opcional)`}
        value={valor.etiquetaMax}
        onChangeText={etiquetaMax => onCambiar({ etiquetaMax })}
        placeholder="Ej.: Muy satisfecho(a)"
        maxLength={80}
      />
      <Text style={[t.body, { color: c.textSoft, fontSize: 16, lineHeight: 22 }]}>{resumenDeLaEscala(valor)}</Text>
      {error ? <TextoDeError texto={error} /> : null}
    </View>
  );
}
