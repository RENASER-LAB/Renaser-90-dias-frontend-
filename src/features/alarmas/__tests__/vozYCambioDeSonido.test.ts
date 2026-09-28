/**
 * La «Voz» como sonido de las alarmas y el paso de las alarmas ya programadas al sonido nuevo.
 *
 * 2026-09-26: una frase por tipo. 2026-09-27 (decisión del dueño, voz Dora): «que diga el nombre del
 * hábito». Contra el código del 26 falla lo de la voz por hábito: `canalDeAlarma` no recibía el
 * hábito, todos los hábitos salían por `recordatorios-habitos-voz` diciendo «Tu hábito está por
 * empezar», y el cambio de sonido mandaba todas las alarmas de hábitos a ese único canal.
 */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import tabla from '../vocesDeLasAlarmas.json';
import { canalDelHabitoProgramado, planDeCambioDeSonido } from '../cambioDeSonido';
import { leerPreferencias } from '../preferenciasDeAlarmas';
import { planDeRearmado, type AlarmaProgramada } from '../rearmarAlarmas';
import { ARCHIVO_VOZ, archivoDelCanal, canalDeAlarma, esSonido, SONIDOS } from '../sonidoDeAlarma';
import { mismoTitulo, VOCES_DE_HABITOS, vozDelHabito } from '../vozDeLosHabitos';
import { habitoDelAviso, tituloDelAviso } from '../../habits/notificaciones/recordatoriosDeHabito';

const AHORA = new Date(2026, 8, 26, 10, 0, 0, 0).getTime();
const MIN = 60 * 1000;

/** Ids del catálogo (V4 del backend). */
const DESPERTAR = '899a2151-e98c-4b61-a46c-b55134240d17';
const JUGO_VERDE = '00006bd5-ab74-4317-b022-ae2e3a878d55';
const AGUA_TIBIA = '66507383-7219-43ab-aa42-2fbc76152b82';
const RITUAL_MANANA = '4dee0fa3-e285-4b7d-b062-ad0001dde314';
const RITUAL_DOMINGO = '60d6c870-df03-4d36-8a88-8c7411ae406b';

