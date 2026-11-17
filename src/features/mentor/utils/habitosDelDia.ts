import type { ObligacionDeLaPersona, PilarDelHabito } from '../../lider-mentores/types/cumplimientoDelLider.types';
import { horaEnZona } from '../../eventos/utils/zonaHoraria';

/**
 * Los hábitos de un día en la ficha del mentor (spec 055 FR-013 y FR-014): su estado y su hora, y el agrupado por pilar.
 * Puras, para probarlas sin montar la pantalla.
 */
export type EstadoDelHabito = 'cumplido' | 'vencido' | 'pendiente';

/** `COMPLETADO` → cumplido; `FALLIDO` y `EXPIRADO` → vencido; `PENDIENTE`, `EN_CURSO` y lo desconocido → pendiente (nunca cumplido). */
export function estadoDelHabito(estado: string | null | undefined): EstadoDelHabito {
  switch (estado?.trim().toUpperCase()) {
    case 'COMPLETADO':
      return 'cumplido';
    case 'FALLIDO':
    case 'EXPIRADO':
      return 'vencido';
    default:
      return 'pendiente';
  }
}

export interface HabitoDelDia {
  obligacion: ObligacionDeLaPersona;
  estado: EstadoDelHabito;
  /** `HH:mm` de la entrega en la zona del aprendiz; solo en un cumplido que tuvo entrega. Sin hora, no se inventa. */
  hora: string | null;
  /** Si tiene con qué mostrar una evidencia (un archivo, un texto, o una publicación del Muro): el ojo solo sale con esto. */
  conEvidencia: boolean;
}

export function habitoDelDia(o: ObligacionDeLaPersona, zona: string | null): HabitoDelDia {
  const estado = estadoDelHabito(o.estado);
  return {
    obligacion: o,
    estado,
    hora: estado === 'cumplido' && o.entregadaEn ? horaEnZona(o.entregadaEn, zona) : null,
    conEvidencia: estado === 'cumplido' && (o.evidencias.length > 0 || Boolean(o.publicacionId) || Boolean(o.respuestaTexto?.trim())),
  };
}

export type ClaveDePilar = PilarDelHabito | 'OTROS';

export interface PilarDelDia {
  clave: ClaveDePilar;
  titulo: string;
  habitos: HabitoDelDia[];
  cumplidos: number;
  total: number;
  /** Abierto al elegir el día: el primer pilar con hábitos pendientes o vencidos (los demás, cerrados). */
  abiertoAlEmpezar: boolean;
}

const ORDEN: readonly ClaveDePilar[] = ['CUERPO', 'MENTE', 'ESPIRITU', 'EMOCIONES', 'OTROS'];
const TITULOS: Record<ClaveDePilar, string> = {
  CUERPO: 'Cuerpo',
  MENTE: 'Mente',
  ESPIRITU: 'Espíritu',
  EMOCIONES: 'Emociones',
  OTROS: 'Otros hábitos',
};

/**
 * Agrupa los hábitos del día por pilar, en el orden Cuerpo, Mente, Espíritu, Emociones; los que no traen pilar (un servidor
 * anterior, o un hábito sin categoría) van al final en «Otros hábitos», para que ninguno desaparezca. Un pilar sin hábitos ese día
 * no se dibuja. Si ninguno tiene pendientes ni vencidos, se abre el primero para que la ficha no abra toda cerrada.
 */
export function agruparPorPilar(obligaciones: readonly ObligacionDeLaPersona[], zona: string | null): PilarDelDia[] {
  const porClave = new Map<ClaveDePilar, HabitoDelDia[]>();
  for (const o of obligaciones) {
    const clave: ClaveDePilar = o.pilar ?? 'OTROS';
    porClave.set(clave, [...(porClave.get(clave) ?? []), habitoDelDia(o, zona)]);
  }
  const pilares = ORDEN.filter(c => porClave.has(c)).map(clave => {
    const habitos = porClave.get(clave) as HabitoDelDia[];
    return {
      clave,
      titulo: TITULOS[clave],
      habitos,
      cumplidos: habitos.filter(h => h.estado === 'cumplido').length,
      total: habitos.length,
      abiertoAlEmpezar: false,
    };
  });
  const primeroConPendientes = pilares.findIndex(p => p.cumplidos < p.total);
  const abierto = primeroConPendientes >= 0 ? primeroConPendientes : 0;
  return pilares.map((p, i) => ({ ...p, abiertoAlEmpezar: i === abierto }));
}
