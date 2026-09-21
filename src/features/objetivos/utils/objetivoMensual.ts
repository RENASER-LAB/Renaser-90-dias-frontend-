import { formatearNumero } from './cifraDelObjetivo';

/**
 * El objetivo del MES, calculado solo, a partir del objetivo de 90 días y del valor real de hoy.
 *
 * ── Qué problema resuelve ──
 *
 * El Mapa de Renacimiento pregunta de dónde partes y a dónde quieres llegar al Día 90, y de ahí
 * baja directo al plan de la semana. El escalón del medio —"¿qué tiene que estar logrado al cierre
 * de este mes?"— se lo tenía que inventar la persona. El backend ya tiene dónde guardarlo
 * (`rocas_mensuales`, V36: mes 1 cierra al día 30, mes 2 al 60, mes 3 al 90); lo que faltaba era
 * el número.
 *
 * ── La fórmula, y por qué NO son tercios fijos ──
 *
 *     objetivo del mes = valor de hoy + (meta − valor de hoy) / meses que quedan
 *
 * Decisión del dueño: **se recalcula cada mes contra el valor REAL**. Partir 82 → 75 kg en tercios
 * daría 79,67 / 77,33 / 75 fijos el primer día, y esas tres cifras envejecen mal: si el mes 1
 * bajaste 1 kg en vez de 2,33, el mes 2 seguiría pidiéndote 77,33 como si nada hubiera pasado.
 * Repartiendo lo que FALTA entre los meses que QUEDAN, el mes 2 pide 78 (3 kg) y dice la verdad:
 * lo que no hiciste no desaparece, se redistribuye. El primer mes, cuando el valor real todavía es
 * la línea base, la cuenta da exactamente el tercio — el caso bonito sigue saliendo bonito.
 *
 * ── El tope de cordura (lo importante) ──
 *
 * Esa misma honestidad tiene un borde feo: si arrastras dos meses, el mes 3 te pide TODO junto, y
 * "baja 20 kg este mes" es un número que no ayuda a nadie. Pedido textual del dueño: en ese caso no
 * se muestra la cifra. Ver {@link fueraDeAlcance} para los dos umbrales y su justificación.
 *
 * ── Qué NO hace ──
 *
 * No proyecta lo que no se proyecta. Una escala subjetiva del 1 al 10 y una condición clínica no se
 * reparten en cuotas mensuales; para esas, la respuesta honesta es que no hay cifra y por qué. Es
 * el mismo criterio que ya sigue `cifraDelObjetivo` con Relaciones: antes que inventar un número,
 * ninguno.
 *
 * Todo acá es aritmética pura, sin fechas, sin red y sin estado: se prueba entero sin reloj.
 */

/** Los tres meses del programa. Mes 1 cierra al día 30, mes 2 al 60, mes 3 al 90. */
export const MESES_DEL_PLAN = 3;

/** Días que dura cada mes del plan. Ver {@link mesDelObjetivo} para por qué 30 y no 28. */
export const DIAS_POR_MES = 30;

/**
 * Cómo se comporta lo que se está midiendo. Es lo único que el motor necesita saber del objetivo:
 * ni la unidad, ni el área, ni el tipo de resultado le cambian una cuenta.
 *
 * - `nivel`: el valor que se mide en un momento dado y que hay que mover (peso, deuda, minutos de
 *   resistencia, facturación mensual). La cifra del mes es **dónde tiene que estar** al cierre.
 * - `acumulado`: lo que se suma a lo largo del programa (ventas acumuladas al Día 90). La cifra del
 *   mes es **cuánto hay que sumar** en el mes; el nivel también se calcula, por si la pantalla
 *   prefiere mostrar el total corrido.
 * - `escala`: un puntaje subjetivo del 1 al 10. No se reparte en cuotas — ver `escala_subjetiva`.
 * - `clinico`: un marcador de salud bajo tratamiento. El ritmo lo pone un profesional, no una app.
 *
 * Los dos últimos no son "magnitudes" en el sentido aritmético: son las dos formas de decir
 * "acá no va un número". Viven en el mismo tipo para que el motor sea total — quien lo llama pasa
 * lo que tiene y siempre recibe una respuesta explicada, nunca un `null` sin motivo.
 */
