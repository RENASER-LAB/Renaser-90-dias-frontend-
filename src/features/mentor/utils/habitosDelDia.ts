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

export type ClaveDePilar = string;

export interface PilarDelDia {
  clave: ClaveDePilar;
  titulo: string;
  habitos: HabitoDelDia[];
  cumplidos: number;
  total: number;
  /** Abierto al elegir el día: el primer pilar con hábitos pendientes o vencidos (los demás, cerrados). */
  abiertoAlEmpezar: boolean;
}

const PRINCIPALES = ['CUERPO', 'MENTE', 'ESPIRITU', 'EMOCIONES'] as const;
const TITULOS: Record<string, string> = { CUERPO: 'Cuerpo', MENTE: 'Mente', ESPIRITU: 'Espíritu', EMOCIONES: 'Emociones', OTROS: 'Otros hábitos' };

/** `CONSCIENCIA` es la clave real de «Emociones» en el catálogo; `EMOCIONES` se acepta por si acaso. Lo demás queda como vino. */
export function clavePilar(valor: string | null | undefined): ClaveDePilar {
  const clave = valor?.trim().toUpperCase();
  if (!clave) return 'OTROS';
  return clave === 'CONSCIENCIA' ? 'EMOCIONES' : clave;
}

/** El nombre legible de una clave que no es de los cuatro pilares: `DIPLOMADO_ESTUDIO` → «Diplomado estudio». */
function tituloDelPilar(clave: ClaveDePilar): string {
  if (TITULOS[clave]) return TITULOS[clave];
  const texto = clave.toLowerCase().replace(/_/g, ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Agrupa los hábitos del día por pilar, en el orden Cuerpo, Mente, Espíritu, Emociones; `CONSCIENCIA` es «Emociones»; las claves de otras formaciones van después con su nombre legible y los que no traen pilar al final en «Otros hábitos», para que ninguno desaparezca. Un pilar sin hábitos ese día
 * no se dibuja. Si ninguno tiene pendientes ni vencidos, se abre el primero para que la ficha no abra toda cerrada.
 */
export function agruparPorPilar(obligaciones: readonly ObligacionDeLaPersona[], zona: string | null): PilarDelDia[] {
  const porClave = new Map<ClaveDePilar, HabitoDelDia[]>();
  for (const o of obligaciones) {
    const clave = clavePilar(o.pilar);
    porClave.set(clave, [...(porClave.get(clave) ?? []), habitoDelDia(o, zona)]);
  }
  const otras = Array.from(porClave.keys()).filter(c => !(PRINCIPALES as readonly string[]).includes(c) && c !== 'OTROS');
  const orden = [...PRINCIPALES.filter(c => porClave.has(c)), ...otras, ...(porClave.has('OTROS') ? ['OTROS'] : [])];
  const pilares = orden.map(clave => {
    const habitos = porClave.get(clave) as HabitoDelDia[];
    return {
      clave,
      titulo: tituloDelPilar(clave),
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
