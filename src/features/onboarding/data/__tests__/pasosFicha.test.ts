import { describe, expect, it } from '@jest/globals';
import { INITIAL_FICHA_DATA } from '../chaptersConfig';
import {
  PASOS_FICHA,
  TOTAL_PASOS_FICHA,
  indiceDesdeBorrador,
  pasosDelCapitulo,
  primerPasoDelCapitulo,
  rellenoPorCapitulo,
  ubicarPaso,
  validarCapitulo,
  validarPaso,
} from '../pasosFicha';
import type { FichaInicialData } from '../../types/onboarding.types';

/**
 * La Ficha Inicial pasó a mostrarse de a un paso por pantalla (2026-10-05). Estas pruebas cuidan lo
 * que NO podía cambiar: los capítulos siguen siendo la unidad de guardado, y las reglas y los
 * avisos de validación son los de siempre, palabra por palabra, repartidos en sus pasos.
 */

function ficha(cambios: {
  identidad?: Partial<FichaInicialData['identidad']>;
  salud?: Partial<FichaInicialData['salud']>;
  consentimiento?: Partial<FichaInicialData['consentimiento']>;
} = {}): FichaInicialData {
  return {
    identidad: { ...INITIAL_FICHA_DATA.identidad, ...cambios.identidad },
    salud: { ...INITIAL_FICHA_DATA.salud, ...cambios.salud },
    consentimiento: { ...INITIAL_FICHA_DATA.consentimiento, ...cambios.consentimiento },
  };
}

const IDENTIDAD_COMPLETA = {
  nombre: 'Ana Pérez',
  sexo: 'Femenino' as const,
  numeroDocumento: '72345678',
  fechaNacimiento: '15/06/1995',
  whatsapp: '+51 987654321',
};

describe('Los pasos de la ficha', () => {
  it('son doce y respetan los tres capítulos de guardado (9 + 2 + 1), en orden', () => {
    expect(TOTAL_PASOS_FICHA).toBe(12);
    expect(pasosDelCapitulo(0)).toHaveLength(9);
    expect(pasosDelCapitulo(1)).toHaveLength(2);
    expect(pasosDelCapitulo(2)).toHaveLength(1);
    // Un capítulo nunca queda partido en dos tramos: el reparto es contiguo.
    const capitulos = PASOS_FICHA.map(p => p.capitulo);
    expect(capitulos).toEqual([...capitulos].sort());
    expect(primerPasoDelCapitulo(1)).toBe(9);
    expect(primerPasoDelCapitulo(2)).toBe(11);
  });

  it('sabe cuál paso cierra cada capítulo: ahí, y sólo ahí, se guarda', () => {
    const cierres = PASOS_FICHA.map((_, i) => ubicarPaso(i).esUltimoDelCapitulo);
    expect(cierres.map((v, i) => (v ? PASOS_FICHA[i].id : null)).filter(Boolean)).toEqual([
      'temor',
      'medicacion',
      'consentimiento',
    ]);
    expect(ubicarPaso(11).esUltimo).toBe(true);
    expect(ubicarPaso(10).esUltimo).toBe(false);
  });
});