export type Magnitud = 'nivel' | 'acumulado' | 'escala' | 'clinico';

/** Hacia dónde viaja el objetivo. Sale de comparar la meta con la línea base, no se declara. */
export type Direccion = 'sube' | 'baja';

export interface EntradaDelMes {
  /** De dónde partió, el día que definió el objetivo. */
  lineaBase: number | null;
  /** El valor REAL de hoy. `null` = todavía sin medición: se usa la línea base. */
  valorActual: number | null;
  /** La meta del Día 90. */
  meta: number | null;
  /** Mes del plan en curso (1 a 3). Fuera de rango se acota; ver {@link mesDelObjetivo}. */
  mes: number;
  /** `null` = todavía no se sabe qué se está midiendo. Ver el motivo `sin_tipo`. */
  magnitud: Magnitud | null;
  /**
   * Tope duro de movimiento por mes, en la unidad del objetivo, para los casos en que el mundo
   * impone uno (el peso corporal). `null` o ausente = no hay límite físico conocido y manda el
   * tope relativo. Ver {@link fueraDeAlcance}.
   */
  topePorMes?: number | null;
}

/** Por qué este mes no lleva cifra. Cada motivo tiene su propia explicación en {@link notaDelMes}. */
export type MotivoSinCifra =
  /** Falta la línea base o la meta: no hay con qué calcular. */
  | 'sin_datos'
  /** Todavía no se eligió qué se mide (ni cada cuánto, en negocio): no hay qué proyectar. */
  | 'sin_tipo'
  /** Línea base y meta son el mismo número: no hay distancia que repartir. */
  | 'sin_recorrido'
  /** Puntaje del 1 al 10: una percepción no se entrega en cuotas mensuales. */
  | 'escala_subjetiva'
  /** Condición clínica: el ritmo lo define quien te atiende. */
  | 'acompanamiento_clinico'
  /** El ritmo necesario supera todo el plan original. Tope relativo. */
  | 'fuera_de_alcance'
  /** El ritmo necesario supera lo que se puede cambiar con salud. Tope absoluto. */
  | 'ritmo_no_saludable';

export type ObjetivoMensual =
  | {
      estado: 'con_cifra';
      mes: number;
      /** Meses que quedan contando el actual: 3, 2 o 1. */
      mesesQueQuedan: number;
      lectura: 'nivel' | 'acumulado';
      direccion: Direccion;
      /** Dónde hay que estar al cierre del mes. */
      valor: number;
      /** Cuánto hay que moverse este mes. Siempre positivo; la dirección va aparte. */
      paso: number;
      /** Lo que falta para la meta del Día 90, desde el valor real de hoy. Siempre positivo. */
      falta: number;
    }
  | {
      estado: 'ya_alcanzado';
      mes: number;
      mesesQueQuedan: number;
      direccion: Direccion;
      /** La meta. Llegada la meta, el objetivo del mes es sostenerla. */
      valor: number;
    }
  | { estado: 'sin_cifra'; mes: number; mesesQueQuedan: number; motivo: MotivoSinCifra };

/**
 * En qué mes del plan (1 a 3) cae un día de programa.
 *
 * **Ojo: no es `mesDe` de `periodoDelPrograma.ts`.** Aquél cuenta bloques de CUATRO SEMANAS, que
 * es como se agrupan los planes semanales (28 días, mes 3 = semanas 9 a 12). Éste cuenta bloques de
 * TREINTA DÍAS, que es como cierran los objetivos: día 30, 60 y 90. Son dos cortes distintos del
 * mismo programa y los dos están bien en su terreno; lo que estaría mal es usar el del plan semanal
 * para decidir a qué mes pertenece un objetivo, porque entonces los días 85 a 90 caerían en un mes
 * que ya cerró. Los hitos del Mapa (V08: 30/60/90) y `rocas_mensuales` del backend (`numero_mes`
 * con `diaDeCierre` 30/60/90) usan éste.
 *
 * El día 0 —quien todavía no arrancó— cuenta como mes 1: ya está mirando su primer tramo.
 */
