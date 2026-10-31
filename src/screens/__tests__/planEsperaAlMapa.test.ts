/**
 * Plan → Objetivos espera al Mapa de Renacimiento (issue #37, 2026-10-27, decisión del dueño: «Bloqueemos objetivos
 * diciendo desde el inicio que debe hacer el Mapa»). La pantalla monta medio app (navegación, contextos, red), así que
 * acá se lee el código fuente sin comentarios y se comprueba QUÉ dibuja y desde dónde decide; la decisión y el aviso se
 * prueban aparte (`puertaDeObjetivos`, `usePuertaDeObjetivos`, `PuertaDelMapa`).
 *
 * Contra el código anterior falla: Objetivos ofrecía «Editar», el mes, la semana y las acciones sin mirar el Mapa.
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '..', '..');
const leer = (relativo: string) => fs.readFileSync(path.join(RAIZ, relativo), 'utf-8');

/** Sin comentarios de bloque (también `{/* … *\/}` de JSX) ni de línea (sin tocar `https://`). */
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const PLAN = sinComentarios(leer('screens/PlanScreen.tsx'));
const HOY = sinComentarios(leer('screens/HoyScreen.tsx'));

describe('Plan → Objetivos: decide con la puerta del Mapa', () => {
  it('lee el estado del Mapa de esta cuenta, y se vuelve a leer al abrir Objetivos o al volver del Mapa', () => {
    expect(PLAN).toMatch(/const \{ abrir: abrirMapa, abierto: mapaAbierto \} = useMapaRenacimientoAbierto\(\);/);
    expect(PLAN).toMatch(
      /const \{ puerta, reintentar: reintentarPuerta \} = usePuertaDeObjetivos\(\s*user\?\.id \?\? null,\s*mapaAbierto,?\s*\);/,
    );
  });

  it('con la puerta cerrada, Plan dibuja el aviso y no el selector de eje, el objetivo, la semana ni las acciones', () => {
    // Una sola rama: `puerta !== 'abierta'` → aviso; si no, todo lo del eje, en el mismo ScrollView (2026-10-31: Plan es una sola pantalla).
    const inicio = PLAN.indexOf("{puerta !== 'abierta' ? (");
    const separador = PLAN.indexOf(') : (', inicio);
    expect(inicio).toBeGreaterThan(0);
    expect(separador).toBeGreaterThan(inicio);
    const aviso = PLAN.slice(inicio, separador);
    const contenido = PLAN.slice(separador, PLAN.indexOf('</ScrollView>', separador));
    expect(aviso).toMatch(/<PuertaDelMapa puerta=\{puerta\} onHacerMapa=\{abrirMapa\} onReintentar=\{reintentarPuerta\} \/>/);
    for (const editable of ['<ControlSegmentado', '<TarjetaDelObjetivo', '<PlanDelEje']) {
      expect({ editable, enElAviso: aviso.includes(editable) }).toEqual({ editable, enElAviso: false });
      expect({ editable, enElContenido: contenido.includes(editable) }).toEqual({ editable, enElContenido: true });
    }
    // La cabecera («Plan» y «Tu dirección en 90 días») queda fuera de la rama: se ve con la puerta cerrada.
    expect(PLAN.indexOf('<ScreenHeader title="Plan" />')).toBeLessThan(inicio);
  });

  it('hay un solo scroll en Plan', () => {
    expect((PLAN.match(/<ScrollView/g) ?? []).length).toBe(2); // el de la pantalla y el de la hoja del objetivo
    const principal = PLAN.slice(0, PLAN.indexOf('<HojaDesdeAbajo'));
    expect((principal.match(/<ScrollView/g) ?? []).length).toBe(1);
  });

  it('sin Mapa, Plan no escribe «Toca cada una…»: las prioridades en lista se fueron con el formato nuevo', () => {
    expect(PLAN).not.toContain('Toca cada una para escribir tu objetivo.');
    expect(PLAN).not.toContain('Prioridades clave');
  });

  it('un rechazo `MAPA_PENDIENTE` muestra el mensaje del servidor y ofrece «Hacer mi Mapa»; los demás, como siempre', () => {
    expect(PLAN).toMatch(/const avisarGuardadoFallido = \(resultado: \{ mensaje: string; mapaPendiente: boolean \}\) =>/);
    expect(PLAN).toMatch(/Alert\.alert\('Primero tu Mapa de Renacimiento', resultado\.mensaje, \[/);
    expect(PLAN).toMatch(/text: 'Hacer mi Mapa',\s*onPress: \(\) => \{\s*setEditGoalModalVisible\(false\);\s*abrirMapa\(\);/);
    expect(PLAN).toMatch(/Alert\.alert\('No se pudo guardar', resultado\.mensaje\);/);
    // Los dos guardados (objetivo nuevo y avance) pasan por el mismo aviso.
    expect((PLAN.match(/avisarGuardadoFallido\(resultado\);/g) ?? []).length).toBe(2);
  });
});

describe('Hoy: lo dice desde el inicio, solo con texto', () => {
  it('la tarjeta del Mapa dice que de ahí nacen los objetivos', () => {
    expect(HOY).toContain('`Tu plan para ${lapsoDelMapa} empieza aquí: de este Mapa nacen tus objetivos. 15–20 min.`');
  });

  it('la tarjeta de acciones no manda a definirlo en Plan si el Mapa no está activo: dice que nace del Mapa y abre el Mapa', () => {
    // Desde el 2026-10-31 la tarjeta es `TarjetaAccionDeHoy` y qué muestra lo decide `vistaDeLaAccionDeHoy` (probada aparte).
    const TARJETA = sinComentarios(leer('features/home/components/TarjetaAccionDeHoy.tsx'));
    // Corregido 2026-10-31 (el dueño): sin Mapa es una fila compacta, del alto que tenía Coherencia / Racha.
    expect(TARJETA).toContain('Haz tu Mapa de Renacimiento');
    expect(TARJETA).toContain('De ahí nace tu objetivo de 90 días.');
    expect(TARJETA).toMatch(/onPress=\{alHacerElMapa\}/);
    expect(HOY).not.toContain('Define tu objetivo en Plan para sostener la dirección.');
    expect(HOY).toMatch(/alHacerElMapa=\{abrirMapa\}/);
  });

  it('el Mapa sigue opcional en Hoy: la tarjeta no se vuelve obligatoria ni tapa nada', () => {
    expect(HOY).toContain('const MAPA_DIA7_HABILITADO = mapaHabilitado();');
    expect(HOY).toMatch(/const mostrarMapa = MAPA_DIA7_HABILITADO && !!user;/);
    expect(HOY).toMatch(/<Presionable onPress=\{abrirMapa\}/);
  });
});

describe('La regla de si el Mapa está encendido es una sola', () => {
  it('Hoy y Plan la leen de `mapaHabilitado`, y nadie más la copia', () => {
    const archivos = [
      'screens/PlanScreen.tsx',
      'features/objetivos/hooks/usePuertaDeObjetivos.ts',
      'features/mapa-renacimiento/utils/mapaHabilitado.ts',
    ];
    const conLaVariable = archivos.filter(a => sinComentarios(leer(a)).includes('EXPO_PUBLIC_MAPA_DIA7'));
    expect(conLaVariable).toEqual(['features/mapa-renacimiento/utils/mapaHabilitado.ts']);
    expect(HOY).not.toContain('EXPO_PUBLIC_MAPA_DIA7');
  });
});
