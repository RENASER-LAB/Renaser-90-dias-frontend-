/**
 * La selección de personas para asignarles la ficha en lote (spec 026-9). Se guarda como `id → nombre` para que lo marcado siga
 * marcado aunque la búsqueda o el filtro cambien la lista, y para decir a quién se le cambia la ficha.
 */
export type SeleccionDePersonas = Readonly<Record<string, string>>;

export interface PersonaDeLaLista {
  id: string;
  fullName: string | null;
}

export function nombreDe(p: PersonaDeLaLista): string {
  return p.fullName?.trim() || 'Persona sin nombre';
}

export function alternarPersona(sel: SeleccionDePersonas, p: PersonaDeLaLista): SeleccionDePersonas {
  if (p.id in sel) {
    const { [p.id]: _quitada, ...resto } = sel;
    return resto;
  }
  return { ...sel, [p.id]: nombreDe(p) };
}

export function idsDe(sel: SeleccionDePersonas): string[] {
  return Object.keys(sel);
}

export function cuantas(sel: SeleccionDePersonas): number {
  return idsDe(sel).length;
}

/** ¿Están marcadas todas las de la lista que se ve? (con la lista vacía, no). */
export function todasMarcadas(sel: SeleccionDePersonas, lista: readonly PersonaDeLaLista[]): boolean {
  return lista.length > 0 && lista.every(p => p.id in sel);
}

/** Marca todas las de la lista, o las desmarca si ya estaban todas. Lo marcado fuera de esta lista no se toca. */
export function alternarTodas(sel: SeleccionDePersonas, lista: readonly PersonaDeLaLista[]): SeleccionDePersonas {
  if (todasMarcadas(sel, lista)) {
    const restante = { ...sel };
    for (const p of lista) delete restante[p.id];
    return restante;
  }
  const nueva = { ...sel };
  for (const p of lista) nueva[p.id] = nombreDe(p);
  return nueva;
}

/** «3 marcadas», «1 marcada». */
export function textoDeLaSeleccion(n: number): string {
  if (n === 0) return 'Marca a las personas que quieres incluir';
  return n === 1 ? '1 persona marcada' : `${n} personas marcadas`;
}

/** La confirmación de asignar en lote. */
export function textoDeConfirmarElLote(n: number): { titulo: string; mensaje: string } {
  return {
    titulo: n === 1 ? '¿Asignar el diagnóstico a 1 persona?' : `¿Asignar el diagnóstico a ${n} personas?`,
    mensaje:
      'Les aparecerá «Completa tu diagnóstico» en Hoy y en Yo; quien todavía no entró lo hará en lugar de la ficha estándar. ' +
      'Las que no se puedan cambiar quedan omitidas y te decimos por qué.',
  };
}