export function mesDelObjetivo(diaPrograma: number): number {
  if (!Number.isFinite(diaPrograma)) return 1;
  const dia = Math.max(Math.trunc(diaPrograma), 1);
  return Math.min(Math.floor((dia - 1) / DIAS_POR_MES) + 1, MESES_DEL_PLAN);
}

/** Día de programa en que cierra ese mes: 30, 60 o 90. */
export function diaDeCierre(mes: number): number {
  return acotarMes(mes) * DIAS_POR_MES;
}

/**
 * Cuántas veces el ritmo que la persona misma se puso puede exigirse antes de que la cifra sea
 * mentira. **Tres**, y el número no es un gusto: `ritmo necesario > 3 × ritmo planeado` es, hecha
 * la cuenta, exactamente `mover en UN mes más que todo lo que se propuso mover en 90 días`.
 *
 * Por qué ese corte y no uno en kilos o en soles: el motor no sabe si 2 000 soles al mes son mucho
 * o poco —para alguien es su facturación entera y para otro es el redondeo— y tampoco sabe qué es
 * mucho en centímetros, en clientes o en minutos. La única vara calibrada que hay es el plan que la
 * propia persona firmó el día 7. Por debajo de este corte, la cifra que se muestra es un ritmo al
 * que alguna vez dijo que sí, comprimido; por encima, es un número que nadie se propuso nunca.
 *
 * De referencia, lo que da la cuenta en los casos que importan: no arrancar en todo el mes 1 deja
 * el mes 2 en 1,5× (se muestra, y con razón); no arrancar en dos meses deja el mes 3 en 3,0×
 * (el borde); retroceder hasta pasar la línea base con un mes por delante pasa de 3× y no se
 * muestra. El "bajar 20 kg el último mes" del que se quejó el dueño da 8,6×.
 *
 * **Limitación conocida, a propósito.** En planes muy chicos el corte es conservador: si te
 * propusiste dormir media hora más en 90 días y vas para atrás, media hora y monedas en el último
 * mes ya pasa el 3× y se deja de mostrar la cifra aunque fuera alcanzable. Se prefiere así: el
 * dueño marcó la asimetría —mostrar un número imposible es peor que no mostrarlo— y el tipo donde
 * las metas chicas son más frecuentes y más medibles, el peso, se rige por el tope absoluto y no
 * por éste.
 */
export const VECES_EL_RITMO_PLANEADO = 3;

/**
 * ¿El ritmo que haría falta este mes es irreal? Dos umbrales, y solo uno manda en cada objetivo.
 *
 * 1. **Tope absoluto**, cuando el mundo impone uno. Para el peso corporal se pasa como el 4 % del
 *    peso de hoy por mes —cerca de 1 % por semana, el extremo alto de lo que se considera seguro—
 *    y va en porcentaje y no en kilos fijos a propósito: así escala con la persona (quien pesa 120
 *    puede mover más kilos que quien pesa 55) y además sobrevive a la unidad, que en el Mapa la
 *    escribe el aprendiz y bien puede ser libras.
 * 2. **Tope relativo**, para todo lo demás: {@link VECES_EL_RITMO_PLANEADO} veces el ritmo del plan
 *    original.
 *
 * **Uno u otro, nunca los dos.** Donde el mundo da un límite, el plan de la persona no es la vara:
 * bajar 2,5 kg en el último mes es perfectamente sano aunque sea más de lo que se había propuesto
 * para los 90 días, y ahí el tope relativo sería un falso positivo que le apaga la cifra a alguien
 * que todavía puede llegar.
 *
 * **Lo que este tope NO detecta**, y conviene saberlo: una meta absurda desde el día 1. Quien puso
 * "de 5 000 a 500 000 de facturación" tiene un ritmo planeado igual de absurdo, así que el mes 1
 * dará 1,0× y la cifra se mostrará. Discutir la meta al definirla es trabajo del Mapa (§4.3); acá
 * el trabajo es no mentir sobre el ritmo. En peso, el tope absoluto sí lo agarra.
 */
