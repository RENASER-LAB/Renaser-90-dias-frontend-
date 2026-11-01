import { describe, expect, it } from '@jest/globals';

import type { ParticipacionAnterior, ResumenDeFormacion } from '../types/formaciones.types';
import { borradorDeLaFormacion, errorDelBorrador, paraGuardar } from '../utils/borradorDeFormacion';
import {
  BORRADOR_DE_TRASLADO_VACIO,
  destinosPosibles,
  duracionInicial,
  errorDelTraslado,
  paraTrasladar,
  textoDeLaConfirmacion,
} from '../utils/borradorDeTraslado';
import { alternarFormacion, errorDeLaSeleccion, haCambiado, seleccionInicial } from '../utils/formacionesDelPersonal';
import { detalleDeLaParticipacion, tituloDeLaParticipacion } from '../utils/historialDeFormaciones';
import { nombreCortoDeFormacion, nombreLargoDeFormacion } from '../utils/nombreDeFormacion';
import { estadoDeLaFormacion, lineaDeCifras, lineaDeDuraciones, resultadoEnPalabras, totalPorAtender } from '../utils/resumenDeFormacion';

function resumen(parcial: Partial<ResumenDeFormacion> = {}): ResumenDeFormacion {
  return {
    codigo: 'DIPLOMADO',
    nombre: 'Diplomado Renaser',
    descripcion: 'Formación de 3 meses o de 1 año.',
    activa: true,
    duracionesDias: [90, 365],
    etiquetasDeDuracion: ['3 meses', '1 año'],
    version: 3,
    ...parcial,
  };
}

describe('editar una formación', () => {
  it('el borrador parte de lo que tiene el servidor y ofrece las duraciones de siempre', () => {
    const borrador = borradorDeLaFormacion(resumen({ duracionesDias: [90], etiquetasDeDuracion: ['3 meses'] }));
    expect(borrador.duracionesDias).toEqual([90]);
    expect(borrador.opcionesDeDuracion).toEqual([90, 365]);
    expect(borradorDeLaFormacion(resumen({ duracionesDias: [90, 180] })).opcionesDeDuracion).toEqual([90, 180, 365]);
  });

  it('avisa qué falta: nombre de 3 a 80 letras, descripción hasta 600 y al menos una duración', () => {
    const buen = borradorDeLaFormacion(resumen());
    expect(errorDelBorrador(buen)).toBeNull();
    expect(errorDelBorrador({ ...buen, nombre: '  ab ' })).toBe('El nombre necesita al menos 3 letras.');
    expect(errorDelBorrador({ ...buen, nombre: 'x'.repeat(81) })).toBe('El nombre puede tener hasta 80 letras.');
    expect(errorDelBorrador({ ...buen, descripcion: 'x'.repeat(601) })).toBe('La descripción puede tener hasta 600 letras.');
    expect(errorDelBorrador({ ...buen, duracionesDias: [] })).toBe('Elige al menos una duración.');
  });

  it('lo que se manda lleva la versión que se leyó, el texto limpio y las duraciones en orden', () => {
    const borrador = { ...borradorDeLaFormacion(resumen()), nombre: '  Diplomado Plus ', duracionesDias: [365, 90] };
    expect(paraGuardar(borrador, 3)).toEqual({
      nombre: 'Diplomado Plus',
      descripcion: 'Formación de 3 meses o de 1 año.',
      activa: true,
      duracionesDias: [90, 365],
      version: 3,
    });
  });
});

describe('pasar a un aprendiz a otra formación', () => {
  const escuela = resumen({ codigo: 'ESCUELA', nombre: 'Escuela Renaser', duracionesDias: [90] });
  const certificacion = resumen({ codigo: 'CERTIFICACION', nombre: 'Certificación Renaser', duracionesDias: [90] });
  const apagada = resumen({ codigo: 'X', activa: false });

  it('se ofrecen las formaciones disponibles que no son la de ahora', () => {
    expect(destinosPosibles([escuela, resumen(), certificacion, apagada], 'ESCUELA').map(f => f.codigo)).toEqual(['DIPLOMADO', 'CERTIFICACION']);
    expect(destinosPosibles([], null)).toEqual([]);
  });

  it('la duración arranca en 90 si la ofrece, y si no en la primera', () => {
    expect(duracionInicial(resumen())).toBe(90);
    expect(duracionInicial(resumen({ duracionesDias: [365] }))).toBe(365);
    expect(duracionInicial(resumen({ duracionesDias: [] }))).toBeNull();
  });

  it('dice qué falta antes de enviar', () => {
    expect(errorDelTraslado(BORRADOR_DE_TRASLADO_VACIO)).toBe('Elige a qué formación pasa.');
    expect(errorDelTraslado({ ...BORRADOR_DE_TRASLADO_VACIO, destino: 'DIPLOMADO' })).toBe('Elige la duración.');
    const listo = { ...BORRADOR_DE_TRASLADO_VACIO, destino: 'DIPLOMADO', duracionDias: 365 };
    expect(errorDelTraslado(listo)).toBeNull();
    expect(errorDelTraslado({ ...listo, darPorTerminada: true, motivo: ' a ' })).toBe('Escribe el motivo (al menos 3 letras).');
    expect(errorDelTraslado({ ...listo, darPorTerminada: true, motivo: 'x'.repeat(501) })).toBe('El motivo puede tener hasta 500 letras.');
    expect(errorDelTraslado({ ...listo, darPorTerminada: true, motivo: 'Cambió de programa' })).toBeNull();
  });

  it('el motivo solo viaja si se la da por terminada', () => {
    const listo = { destino: 'DIPLOMADO', duracionDias: 365, darPorTerminada: false, motivo: 'se queda escrito' };
    expect(paraTrasladar(listo)).toEqual({ formacion: 'DIPLOMADO', duracionDias: 365, darPorTerminada: false, motivo: null });
    expect(paraTrasladar({ ...listo, darPorTerminada: true, motivo: '  Cambió de programa ' })).toEqual({
      formacion: 'DIPLOMADO',
      duracionDias: 365,
      darPorTerminada: true,
      motivo: 'Cambió de programa',
    });
  });

  it('la confirmación dice que empieza de cero y que su historial queda', () => {
    const texto = textoDeLaConfirmacion('Ana Pérez', 'Diplomado Renaser');
    expect(texto).toContain('Ana Pérez pasa a Diplomado Renaser');
    expect(texto).toContain('día 0');
    expect(texto).toContain('historial');
  });
});

