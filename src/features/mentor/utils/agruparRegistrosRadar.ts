import type { RegistroRadarApi } from '../../radar/types/radar.types';

/**
 * Los registros del Código Renaser de un aprendiz, agrupados por día y ordenados por hora.
 *
 * Decisión pura: entra la lista tal como la devuelve el servidor y sale la forma que dibuja la
 * sección. No importa nada de React ni de la red, así que la regla —qué día es cada registro y
 * en qué orden se leen— se puede probar sin montar pantalla.
 *
 * ## En qué zona horaria se decide el "día"
 *
 * `createdAt` es un `Instant` (UTC): **no tiene día propio**. El día aparece recién cuando se
 * elige un reloj con el que mirarlo, y acá se usa el del DISPOSITIVO, que es el mismo criterio
 * que ya aplica `radar/utils/slotsDelRadar.ts` para los slots del aprendiz.
 *
 * Es una decisión con una consecuencia real y conocida: un mentor que viaja a otro huso puede
 * ver un registro de las 23:00 caer en el día siguiente. Se acepta a sabiendas porque la
 * alternativa —convertir a la zona del aprendiz— exige `Intl.DateTimeFormat` con `timeZone`,
 * que hoy no se usa en ninguna parte de esta app, y porque todo el padrón vive en
 * `America/Lima`. Si algún día hace falta, se cambia ACÁ y en ningún otro lugar.
 *
 * ## Qué pasa con una fecha ilegible
 *
 * No se descarta el registro. El esquema sólo garantiza que `createdAt` es una cadena, así que
 * si algún día llega una que `Date` no sabe leer, ese registro va a un grupo final con
 * `fecha: null` y la pantalla lo muestra sin fecha — perder el texto de alguien por no poder
 * ubicarlo en el calendario sería el peor de los dos errores.
 */

/** Un registro con su hora ya resuelta, para no volver a parsear la fecha al dibujar. */
export interface RegistroConHora {
  registro: RegistroRadarApi;
  /** `HH:mm` en la zona del dispositivo. `null` si `createdAt` no se pudo leer. */
  hora: string | null;
}

export interface DiaDeCodigoRenaser {
  /** `yyyy-MM-dd` en la zona del dispositivo. `null` en el grupo de fechas ilegibles. */
  fecha: string | null;
  /** De la más reciente a la más antigua, igual que el orden general. */
  registros: RegistroConHora[];
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

function claveDeDia(d: Date): string {
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
}

function horaDe(d: Date): string {
  return `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`;
}

/**
 * Agrupa por día, de lo más nuevo a lo más viejo, y dentro de cada día también.
 *
 * Se ordena acá aunque el servidor ya devuelva descendente: el orden es lo que hace legible la
 * sección, y depender de que una segunda página llegue "encajada" con la primera es confiar en
 * algo que el contrato no promete. Ordenar dos veces no cuesta nada; una lista desordenada
 * entre páginas se ve como un error de la app.
 */
export function agruparPorDiaYHora(registros: RegistroRadarApi[]): DiaDeCodigoRenaser[] {
  const conFecha: { registro: RegistroRadarApi; fecha: Date }[] = [];
  const sinFecha: RegistroConHora[] = [];

  for (const registro of registros) {
    const fecha = new Date(registro.createdAt);
    if (Number.isNaN(fecha.getTime())) {
      sinFecha.push({ registro, hora: null });
    } else {
      conFecha.push({ registro, fecha });
    }
  }

  conFecha.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  const dias: DiaDeCodigoRenaser[] = [];
  for (const { registro, fecha } of conFecha) {
    const clave = claveDeDia(fecha);
    const ultimo = dias[dias.length - 1];
    const grupo = ultimo && ultimo.fecha === clave ? ultimo : null;
    if (grupo) {
      grupo.registros.push({ registro, hora: horaDe(fecha) });
    } else {
      dias.push({ fecha: clave, registros: [{ registro, hora: horaDe(fecha) }] });
    }
  }

  if (sinFecha.length > 0) {
    dias.push({ fecha: null, registros: sinFecha });
  }
  return dias;
}