function fueraDeAlcance(
  ritmoNecesario: number,
  ritmoPlaneado: number,
  topePorMes: number | null
): MotivoSinCifra | null {
  if (topePorMes !== null && topePorMes > 0) {
    return ritmoNecesario > topePorMes ? 'ritmo_no_saludable' : null;
  }
  return ritmoNecesario > VECES_EL_RITMO_PLANEADO * ritmoPlaneado ? 'fuera_de_alcance' : null;
}

/**
 * El objetivo de este mes. Ver la cabecera del archivo para la fórmula y los umbrales.
 *
 * Cuando no hay cifra, el resultado trae el motivo y **nada más**: el número descartado no viaja en
 * la respuesta. Es deliberado — lo que no está no se puede pintar por descuido, y el pedido del
 * dueño fue exactamente ese, que esa cifra no se muestre.
 */
export function objetivoDelMes(entrada: EntradaDelMes): ObjetivoMensual {
  const mes = acotarMes(entrada.mes);
  const mesesQueQuedan = MESES_DEL_PLAN - mes + 1;
  const sinCifra = (motivo: MotivoSinCifra): ObjetivoMensual => ({ estado: 'sin_cifra', mes, mesesQueQuedan, motivo });

  if (entrada.magnitud === null) return sinCifra('sin_tipo');
  if (entrada.magnitud === 'escala') return sinCifra('escala_subjetiva');
  if (entrada.magnitud === 'clinico') return sinCifra('acompanamiento_clinico');

  const base = finito(entrada.lineaBase);
  const meta = finito(entrada.meta);
  if (base === null || meta === null) return sinCifra('sin_datos');
  if (base === meta) return sinCifra('sin_recorrido');

  // Sin medición todavía, el valor real es el punto de partida: así el mes 1 da el tercio exacto.
  const actual = finito(entrada.valorActual) ?? base;
  const direccion: Direccion = meta > base ? 'sube' : 'baja';

  // Ya llegaste (o te pasaste, en el sentido del viaje): pedirte otro tramo sería absurdo.
  if (direccion === 'sube' ? actual >= meta : actual <= meta) {
    return { estado: 'ya_alcanzado', mes, mesesQueQuedan, direccion, valor: meta };
  }

  const falta = Math.abs(meta - actual);
  const ritmoNecesario = falta / mesesQueQuedan;
  const ritmoPlaneado = Math.abs(meta - base) / MESES_DEL_PLAN;

  const motivo = fueraDeAlcance(ritmoNecesario, ritmoPlaneado, finito(entrada.topePorMes ?? null));
  if (motivo) return sinCifra(motivo);

  return {
    estado: 'con_cifra',
    mes,
    mesesQueQuedan,
    lectura: entrada.magnitud === 'acumulado' ? 'acumulado' : 'nivel',
    direccion,
    valor: direccion === 'sube' ? actual + ritmoNecesario : actual - ritmoNecesario,
    paso: ritmoNecesario,
    falta,
  };
}

/* ------------------------------------------------------------------------------------------------
 * Cómo se escribe en pantalla
 * ---------------------------------------------------------------------------------------------- */

export interface FormatoCifra {
  /** `kg`, `cm`, `S/`, `USD`… Tal como la escribió el aprendiz en el Mapa. */
  unidad: string;
  /** La moneda va delante ("S/ 15 000") y la unidad física detrás ("75 kg"), como en los hitos. */
  unidadAdelante?: boolean;
  /** `semanales` / `mensuales` para las metas de negocio con periodo. Se pega al final. */
  periodo?: string;
}

/**
 * La cifra grande del mes, ya formateada: `"79.7 kg"`, `"S/ 10 000 mensuales"`. `null` cuando este
 * mes no lleva número — quien llama muestra {@link notaDelMes} en su lugar.
 *
 * En una meta acumulada la cifra es **el paso** y no el nivel: "S/ 4 500 este mes" es lo que se
 * pide, mientras que el total corrido ("llevas 13 500 de 30 000") es contexto y no el objetivo.
 */
export function cifraDelMes(objetivo: ObjetivoMensual, formato: FormatoCifra): string | null {
  if (objetivo.estado === 'sin_cifra') return null;
  if (objetivo.estado === 'ya_alcanzado') return conUnidad(objetivo.valor, formato);
  return conUnidad(objetivo.lectura === 'acumulado' ? objetivo.paso : objetivo.valor, formato);
}

