import type { DestinoDeCaja, DestinoDeMiCaja, ElementoDeContenido } from '../api/cajaSchemas';

/**
 * El contenido editable de la caja y los datos de envío, sin React.
 */

/** Un elemento en el editor: `valor` es `null` hasta que se guarda uno nuevo. */
export interface ElementoEnEdicion {
  clave: string;
  valor: string | null;
  etiqueta: string;
}

/**
 * El valor de un elemento nuevo: su etiqueta en mayúsculas, sin tildes y con `_` («Taza de café» →
 * `TAZA_DE_CAFE`), distinto de los que ya existen. Los que ya existen conservan el suyo aunque se
 * cambie la etiqueta: es el que tienen guardado los checklists de cada caja.
 */
export function valorParaUnaEtiqueta(etiqueta: string, usados: ReadonlySet<string>): string {
  const base =
    etiqueta
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'ELEMENTO';
  if (!usados.has(base)) return base;
  let n = 2;
  while (usados.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

export type ResultadoDelEditor =
  | { ok: true; elementos: Array<{ valor: string; etiqueta: string }> }
  | { ok: false; mensaje: string };

/** Lo que se manda al guardar la lista: sin vacíos ni repetidos, con valor para los nuevos. */
export function elementosParaGuardar(enEdicion: ElementoEnEdicion[]): ResultadoDelEditor {
  const conTexto = enEdicion.map(e => ({ ...e, etiqueta: e.etiqueta.trim() })).filter(e => e.etiqueta);
  if (conTexto.length === 0) return { ok: false, mensaje: 'La caja necesita al menos un elemento.' };
  const etiquetas = new Set<string>();
  for (const e of conTexto) {
    const clave = e.etiqueta.toLowerCase();
    if (etiquetas.has(clave)) return { ok: false, mensaje: `«${e.etiqueta}» está dos veces.` };
    etiquetas.add(clave);
  }
  const usados = new Set(conTexto.map(e => e.valor).filter((v): v is string => !!v));
  const elementos = conTexto.map(e => {
    if (e.valor) return { valor: e.valor, etiqueta: e.etiqueta };
    const valor = valorParaUnaEtiqueta(e.etiqueta, usados);
    usados.add(valor);
    return { valor, etiqueta: e.etiqueta };
  });
  return { ok: true, elementos };
}

/** Los marcados después de tocar uno. */
export function alternarMarcado(contenido: ElementoDeContenido[], valor: string): string[] {
  return contenido
    .filter(e => (e.valor === valor ? !e.marcado : !!e.marcado))
    .map(e => e.valor);
}

export function contenidoCompleto(contenido: ElementoDeContenido[] | null | undefined): boolean {
  return !!contenido && contenido.length > 0 && contenido.every(e => e.marcado);
}

// ─── Datos de envío ─────────────────────────────────────────────────────────

export interface LineaDelDestino {
  rotulo: string;
  valor: string;
  /** Lo que el aprendiz pidió cambiar: se destaca para no enviarla a la dirección vieja. */
  destacada?: boolean;
  /** `tel` si se puede llamar tocándola. */
  tipo?: 'tel';
}

const limpio = (v: string | null | undefined) => v?.trim() || null;

/**
 * Las líneas del bloque «Enviar a», en el orden en que se escribe una etiqueta de envío. Si el
 * aprendiz pidió otra dirección u otro número, van primero y destacados.
 */
export function lineasDelDestino(destino: DestinoDeCaja | null | undefined): LineaDelDestino[] {
  if (!destino) return [];
  const lugar = [limpio(destino.distrito), limpio(destino.provincia), limpio(destino.ciudad), limpio(destino.pais)]
    .filter(Boolean)
    .join(', ');
  const lineas: Array<LineaDelDestino | null> = [
    limpio(destino.otraDireccion) ? { rotulo: 'Otra dirección', valor: limpio(destino.otraDireccion)!, destacada: true } : null,
    limpio(destino.otroCelular) ? { rotulo: 'Otro celular', valor: limpio(destino.otroCelular)!, destacada: true, tipo: 'tel' } : null,
    limpio(destino.quienRecibe) ? { rotulo: 'Recibe', valor: limpio(destino.quienRecibe)!, destacada: true } : null,
    limpio(destino.nombre) ? { rotulo: 'Nombre', valor: limpio(destino.nombre)! } : null,
    limpio(destino.dni) ? { rotulo: 'DNI', valor: limpio(destino.dni)! } : null,
    limpio(destino.celular) ? { rotulo: 'Celular', valor: limpio(destino.celular)!, tipo: 'tel' } : null,
    limpio(destino.direccion) ? { rotulo: 'Dirección', valor: limpio(destino.direccion)! } : null,
    lugar ? { rotulo: 'Lugar', valor: lugar } : null,
    limpio(destino.referencias) ? { rotulo: 'Referencias', valor: limpio(destino.referencias)! } : null,
  ];
  return lineas.filter((l): l is LineaDelDestino => l !== null);
}

/** Los cinco datos que el aprendiz puede cambiar antes del envío (spec §4, sección `destino`). */
export type CampoDelDestino = 'otraDireccion' | 'otroCelular' | 'quienRecibe' | 'referencias' | 'provincia';
export type FormularioDelDestino = Record<CampoDelDestino, string>;

/** El formulario lleno con lo que ya pidió (o vacío). */
export function formularioDelDestino(destino: DestinoDeMiCaja | null | undefined): FormularioDelDestino {
  return {
    otraDireccion: destino?.otraDireccion ?? '',
    otroCelular: destino?.otroCelular ?? '',
    quienRecibe: destino?.quienRecibe ?? '',
    referencias: destino?.referencias ?? '',
    provincia: destino?.provincia ?? '',
  };
}

/** Lo que el aprendiz manda al cambiar el destino: cada campo recortado, vacío = `null`. */
export function destinoParaGuardar(formulario: FormularioDelDestino): DestinoDeMiCaja {
  return {
    otraDireccion: limpio(formulario.otraDireccion),
    otroCelular: limpio(formulario.otroCelular),
    quienRecibe: limpio(formulario.quienRecibe),
    referencias: limpio(formulario.referencias),
    provincia: limpio(formulario.provincia),
  };
}

export const CAMPOS_DEL_DESTINO: Array<{ clave: CampoDelDestino; rotulo: string; teclado?: 'phone-pad' }> = [
  { clave: 'otraDireccion', rotulo: 'Dirección' },
  { clave: 'provincia', rotulo: 'Provincia' },
  { clave: 'referencias', rotulo: 'Referencias' },
  { clave: 'quienRecibe', rotulo: 'Quién recibe' },
  { clave: 'otroCelular', rotulo: 'Celular', teclado: 'phone-pad' },
];
