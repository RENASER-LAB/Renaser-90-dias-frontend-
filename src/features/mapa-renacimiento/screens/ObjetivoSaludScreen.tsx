import React, { useState } from 'react';
import { View } from 'react-native';

import { Row } from '../../../components/ui';
import { PantallaPaso } from '../components/PantallaPaso';
import { Apoyo, Avisos, Entrada, Etiqueta, Nota, Pastillas, Pregunta, TarjetaMeta } from '../components/Piezas';
import { LIMITES, RESULTADOS_SALUD, calidadSalud, objetivoValido, redactar } from '../reglas';
import { ejemploDeSalud } from '../ejemplos';
import type { ObjetivoSalud, TipoResultadoSalud } from '../tipos';
import type { PropsPaso } from './props';

/** V03 · Objetivo 1 · Cuerpo y salud (§3 V03). La redacción se regenera con cada dato salvo que la persona la haya editado. */
export function ObjetivoSaludScreen({ estado, numeroDePaso }: PropsPaso) {
  const { mapa, actualizar, siguiente, anterior } = estado;
  const o = mapa.salud;
  const [editando, setEditando] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const avisos = calidadSalud(o);
  const valido = objetivoValido(o);

  const cambiar = (parche: Partial<ObjetivoSalud>) => actualizar(previo => {
    const salud = { ...previo.salud, ...parche };
    return { ...previo, salud: { ...salud, metaRedactada: salud.metaEditadaAMano ? salud.metaRedactada : redactar(salud) } };
  });

  const elegirTipo = (tipo: TipoResultadoSalud) => {
    const sugerida = RESULTADOS_SALUD.find(r => r.clave === tipo)?.unidadSugerida ?? o.unidad;
    cambiar({ tipoResultado: tipo, unidad: sugerida || o.unidad });
  };

  /* El ejemplo sigue al tipo: peso y medidas bajan; fuerza, sueno y energia suben. */
  const ejemplo = ejemploDeSalud(o.tipoResultado);

  return (
    <PantallaPaso
      paso={numeroDePaso ?? 3}
      onAtras={anterior}
      boton={{
        label: 'Revisar mi meta',
        onPress: () => { setIntentado(true); if (valido) siguiente(); },
        disabled: intentado && !valido,
        // Los avisos bloqueantes ya dicen qué falta; se reusan en vez de escribirlos dos veces.
        faltan: avisos.filter(a => a.bloquea).map(a => a.mensaje),
      }}
    >
      <Pregunta>¿Qué cambio concreto quieres demostrar en tu cuerpo o salud al llegar al Día 90?</Pregunta>

      <Etiqueta>Tipo de resultado</Etiqueta>
      <Pastillas opciones={RESULTADOS_SALUD} valor={o.tipoResultado} onCambiar={elegirTipo} />

      <Etiqueta>Situación actual</Etiqueta>
      <Row gap={8} align="flex-start">
        <Entrada valor={o.lineaBase} onCambiar={v => cambiar({ lineaBase: v })} placeholder={ejemplo.base} numerico style={{ flex: 1 }} />
        <Entrada valor={o.unidad} onCambiar={v => cambiar({ unidad: v })} placeholder="kg" maximo={12} style={{ width: 92 }} />
      </Row>

      <Etiqueta>Resultado Día 90</Etiqueta>
      <Entrada valor={o.resultadoDia90} onCambiar={v => cambiar({ resultadoDia90: v })} placeholder={ejemplo.meta} numerico />
      <Apoyo>Usa la misma unidad que tu situación actual. Debe ser distinto al punto de partida.</Apoyo>

      <Etiqueta>Evidencia</Etiqueta>
      <Entrada valor={o.evidencia} onCambiar={v => cambiar({ evidencia: v })} placeholder="Ej. foto, medida, examen, app" maximo={120} />

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

      {intentado ? <Avisos avisos={avisos} /> : <Avisos avisos={avisos} soloBloqueantes={false} />}

      {o.tipoResultado === 'condicion_clinica' ? (
        <Nota>Este plan no sustituye la atención profesional. Define una conducta segura y acompáñala con tu médico.</Nota>
      ) : null}
      <View style={{ height: 8 }} />
    </PantallaPaso>
  );
}
