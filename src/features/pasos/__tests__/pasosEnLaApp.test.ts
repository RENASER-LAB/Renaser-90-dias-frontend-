/**
 * Los pasos del teléfono y el resto de la app (spec 037, D-310): lo que llega del servidor (`medicion.meta`, `origenDelDia`), cómo se
 * lee lo cumplido, lo que ven el mentor, el líder, el ranking y Administración, y que las pantallas estén cableadas a todo eso.
 */
import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

import { habitsSchemas } from '../../habits/api/habitsSchemas';
import { medicionPedidaDe } from '../../habits/utils/registroConFoto';
import { aSemanaDePersona, cumplimientoDelLiderSchemas } from '../../lider-mentores/api/cumplimientoDelLiderSchemas';
import { semanaAlumnoSchema } from '../../mentor/api/mentorSchemas';
import { conKmAutomaticos, entradasDeLaTabla, TABLAS_DE_RANKING, textoDelPuntaje } from '../../ranking/utils/tablasDeRanking';
import { faltaParaLaMeta, leerLaMeta, textoDeLaMetaVigente } from '../../admin/utils/metaDeKilometros';
import type { HabitItem } from '../../../screens/TrainingScreen';
import { itemsDeHoy } from '../../training/utils/itemsDelDia';

const NBSP = ' ';
const raiz = path.resolve(__dirname, '..', '..', '..', '..');
const fuente = (ruta: string) => fs.readFileSync(path.join(raiz, ruta), 'utf-8');

const trackBase = {
  id: 'r-km', habitoId: 'h-km', fechaEjecucion: '2026-11-04', diaPrograma: 34, tipoDia: 'TODOS', esOpcional: true,
  estado: 'PENDIENTE', puntosOtorgados: 0, completadoEn: null, respuestaTexto: null, calificacionProductividad: null,
  guia: null, tituloHabito: 'KILÓMETROS DIARIOS', tipoHabito: 'CHECKBOX', horaDisparo: '17:00:00', horaLimite: null,
};

describe('lo que manda el servidor en la agenda de hoy', () => {
  it('la medición trae la meta que rige, y de dónde salió lo de hoy', () => {
    const [track] = habitsSchemas.tracksDeHoy.parse([
      { ...trackBase, medicion: { unidad: 'KILOMETROS', valorDelDia: 5.4, total: 117.8, meta: 5, origenDelDia: 'HEALTH_CONNECT', fuenteDelDia: 'Galaxy Watch' } },
    ]);
    expect(medicionPedidaDe(track)).toEqual({
      unidad: 'KILOMETROS',
      totalPrevio: 117.8,
      meta: 5,
      valorDelDia: 5.4,
      origenDelDia: 'HEALTH_CONNECT',
      fuenteDelDia: 'Galaxy Watch',
    });
  });

  it('un backend anterior no manda la meta ni el origen: la medición queda como era, y sin meta la app no ofrece nada', () => {
    const [track] = habitsSchemas.tracksDeHoy.parse([{ ...trackBase, medicion: { unidad: 'KILOMETROS', valorDelDia: null, total: 12.5 } }]);
    expect(medicionPedidaDe(track)).toEqual({ unidad: 'KILOMETROS', totalPrevio: 12.5 });
    expect(medicionPedidaDe(track)?.meta).toBeUndefined();
  });

  it('la meta, el origen y la fuente en null (todavía sin cumplir) no se cuelan', () => {
    const [track] = habitsSchemas.tracksDeHoy.parse([
      { ...trackBase, medicion: { unidad: 'KILOMETROS', valorDelDia: null, total: 0, meta: 5, origenDelDia: null, fuenteDelDia: null } },
    ]);
    expect(medicionPedidaDe(track)).toEqual({ unidad: 'KILOMETROS', totalPrevio: 0, meta: 5 });
  });
});