describe('validarPaso: los mismos avisos de antes, en el paso donde vive cada campo', () => {
  it('nombre corto en el paso del nombre', () => {
    expect(validarPaso('nombre', ficha({ identidad: { nombre: 'Al' } }))).toEqual({
      titulo: 'Nombre requerido',
      mensaje: 'Por favor ingresa tu nombre completo en la Identidad.',
    });
    expect(validarPaso('nombre', ficha({ identidad: { nombre: 'Ana' } }))).toBeNull();
  });

  it('«Sobre ti» pide primero el sexo y después la fecha', () => {
    expect(validarPaso('sobreTi', ficha())?.titulo).toBe('Sexo requerido');
    expect(validarPaso('sobreTi', ficha({ identidad: { sexo: 'Otro' } }))).toEqual({
      titulo: 'Fecha requerida',
      mensaje: 'Por favor selecciona tu fecha de nacimiento.',
    });
  });

  it('documento y WhatsApp, con los mínimos de siempre', () => {
    expect(validarPaso('documento', ficha({ identidad: { numeroDocumento: '123' } }))?.titulo).toBe('Documento requerido');
    expect(validarPaso('documento', ficha({ identidad: { numeroDocumento: '1234' } }))).toBeNull();
    expect(validarPaso('whatsapp', ficha({ identidad: { whatsapp: '+51 ' } }))).toEqual({
      titulo: 'WhatsApp requerido',
      mensaje: 'Por favor ingresa tu número de WhatsApp para contacto con tu mentor.',
    });
  });

  it('los pasos sin campos obligatorios nunca frenan', () => {
    for (const id of ['familia', 'trabajo', 'ubicacion', 'expectativa', 'temor'] as const) {
      expect(validarPaso(id, ficha())).toBeNull();
    }
  });

  it('salud: horas fuera de rango, y la medicación sólo si dijo que sí', () => {
    expect(validarPaso('descanso', ficha({ salud: { horasSueno: '' } }))?.titulo).toBe('Horas de sueño requeridas');
    expect(validarPaso('descanso', ficha({ salud: { horasSueno: '25' } }))?.titulo).toBe('Horas de sueño requeridas');
    expect(validarPaso('descanso', ficha({ salud: { horasSueno: '7.5' } }))).toBeNull();
    expect(validarPaso('medicacion', ficha({ salud: { tomaMedicacionRegular: false } }))).toBeNull();
    expect(validarPaso('medicacion', ficha({ salud: { tomaMedicacionRegular: true, especificacionMedicacion: ' ' } }))).toEqual({
      titulo: 'Medicación requerida',
      mensaje: 'Por favor especifica tu medicación y el motivo de la toma.',
    });
  });

  it('consentimiento sin marcar', () => {
    expect(validarPaso('consentimiento', ficha())?.titulo).toBe('Compromiso requerido');
    expect(validarPaso('consentimiento', ficha({ consentimiento: { autorizaUsoDatos: true, compromiso90Dias: true } }))).toBeNull();
  });
});

describe('validarCapitulo: la red antes de guardar', () => {
  it('devuelve el PRIMER paso del capítulo al que le falta algo, con su aviso', () => {
    const faltaWhatsapp = ficha({ identidad: { ...IDENTIDAD_COMPLETA, whatsapp: '' } });
    expect(validarCapitulo(0, faltaWhatsapp)).toEqual({
      indice: PASOS_FICHA.findIndex(p => p.id === 'whatsapp'),
      aviso: expect.objectContaining({ titulo: 'WhatsApp requerido' }),
    });
    expect(validarCapitulo(0, ficha({ identidad: IDENTIDAD_COMPLETA }))).toBeNull();
  });
});

describe('La barra de avance', () => {
  it('llena el tramo del capítulo en curso paso a paso; los anteriores quedan llenos', () => {
    expect(rellenoPorCapitulo(0)).toEqual([1 / 9, 0, 0]);
    expect(rellenoPorCapitulo(8)).toEqual([1, 0, 0]);
    expect(rellenoPorCapitulo(9)).toEqual([1, 0.5, 0]);
    expect(rellenoPorCapitulo(11)).toEqual([1, 1, 1]);
  });
});

describe('Volver a donde se estaba al reabrir la app', () => {
  it('un borrador de antes (sólo con el capítulo) vuelve al primer paso de ese capítulo', () => {
    expect(indiceDesdeBorrador(1)).toBe(9);
    expect(indiceDesdeBorrador(2, undefined)).toBe(11);
  });

  it('un borrador nuevo vuelve al paso exacto', () => {
    expect(indiceDesdeBorrador(0, 4)).toBe(4);
    expect(indiceDesdeBorrador(1, 1)).toBe(10);
  });

  it('un valor raro nunca deja la pantalla en un paso que no existe', () => {
    expect(indiceDesdeBorrador(7, 2)).toBe(2);
    expect(indiceDesdeBorrador(-1)).toBe(0);
    expect(indiceDesdeBorrador(1, 99)).toBe(10);
    expect(indiceDesdeBorrador(0, -3)).toBe(0);
    expect(indiceDesdeBorrador(Number.NaN, Number.NaN)).toBe(0);
  });
});