describe('las formaciones del personal', () => {
  it('parte de lo asignado, con la activa marcada, en el orden del catálogo', () => {
    const inicial = seleccionInicial([
      { formacion: 'DIPLOMADO', activa: false },
      { formacion: 'ESCUELA', activa: true },
    ]);
    expect(inicial).toEqual({ marcadas: ['ESCUELA', 'DIPLOMADO'], activa: 'ESCUELA' });
    expect(seleccionInicial([])).toEqual({ marcadas: [], activa: null });
  });

  it('marcar suma, desmarcar quita, y si se quita la activa pasa a ser la primera que queda', () => {
    const inicial = seleccionInicial([{ formacion: 'ESCUELA', activa: true }]);
    const conDos = alternarFormacion(inicial, 'DIPLOMADO');
    expect(conDos).toEqual({ marcadas: ['ESCUELA', 'DIPLOMADO'], activa: 'ESCUELA' });
    expect(alternarFormacion(conDos, 'ESCUELA')).toEqual({ marcadas: ['DIPLOMADO'], activa: 'DIPLOMADO' });
    expect(alternarFormacion(alternarFormacion(conDos, 'ESCUELA'), 'DIPLOMADO')).toEqual({ marcadas: [], activa: null });
  });

  it('sabe si cambió algo y no deja guardar sin ninguna', () => {
    const inicial = seleccionInicial([{ formacion: 'ESCUELA', activa: true }]);
    expect(haCambiado(inicial, inicial)).toBe(false);
    expect(haCambiado(inicial, alternarFormacion(inicial, 'CERTIFICACION'))).toBe(true);
    expect(haCambiado(alternarFormacion(inicial, 'CERTIFICACION'), { ...alternarFormacion(inicial, 'CERTIFICACION'), activa: 'CERTIFICACION' })).toBe(true);
    expect(errorDeLaSeleccion({ marcadas: [], activa: null })).toBe('Marca al menos una formación.');
    expect(errorDeLaSeleccion(inicial)).toBeNull();
  });
});

describe('los textos del centro', () => {
  it('dice las duraciones, las cifras con su plural y lo por atender', () => {
    expect(lineaDeDuraciones(resumen())).toBe('3 meses · 1 año');
    expect(lineaDeDuraciones(resumen({ etiquetasDeDuracion: [] }))).toBe('Sin duración');
    expect(lineaDeCifras({ aprendicesActivos: 1, personal: 0, grupos: 1 })).toBe('1 aprendiz · 0 de personal · 1 grupo');
    expect(lineaDeCifras({ aprendicesActivos: 12, personal: 3, grupos: 2 })).toBe('12 aprendices · 3 de personal · 2 grupos');
    expect(totalPorAtender({ gruposSinMentor: 2, aprendicesSinGrupo: 3, personalSinFormacion: 1 })).toBe(6);
    expect(estadoDeLaFormacion(resumen())).toBe('Disponible');
    expect(estadoDeLaFormacion(resumen({ activa: false }))).toBe('No disponible');
  });

  it('nombra las formaciones por su código y deja pasar uno que no conoce', () => {
    expect(nombreCortoDeFormacion('CERTIFICACION')).toBe('Certificación');
    expect(nombreLargoDeFormacion('ESCUELA')).toBe('Escuela Renaser');
    expect(nombreLargoDeFormacion('MAESTRIA')).toBe('MAESTRIA');
  });

  it('el historial dice cómo terminó, hasta qué día llegó y el motivo si la dieron por terminada', () => {
    const terminada: ParticipacionAnterior = {
      formacion: 'ESCUELA',
      duracionDias: 90,
      fechaInicio: '2026-07-01',
      fechaFin: '2026-10-30',
      diaFinal: 90,
      resultado: 'TERMINADA',
      motivo: null,
      puntosLiga: 240,
      trasladadoA: 'DIPLOMADO',
    };
    const fecha = (iso: string) => `fecha(${iso})`;
    expect(tituloDeLaParticipacion(terminada)).toBe('Escuela Renaser · 3 meses');
    expect(detalleDeLaParticipacion(terminada, fecha)).toBe('Terminó el fecha(2026-10-30) · llegó al día 90 · 240 puntos');
    expect(detalleDeLaParticipacion({ ...terminada, resultado: 'DADA_POR_TERMINADA', motivo: 'Cambió de programa', puntosLiga: null, diaFinal: 40 }, fecha)).toBe(
      'La dieron por terminada el fecha(2026-10-30) · llegó al día 40. Motivo: Cambió de programa',
    );
    expect(resultadoEnPalabras('TERMINADA')).toBe('Terminó');
  });
});