describe('la voz: cada hábito del catálogo dice su nombre', () => {
  it('«Voz» sigue siendo una opción de Yo → Alarmas y se guarda', () => {
    expect(SONIDOS.map(s => s.clave)).toContain('voz');
    expect(esSonido('voz')).toBe(true);
    expect(leerPreferencias('{"eventosActivas":true,"sonido":"voz"}').sonido).toBe('voz');
  });

  it('un hábito del catálogo sale por SU canal, con el audio que dice su nombre', () => {
    expect(canalDeAlarma('habitos', 'voz', { id: DESPERTAR, titulo: 'DESPERTAR' })).toEqual({
      id: 'recordatorios-habitos-voz-despertar',
      nombre: 'Recordatorios de hábitos (voz: Despertar)',
      sonidoDelCanal: 'voz_habito_despertar.mp3',
      sonidoDelAviso: 'voz_habito_despertar.mp3',
    });
  });

  it('mayúsculas y tildes no cuentan: el título que muestra la app puede venir escrito de otra forma', () => {
    expect(mismoTitulo('AGUA TIBIA CON LIMÓN', 'Agua tibia con limon')).toBe(true);
    expect(canalDeAlarma('habitos', 'voz', { id: AGUA_TIBIA, titulo: '  Agua  tibia con limón ' }).id).toBe('recordatorios-habitos-voz-agua_tibia');
  });

  it('renombrado («Agua con miel» en vez de JUGO VERDE), la voz no dice el nombre viejo: dice la frase genérica', () => {
    expect(vozDelHabito({ id: JUGO_VERDE, titulo: 'Agua con miel' })).toBeNull();
    expect(canalDeAlarma('habitos', 'voz', { id: JUGO_VERDE, titulo: 'Agua con miel' })).toMatchObject({
      id: 'recordatorios-habitos-voz',
      sonidoDelCanal: 'voz_habito.mp3',
    });
  });

  it('un hábito propio (o sin hábito) dice «Tu hábito está por empezar», también con Dora', () => {
    expect(canalDeAlarma('habitos', 'voz', { id: 'h-propio', titulo: 'Leer' })).toMatchObject({ id: 'recordatorios-habitos-voz', sonidoDelCanal: 'voz_habito.mp3' });
    expect(canalDeAlarma('habitos', 'voz')).toMatchObject({ id: 'recordatorios-habitos-voz', sonidoDelCanal: 'voz_habito.mp3' });
    expect(tabla.genericas.habitos.dice).toBe('Tu hábito está por empezar.');
  });

  it('eventos y objetivos dicen su frase genérica aunque se les pase un hábito', () => {
    expect(canalDeAlarma('eventos', 'voz', { id: DESPERTAR, titulo: 'DESPERTAR' })).toMatchObject({ id: 'recordatorios-eventos-voz', sonidoDelCanal: 'voz_evento.mp3' });
    expect(canalDeAlarma('objetivos', 'voz')).toMatchObject({ id: 'recordatorios-objetivos-voz', sonidoDelCanal: 'voz_objetivos.mp3' });
    expect(ARCHIVO_VOZ).toEqual({ habitos: 'voz_habito.mp3', eventos: 'voz_evento.mp3', objetivos: 'voz_objetivos.mp3' });
  });

  it('los dos rituales de la mañana dicen lo mismo y comparten audio y canal', () => {
    const semana = canalDeAlarma('habitos', 'voz', { id: RITUAL_MANANA, titulo: 'RITUAL TIERRA - AGUA - FUEGO (mañana)' });
    const domingo = canalDeAlarma('habitos', 'voz', { id: RITUAL_DOMINGO, titulo: 'RITUAL DE MAÑANA (domingo)' });
    expect(domingo).toEqual(semana);
    expect(semana.sonidoDelCanal).toBe('voz_habito_ritual_manana.mp3');
  });

  it('la tabla: los 18 hábitos del catálogo, ids únicos, y una misma clave dice siempre lo mismo', () => {
    expect(tabla.habitos).toHaveLength(18);
    expect(new Set(tabla.habitos.map(h => h.habitoId)).size).toBe(18);
    for (const h of tabla.habitos) {
      expect(h.clave).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(h.dice).toMatch(/^\S.*\.$/);
      expect(tabla.habitos.filter(o => o.clave === h.clave).every(o => o.dice === h.dice)).toBe(true);
    }
    expect(VOCES_DE_HABITOS).toHaveLength(17);
  });

  it('el rearmado nombra el archivo del canal: la voz de un hábito no vuelve con la campana ni con la genérica', () => {
    expect(archivoDelCanal('recordatorios-habitos-voz-dormir')).toBe('voz_habito_dormir.mp3');
    expect(archivoDelCanal('recordatorios-eventos-voz')).toBe('voz_evento.mp3');
    expect(archivoDelCanal('recordatorios-habitos-campana')).toBe('campana_renaser.wav');
    expect(archivoDelCanal('recordatorios-habitos')).toBeNull();
    expect(archivoDelCanal('recordatorios-habitos-voz-que-no-existe')).toBeNull();
    const [pedido] = planDeRearmado(
      [{ identifier: 'a', content: { title: 'DESPERTAR', sound: 'custom' }, trigger: { type: 'daily', hour: 5, minute: 0, channelId: 'recordatorios-habitos-voz-despertar' } }],
      AHORA,
    );
    expect(pedido.content.sound).toBe('voz_habito_despertar.mp3');
  });
});

