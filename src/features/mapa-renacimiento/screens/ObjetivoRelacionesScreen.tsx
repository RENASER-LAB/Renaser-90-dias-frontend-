import React, { useState } from 'react';
import { View } from 'react-native';

import { PantallaPaso } from '../components/PantallaPaso';
import { Avisos, Entrada, EscalaDiez, Etiqueta, Nota, Pastillas, Pregunta, TarjetaMeta } from '../components/Piezas';
import { LIMITES, VINCULOS, calidadRelaciones, objetivoValido, redactar } from '../reglas';
import type { ObjetivoRelaciones } from '../tipos';
import type { PropsPaso } from './props';

/** V05 · Objetivo 3 · Relaciones (§3 V05). Conducta propia; se rechaza controlar a un tercero. */
export function ObjetivoRelacionesScreen({ estado, numeroDePaso }: PropsPaso) {
  const { mapa, actualizar, siguiente, anterior } = estado;
  const o = mapa.relaciones;
  const [editando, setEditando] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const avisos = calidadRelaciones(o);
  const valido = objetivoValido(o);

  const cambiar = (parche: Partial<ObjetivoRelaciones>) => actualizar(previo => {
    const relaciones = { ...previo.relaciones, ...parche };
    return {
      ...previo,
      relaciones: { ...relaciones, metaRedactada: relaciones.metaEditadaAMano ? relaciones.metaRedactada : redactar(relaciones) },
    };
  });

  return (
    <PantallaPaso
      paso={numeroDePaso ?? 5}
      onAtras={anterior}
      boton={{
        label: 'Revisar mi meta',
        onPress: () => { setIntentado(true); if (valido) siguiente(); },
        disabled: intentado && !valido,
        // Los avisos bloqueantes ya dicen qué falta; se reusan en vez de escribirlos dos veces.
        faltan: avisos.filter(a => a.bloquea).map(a => a.mensaje),
      }}
    >
      <Pregunta>¿Qué relación quieres fortalecer o transformar durante los próximos 83 días?</Pregunta>

      <Etiqueta>Vínculo</Etiqueta>
      <Pastillas opciones={VINCULOS} valor={o.vinculo} onCambiar={v => cambiar({ vinculo: v })} />

      <Etiqueta>Situación actual (1–10) · nivel de conexión</Etiqueta>
      <EscalaDiez valor={o.situacionActual} onCambiar={n => cambiar({ situacionActual: n })} />

      <Etiqueta>Resultado Día 90 (1–10)</Etiqueta>
      <EscalaDiez valor={o.resultadoDia90} onCambiar={n => cambiar({ resultadoDia90: n })} />

      <Etiqueta>Cambio observable</Etiqueta>
      <Entrada
        valor={o.cambioObservable}
        onCambiar={v => cambiar({ cambioObservable: v })}
        placeholder="Ej. más presencia y comunicación"
        multilinea
        minimo={LIMITES.cambioObservable.min}
        maximo={LIMITES.cambioObservable.max}
      />

      <Etiqueta>Evidencia</Etiqueta>
      <Entrada valor={o.evidencia} onCambiar={v => cambiar({ evidencia: v })} placeholder="Ej. conversaciones, tiempo de calidad" maximo={120} />

      <Etiqueta>Motivo</Etiqueta>
      <Entrada
        valor={o.motivo}
        onCambiar={v => cambiar({ motivo: v })}
        placeholder="¿Por qué es importante para ti?"
        multilinea
        minimo={LIMITES.motivo.min}
        maximo={LIMITES.motivo.max}
      />

      <TarjetaMeta
        texto={o.metaRedactada}
        editando={editando}
        onEditar={() => setEditando(e => !e)}
        onCambiar={texto => cambiar({ metaRedactada: texto, metaEditadaAMano: true })}
      />

      <Avisos avisos={avisos} soloBloqueantes={!intentado} />
      <Nota>El cambio debe depender de ti, no de controlar a otra persona. Enfócate en tus acciones, actitudes y comportamientos.</Nota>
      <View style={{ height: 8 }} />
    </PantallaPaso>
  );
}