describe('la hoja de un hábito ya cumplido', () => {
  const habito = (medicion: HabitItem['medicion'], extra: Partial<HabitItem> = {}): HabitItem => ({
    id: 'r-km', habitoId: 'h-km', dimension: 'CUERPO', title: 'Kilómetros diarios', time: '17:00', tag: 'Innegociable', streak: 4,
    done: true, hasEvidence: false, tieneTrackHoy: true, estado: 'COMPLETADO', evidenceRequirement: 'REQUIRED', systemKey: 'DAILY_KM',
    puntosOtorgados: 8, completadoEn: '2026-11-04T22:12:00Z', medicion, ...extra,
  });
  const contexto = { hoyIso: '2026-11-04', zona: 'America/Lima', titulos: {} };

  it('dice «5,4 km · Health Connect · Galaxy Watch» si lo cerraron los pasos', () => {
    const [item] = itemsDeHoy([habito({ unidad: 'KILOMETROS', totalPrevio: 117.8, valorDelDia: 5.4, origenDelDia: 'HEALTH_CONNECT', fuenteDelDia: 'Galaxy Watch' })], [], contexto);
    expect(item.cumplido?.detalle).toBe(`5,4${NBSP}km · Health Connect · Galaxy Watch`);
  });

  it('dice «Captura» si lo cerró la captura', () => {
    const [item] = itemsDeHoy([habito({ unidad: 'KILOMETROS', totalPrevio: 10, valorDelDia: 4, origenDelDia: 'MANUAL' })], [], contexto);
    expect(item.cumplido?.detalle).toBe(`4${NBSP}km · Captura`);
  });

  it('en cualquier otro hábito, o sin el número, no agrega nada (la forma de lo cumplido no cambia)', () => {
    const [otro] = itemsDeHoy([habito(null, { systemKey: 'GYM', title: 'Gimnasio' })], [], contexto);
    expect(otro.cumplido).toEqual({ hora: expect.any(String), puntos: 8, escrito: null });
    expect(otro.cumplido).not.toHaveProperty('detalle');
    const [sinNumero] = itemsDeHoy([habito({ unidad: 'KILOMETROS', totalPrevio: 10 })], [], contexto);
    expect(sinNumero.cumplido).not.toHaveProperty('detalle');
  });
});

describe('las fichas del acompañamiento', () => {
  const lectura = { valor: 5.9, origen: 'HEALTH_CONNECT', pasos: 7840, fuente: 'Galaxy Watch', dispositivo: 'RELOJ', leidaEn: '2026-11-04T22:10:00Z', porRevisar: true };

  it('el líder y Administración reciben los km del día en cada obligación', () => {
    const cruda = cumplimientoDelLiderSchemas.semana.parse({
      desde: '2026-10-31',
      hasta: '2026-11-06',
      dias: [
        {
          fecha: '2026-11-04',
          obligaciones: [
            { registroId: 'o1', titulo: 'Kilómetros diarios', estadoHabito: 'COMPLETADO', medicion: lectura },
            { registroId: 'o2', titulo: 'Gimnasio', estadoHabito: 'COMPLETADO' },
            { registroId: 'o3', titulo: 'Rota', estadoHabito: 'COMPLETADO', medicion: { valor: 'x' } },
          ],
        },
      ],
    });
    const [km, otro, rota] = aSemanaDePersona(cruda).dias[0].obligaciones;
    expect(km.medicion).toMatchObject({ valor: 5.9, origen: 'HEALTH_CONNECT', fuente: 'Galaxy Watch', porRevisar: true });
    expect(otro.medicion).toBeNull();
    // Un valor roto pierde la línea de los km, no el día entero.
    expect(rota.medicion).toBeNull();
  });

  it('el mentor recibe lo mismo en su semana, y un backend anterior no lo manda', () => {
    const base = {
      grupoId: 'g1', alumnoId: 'a1', nombre: 'Ana', inicioDeSemana: '2026-10-31', finDeSemana: '2026-11-06', diaDePrograma: 34, zona: 'America/Lima',
      resumen: { obligaciones: 1, cumplidas: 1, conEntrega: 0, pendientes: 0, sinCumplir: 0 },
      cobertura: 'COMPLETA',
      actualizadoEn: '2026-11-04T22:00:00Z',
      dias: [
        {
          fecha: '2026-11-04', diaDePrograma: 34,
          obligaciones: [{ registroId: 'o1', titulo: 'Kilómetros diarios', estadoHabito: 'COMPLETADO', requiereEvidencia: true, entrega: 'NO_REQUERIDA', entregadaEn: null, revision: null, evidenciaId: null }],
        },
      ],
    };
    const sin = semanaAlumnoSchema.parse(base);
    expect(sin.dias[0].obligaciones[0].medicion ?? null).toBeNull();
    const con = semanaAlumnoSchema.parse({ ...base, dias: [{ ...base.dias[0], obligaciones: [{ ...base.dias[0].obligaciones[0], medicion: lectura }] }] });
    expect(con.dias[0].obligaciones[0].medicion).toMatchObject({ valor: 5.9, fuente: 'Galaxy Watch' });
    const rota = semanaAlumnoSchema.parse({ ...base, dias: [{ ...base.dias[0], obligaciones: [{ ...base.dias[0].obligaciones[0], medicion: 'raro' }] }] });
    expect(rota.dias[0].obligaciones[0].medicion ?? null).toBeNull();
  });

  it('las tres fichas dibujan la línea de los km', () => {
    expect(fuente('src/features/mentor/screens/AlumnoScreen.tsx')).toMatch(/LineaDeLaMedicionCruda crudo=\{o\.medicion\}/);
    expect(fuente('src/features/lider-mentores/components/DiaDeLaPersona.tsx')).toMatch(/<LineaDeLaMedicion medicion=\{obligacion\.medicion\}/);
  });
});

