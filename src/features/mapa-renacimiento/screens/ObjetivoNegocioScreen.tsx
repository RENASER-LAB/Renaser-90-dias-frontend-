import React, { useState } from 'react';
import { View } from 'react-native';

import { Row } from '../../../components/ui';
import { PantallaPaso } from '../components/PantallaPaso';
import { Apoyo, Avisos, Entrada, Etiqueta, Pastillas, Pregunta, TarjetaMeta } from '../components/Piezas';
import { LIMITES, MONEDAS, PERIODOS, RESULTADOS_NEGOCIO, calidadNegocio, objetivoValido, redactar } from '../reglas';
import { conMoneda, ejemploDeNegocio } from '../ejemplos';
import type { ObjetivoNegocio } from '../tipos';
import type { PropsPaso } from './props';

const OPCIONES_MONEDA = MONEDAS.map(m => ({ clave: m, etiqueta: m }));

/** V04 · Objetivo 2 · Negocio y dinero (§3 V04). Admite 0 de línea base; una deuda puede bajar. */
export function ObjetivoNegocioScreen({ estado, numeroDePaso }: PropsPaso) {
  const { mapa, actualizar, siguiente, anterior } = estado;
  const o = mapa.negocio;
  const [editando, setEditando] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const avisos = calidadNegocio(o);
  const valido = objetivoValido(o);

  const cambiar = (parche: Partial<ObjetivoNegocio>) => actualizar(previo => {
    const negocio = { ...previo.negocio, ...parche };
    return { ...previo, negocio: { ...negocio, metaRedactada: negocio.metaEditadaAMano ? negocio.metaRedactada : redactar(negocio) } };
  });

  /* El ejemplo sigue al tipo elegido: para deuda baja, para el resto sube. Ver `ejemplos.ts`. */
  const ejemplo = ejemploDeNegocio(o.tipoResultado);

  return (
    <PantallaPaso
      paso={numeroDePaso ?? 4}
      onAtras={anterior}
      boton={{
        label: 'Revisar mi meta',
        onPress: () => { setIntentado(true); if (valido) siguiente(); },
        disabled: intentado && !valido,
        // Los avisos bloqueantes ya dicen qué falta; se reusan en vez de escribirlos dos veces.
        faltan: avisos.filter(a => a.bloquea).map(a => a.mensaje),
      }}
    >
      <Pregunta>¿Qué resultado económico o empresarial quieres demostrar al llegar al Día 90?</Pregunta>

      <Etiqueta>Tipo de resultado</Etiqueta>
      <Pastillas opciones={RESULTADOS_NEGOCIO} valor={o.tipoResultado} onCambiar={tipo => cambiar({ tipoResultado: tipo })} />

      <Etiqueta>Moneda</Etiqueta>
      <Pastillas opciones={OPCIONES_MONEDA} valor={o.moneda} onCambiar={m => cambiar({ moneda: m })} />

      <Etiqueta>Situación actual</Etiqueta>
      <Row gap={8} align="flex-start">
        <Entrada valor={o.lineaBase} onCambiar={v => cambiar({ lineaBase: v })} placeholder={conMoneda(ejemplo.base, o.moneda, ejemplo.moneda)} numerico style={{ flex: 1 }} />
      </Row>
      <Apoyo>Puede ser 0. Facturación no es utilidad: elige el tipo que de verdad vas a medir.</Apoyo>

      <Etiqueta>Resultado Día 90</Etiqueta>
      <Entrada valor={o.resultadoDia90} onCambiar={v => cambiar({ resultadoDia90: v })} placeholder={conMoneda(ejemplo.meta, o.moneda, ejemplo.moneda)} numerico />
      {o.tipoResultado === 'deuda' ? <Apoyo>Para una deuda, el resultado puede ser menor que tu situación actual: eso es avanzar.</Apoyo> : null}

      <Etiqueta>Periodo de medición</Etiqueta>
      <Pastillas opciones={PERIODOS} valor={o.periodo} onCambiar={p => cambiar({ periodo: p })} />

      <Etiqueta>Evidencia</Etiqueta>
      <Entrada valor={o.evidencia} onCambiar={v => cambiar({ evidencia: v })} placeholder="Ej. reportes, capturas, contratos" maximo={120} />

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
      <View style={{ height: 8 }} />
    </PantallaPaso>
  );
}