/**
 * La línea que acompaña a la cifra —o que la reemplaza cuando no hay—, en español de Perú y de tú.
 *
 * Siempre devuelve algo: "no hay cifra" sin explicación es peor que no mostrar nada, porque la
 * persona se queda buscando el error en un formulario que llenó bien.
 */
export function notaDelMes(objetivo: ObjetivoMensual, formato: FormatoCifra): string {
  const quedan =
    objetivo.mesesQueQuedan === 1 ? 'te queda 1 mes' : `te quedan ${objetivo.mesesQueQuedan} meses`;

  if (objetivo.estado === 'con_cifra') {
    return `Te faltan ${conUnidad(objetivo.falta, formato)} y ${quedan}: ${conUnidad(objetivo.paso, formato)} este mes.`;
  }
  if (objetivo.estado === 'ya_alcanzado') {
    return `Ya llegaste a tu meta del Día 90. Este mes se trata de sostener ${conUnidad(objetivo.valor, formato)}.`;
  }
  switch (objetivo.motivo) {
    case 'sin_datos':
      return 'Falta tu punto de partida o tu meta del Día 90 para calcular el mes.';
    case 'sin_tipo':
      return 'Elige primero qué vas a medir —y cada cuánto se mide— para poder repartirlo por mes.';
    case 'sin_recorrido':
      return 'Tu punto de partida y tu meta son el mismo número: no hay recorrido que repartir.';
    case 'escala_subjetiva':
      return 'Esto se mide del 1 al 10, y una escala no se entrega en cuotas: tu objetivo de este mes son tus acciones, no un número.';
    case 'acompanamiento_clinico':
      return 'Una condición clínica no se reparte en cuotas mensuales: el ritmo lo defines con quien te atiende.';
    case 'ritmo_no_saludable':
      return 'Lo que haría falta este mes es más rápido de lo que se puede cambiar con salud. Replantea la meta o date más plazo.';
    case 'fuera_de_alcance':
      return 'Al ritmo de hoy no llegas a tu meta del Día 90: este mes tendrías que mover más de lo que te propusiste para todo el programa. Conviene replantearla.';
  }
}

/** "Mes 2 · cierra el Día 60". El rótulo de la tarjeta, para que se sepa contra qué se compara. */
export function etiquetaDelMesDelObjetivo(mes: number): string {
  const acotado = acotarMes(mes);
  return `Mes ${acotado} · cierra el Día ${diaDeCierre(acotado)}`;
}

/* ------------------------------------------------------------------------------------------------
 * Aritmética menuda
 * ---------------------------------------------------------------------------------------------- */

function acotarMes(mes: number): number {
  if (!Number.isFinite(mes)) return 1;
  return Math.min(Math.max(Math.trunc(mes), 1), MESES_DEL_PLAN);
}

function finito(valor: number | null | undefined): number | null {
  return valor === null || valor === undefined || !Number.isFinite(valor) ? null : valor;
}

/**
 * Decimales según el tamaño del número: 79,6666… es "79.7" y 10 000,67 es "10 001".
 *
 * Mismo criterio que `redondear` en `mapa-renacimiento/reglas.ts`, que redondea los hitos: dos
 * cifras del mismo objetivo mostradas con distinta precisión se leen como dos datos distintos. Se
 * repite en vez de importarse para no invertir la dependencia entre features — el Mapa importa de
 * Objetivos, no al revés.
 */
export function redondearCifra(valor: number): number {
  const abs = Math.abs(valor);
  const decimales = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return Number(valor.toFixed(decimales));
}

function conUnidad(valor: number, formato: FormatoCifra): string {
  const numero = formatearNumero(redondearCifra(valor));
  const unidad = formato.unidad.trim();
  const periodo = formato.periodo?.trim();
  const base = !unidad ? numero : formato.unidadAdelante ? `${unidad} ${numero}` : `${numero} ${unidad}`;
  return periodo ? `${base} ${periodo}` : base;
}