describe('pasar las alarmas ya programadas al sonido nuevo', () => {
  const diaria = (id: string, hora: number, canal = 'recordatorios-habitos', titulo = 'Leer'): AlarmaProgramada => ({
    identifier: id,
    content: { title: titulo, body: 'Te toca a las 09:30.', sound: 'default' },
    trigger: { type: 'daily', hour: hora, minute: 30, channelId: canal },
  });

  it('cambia canal y sonido, conserva id, texto y hora, y no toca alarmas ajenas', () => {
    const plan = planDeCambioDeSonido(
      [diaria('mia', 21), diaria('ajena', 21)],
      new Set(['mia']),
      canalDeAlarma('habitos', 'voz'),
      AHORA,
    );
    expect(plan).toEqual([
      {
        identifier: 'mia',
        content: { title: 'Leer', body: 'Te toca a las 09:30.', sound: 'voz_habito.mp3' },
        trigger: { type: 'daily', hour: 21, minute: 30, channelId: 'recordatorios-habitos-voz' },
      },
    ]);
  });

  it('con «Voz», cada hábito va a SU canal: Despertar al que dice «Despertar», uno propio al genérico', () => {
    const habitoDeLaAlarma = new Map([['d-30', DESPERTAR], ['d-0', DESPERTAR], ['leer', 'h-propio']]);
    const plan = planDeCambioDeSonido(
      [
        diaria('d-30', 4, 'recordatorios-habitos', tituloDelAviso('DESPERTAR', 30)),
        diaria('d-0', 5, 'recordatorios-habitos', tituloDelAviso('DESPERTAR', 0)),
        diaria('leer', 21, 'recordatorios-habitos', 'Leer'),
      ],
      new Set(habitoDeLaAlarma.keys()),
      canalDelHabitoProgramado(habitoDeLaAlarma, 'voz'),
      AHORA,
    );
    expect(plan.map(p => [p.identifier, (p.trigger as { channelId: string }).channelId, p.content.sound])).toEqual([
      ['d-30', 'recordatorios-habitos-voz-despertar', 'voz_habito_despertar.mp3'],
      ['d-0', 'recordatorios-habitos-voz-despertar', 'voz_habito_despertar.mp3'],
      ['leer', 'recordatorios-habitos-voz', 'voz_habito.mp3'],
    ]);
    // El texto del aviso no cambia: el nombre sigue escrito.
    expect(plan[0].content.title).toBe('En 30 min: DESPERTAR');
  });

  it('quien ya tenía «Voz» (frase genérica del 26/09) pasa a la voz de su hábito al volver a elegirla', () => {
    const [pedido] = planDeCambioDeSonido(
      [diaria('d-0', 5, 'recordatorios-habitos-voz', 'DESPERTAR')],
      new Set(['d-0']),
      canalDelHabitoProgramado(new Map([['d-0', DESPERTAR]]), 'voz'),
      AHORA,
    );
    expect((pedido.trigger as { channelId: string }).channelId).toBe('recordatorios-habitos-voz-despertar');
  });

  it('el título del aviso se lee de vuelta: «En N min: X» → X', () => {
    expect(habitoDelAviso(tituloDelAviso('Jugo verde', 10))).toBe('Jugo verde');
    expect(habitoDelAviso(tituloDelAviso('En 5 min: raro', 0))).toBe('raro');
    expect(habitoDelAviso('DESPERTAR')).toBe('DESPERTAR');
  });

  it('también pasa una diaria que acaba de sonar (si no, quedaría con el sonido viejo todos los días)', () => {
    // 09:30 con el reloj a las 10:00: el rearmado la respeta; el cambio de sonido no puede.
    expect(planDeRearmado([diaria('mia', 9)], AHORA)).toEqual([]);
    expect(planDeCambioDeSonido([diaria('mia', 9)], new Set(['mia']), canalDeAlarma('habitos', 'voz'), AHORA)).toHaveLength(1);
  });

  it('es idempotente: lo que ya está en el canal nuevo no se vuelve a programar', () => {
    expect(planDeCambioDeSonido(
      [diaria('mia', 21, 'recordatorios-habitos-voz')],
      new Set(['mia']),
      canalDeAlarma('habitos', 'voz'),
      AHORA,
    )).toEqual([]);
    expect(planDeCambioDeSonido(
      [diaria('d', 5, 'recordatorios-habitos-voz-despertar', 'DESPERTAR')],
      new Set(['d']),
      canalDelHabitoProgramado(new Map([['d', DESPERTAR]]), 'voz'),
      AHORA,
    )).toEqual([]);
  });

  it('volver a «El del teléfono» manda el sonido del sistema y el canal de siempre', () => {
    const [pedido] = planDeCambioDeSonido(
      [diaria('mia', 21, 'recordatorios-habitos-voz-despertar', 'DESPERTAR')],
      new Set(['mia']),
      canalDelHabitoProgramado(new Map([['mia', DESPERTAR]]), 'sistema'),
      AHORA + 5 * MIN,
    );
    expect(pedido.content.sound).toBe(true);
    expect((pedido.trigger as { channelId: string }).channelId).toBe('recordatorios-habitos');
  });

  it('a un sonido para relajar: todos los hábitos al mismo canal, el de la lluvia', () => {
    const plan = planDeCambioDeSonido(
      [diaria('d', 5, 'recordatorios-habitos-voz-despertar', 'DESPERTAR'), diaria('leer', 21)],
      new Set(['d', 'leer']),
      canalDelHabitoProgramado(new Map([['d', DESPERTAR], ['leer', 'h-propio']]), 'relajar-lluvia'),
      AHORA,
    );
    expect(plan.map(p => (p.trigger as { channelId: string }).channelId)).toEqual([
      'recordatorios-habitos-relajar-lluvia',
      'recordatorios-habitos-relajar-lluvia',
    ]);
    expect(plan.every(p => p.content.sound === 'relajar_lluvia.mp3')).toBe(true);
  });
});