describe('el ranking de kilómetros', () => {
  it('no cambia el número: «auto» se suma solo a quien tiene días leídos por el teléfono', () => {
    expect(textoDelPuntaje('kilometros', 117.8)).toBe('117,8 km');
    expect(textoDelPuntaje('kilometros', 117.8, false)).toBe('117,8 km');
    expect(textoDelPuntaje('kilometros', 117.8, true)).toBe('117,8 km · auto');
    // Las demás tablas no llevan «auto».
    expect(textoDelPuntaje('gimnasio', 12, true)).toBe('12 días');
    expect(textoDelPuntaje('general', 80, true)).toBe('80 pts');
  });

  it('se marca por el id de la persona, nunca por el nombre', () => {
    const automaticos = new Set(['u-1']);
    expect(conKmAutomaticos({ participanteId: 'u-1' }, automaticos)).toBe(true);
    expect(conKmAutomaticos({ participanteId: 'u-2' }, automaticos)).toBe(false);
    expect(conKmAutomaticos({ participanteId: 'u-1' }, undefined)).toBe(false);
  });

  it('la línea bajo el selector dice de dónde salen los km', () => {
    expect(TABLAS_DE_RANKING.find(t => t.clave === 'kilometros')?.explica).toBe('Km de tus pasos o de tu captura.');
  });

  it('la pantalla pasa los ids a las filas, al podio y a «Todas»', () => {
    const comunidad = fuente('src/screens/ComunidadScreen.tsx');
    expect(comunidad).toContain('kilometrosAutomaticos');
    expect(comunidad).toContain('conKmAutomaticos(item, kmAutomaticos)');
    expect(comunidad).toContain('automaticos={kmAutomaticos}');
    expect(entradasDeLaTabla(null, 'kilometros')).toEqual([]);
  });
});

describe('la meta en «Hábitos del programa»', () => {
  it('se lee con coma o con punto y debe estar en el rango del servidor (0,5 a 50 km)', () => {
    expect(leerLaMeta('5', 0.5, 50)).toBe(5);
    expect(leerLaMeta('6,5', 0.5, 50)).toBe(6.5);
    expect(leerLaMeta(' 6.25 ', 0.5, 50)).toBe(6.25);
    expect(leerLaMeta('0,4', 0.5, 50)).toBeNull();
    expect(leerLaMeta('51', 0.5, 50)).toBeNull();
    expect(leerLaMeta('cinco', 0.5, 50)).toBeNull();
    expect(leerLaMeta('', 0.5, 50)).toBeNull();
  });

  it('dice qué falta con palabras', () => {
    expect(faltaParaLaMeta('', 0.5, 50)).toBe('Escribe la meta en km.');
    expect(faltaParaLaMeta('80', 0.5, 50)).toBe('La meta tiene que estar entre 0,5 y 50 km.');
    expect(faltaParaLaMeta('5', 0.5, 50)).toBeNull();
  });

  it('dice si es la del programa', () => {
    expect(textoDeLaMetaVigente(5, true)).toBe('5 km · la del programa');
    expect(textoDeLaMetaVigente(6.5, false)).toBe('6,5 km');
  });

  it('solo «Kilómetros diarios» muestra la sección, y solo si el servidor la tiene', () => {
    const formulario = fuente('src/features/admin/screens/HabitoProgramaFormScreen.tsx');
    expect(formulario).toContain("habito.systemKey === 'DAILY_KM'");
    expect(formulario).toContain('<MetaDeKilometrosDelHabito habitoId={habito.id} />');
    const seccion = fuente('src/features/admin/components/MetaDeKilometrosDelHabito.tsx');
    expect(seccion).toContain('if (!vigente) return null;');
  });
});

describe('Training', () => {
  it('la pantalla monta los pasos solo en hoy y con Training a la vista, y se los pasa a la lista', () => {
    const pantalla = fuente('src/screens/TrainingScreen.tsx');
    expect(pantalla).toContain('usePasosDelDia({');
    expect(pantalla).toContain('activo: trainingActivo && !viendoUnDiaAnterior');
    expect(pantalla).toContain('pasos={pasos}');
    // Al registrar, el cierre se refleja como los demás y se avisa con los km.
    expect(pantalla).toContain('textoDelAvisoDeRegistro(resultado.km)');
  });

  it('la lista de hoy abre las hojas de los pasos y comparte la vista con la fila por contexto', () => {
    const lista = fuente('src/features/training/components/TrainingPorHora.tsx');
    expect(lista).toContain('<ProveedorDePasosDeLaLista value={pasosDeLaLista}>');
    expect(lista).toContain('<HojaConectarPasos');
    expect(lista).toContain('<HojaDeKilometros');
    // Un día anterior no ofrece nada: la lista de otro día queda fuera del proveedor.
    const proveedor = lista.slice(lista.indexOf('<ProveedorDePasosDeLaLista'), lista.indexOf('</ProveedorDePasosDeLaLista>'));
    expect(proveedor).not.toContain('ListaDeOtroDia');
  });
});
