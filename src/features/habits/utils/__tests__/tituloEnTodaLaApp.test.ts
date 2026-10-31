import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

import { tituloDelPedido } from '../../../renasia/utils/pedidosDeFoto';
import { nombreDelBloque } from '../../../huecos/utils/agendaDelDia';
import { dichoDeLaObligacion } from '../../../lider-mentores/utils/palabrasDeLaPersona';

/**
 * Los nombres de los hábitos en tipo oración en TODA la app (2026-10-31, pedido del dueño; antes solo Training): donde se pinta el
 * título de un hábito del catálogo se usa `tituloEnTipoOracion`. Lo que se guarda, lo que se manda y el texto de las alarmas no
 * cambian. Esta prueba lee el código de los lugares y prueba la lógica pura de los que la tienen.
 */
const RAIZ = path.resolve(__dirname, '..', '..', '..', '..');
const leer = (relativo: string) =>
  fs
    .readFileSync(path.join(RAIZ, relativo), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('dónde se pinta el nombre de un hábito', () => {
  it.each([
    ['Hoy (la tarjeta «Hábitos de hoy»)', 'screens/HoyScreen.tsx', /if \(habitoAhora\.titulo\) return tituloEnTipoOracion\(habitoAhora\.titulo\);/],
    ['Hoy (lo que dice el lector de pantalla)', 'screens/HoyScreen.tsx', /Abrir Training: \$\{tituloEnTipoOracion\(habitoAhora\.titulo\)\}/],
    ['Yo → «+ Subir foto»', 'screens/YoScreen.tsx', /titulo: tituloParaMostrar\(\{ id: track\.habitoId, title: track\.tituloHabito \}/],
    ['el elegir hábito para la foto', 'features/habits/components/ElegirHabitoParaFotoModal.tsx', /tituloParaMostrar\(\{ id: track\.habitoId/],
    ['la ficha del mentor (los 7 días)', 'features/mentor/screens/AlumnoScreen.tsx', /\{tituloEnTipoOracion\(o\.titulo\)\}/],
    ['la rejilla semanal del mentor', 'features/mentor/components/RejillaSemanal.tsx', /\{tituloEnTipoOracion\(titulo\)\}/],
    ['la ficha del líder (los 7 días)', 'features/lider-mentores/components/DiaDeLaPersona.tsx', /\{tituloEnTipoOracion\(obligacion\.titulo\)\}/],
    ['la ficha de Administración («Detalle de hábitos»)', 'features/admin/screens/FichaAprendizScreen.tsx', /\{tituloEnTipoOracion\(o\.titulo\)\}/],
    ['«Mi agenda»', 'features/eventos/utils/miAgenda.ts', /titulo: tituloEnTipoOracion\(h\.titulo\)/],
    ['el selector de hora', 'features/habits/components/HoraPickerModal.tsx', /\{tituloEnTipoOracion\(tituloHabito\)\}/],
    ['el aviso de cambiar el nombre', 'features/habits/components/AvisoRenombrarHabito.tsx', /\{tituloEnTipoOracion\(tituloHabito\)\}/],
  ])('%s', (_donde, archivo, patron) => {
    expect(leer(archivo)).toMatch(patron);
  });

  it('la ficha del mentor y Hoy, al menos, usan la misma función de habits/utils', () => {
    for (const archivo of ['features/mentor/screens/AlumnoScreen.tsx', 'screens/HoyScreen.tsx']) {
      expect(leer(archivo)).toMatch(/import \{[^}]*tituloEnTipoOracion[^}]*\} from '[^']*habits\/utils\/tituloEnTipoOracion'/);
    }
  });
});

describe('la lógica pura de los lugares que la tienen', () => {
  it('el pedido de foto del acompañante: el hábito en tipo oración, la acción del día tal cual', () => {
    expect(tituloDelPedido({ titulo: 'AGUA TIBIA CON LIMÓN', destino: 'habito' })).toBe('Agua tibia con limón');
    expect(tituloDelPedido({ titulo: 'LLAMAR A MI HIJO', destino: 'roca' })).toBe('LLAMAR A MI HIJO');
  });

  it('la agenda del día (tiempo libre): solo los bloques de HÁBITO; acciones, eventos y la agenda personal, tal cual', () => {
    expect(nombreDelBloque({ titulo: 'JUGO VERDE', tipo: 'HABITO' })).toBe('Jugo verde');
    expect(nombreDelBloque({ titulo: 'JUNTA CON EL EQUIPO', tipo: 'EVENTO' })).toBe('JUNTA CON EL EQUIPO');
    expect(nombreDelBloque({ titulo: null, tipo: 'AGENDA' })).toBe('Ocupado');
    expect(nombreDelBloque({ titulo: 'Despertar' })).toBe('Despertar');
  });

  it('lo que oye el lector de pantalla en la ficha del líder también va en tipo oración', () => {
    const dicho = dichoDeLaObligacion({ registroId: 'r', titulo: 'RITUAL TIERRA - AGUA - FUEGO (mañana)', estado: 'COMPLETADO', requiereEvidencia: false, entrega: null, evidencias: [], respuestaTexto: null, publicacionId: null } as never);
    expect(dicho.startsWith('Ritual tierra - agua - fuego (mañana).')).toBe(true);
  });
});

describe('lo que NO cambia: lo que se guarda, lo que se manda y las alarmas', () => {
  it('las alarmas siguen con el título del catálogo', () => {
    expect(leer('features/habits/notificaciones/recordatoriosDeHabito.ts')).not.toContain('tituloEnTipoOracion');
    expect(leer('features/training/components/PlanificarDimensionModal.tsx')).toMatch(/recordatorios\.programar\(claveUsuario, h\.habitoId, h\.title,/);
  });

  it('los esquemas de lo que llega del servidor no transforman el título', () => {
    for (const archivo of ['features/habits/api/habitsSchemas.ts', 'features/mentor/api/mentorSchemas.ts', 'features/lider-mentores/api/cumplimientoDelLiderSchemas.ts']) {
      expect({ archivo, usa: leer(archivo).includes('tituloEnTipoOracion') }).toEqual({ archivo, usa: false });
    }
  });
});
