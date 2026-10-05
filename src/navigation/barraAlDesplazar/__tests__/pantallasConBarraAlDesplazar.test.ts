/**
 * El dueño pidió «ocultar la barra al desplazar» en TODA la app (2026-10-02), no en una pantalla.
 * Esta prueba fija qué listas la usan: si una pantalla nueva o reescrita pierde el
 * `{...barraAlDesplazar}`, falla acá y no en la mano de alguien. Contra el código anterior falla
 * entera: ninguna pantalla usaba el hook.
 *
 * Y fija las que NO: la conversación abierta del chat (pantalla completa, sin barra) y las listas
 * horizontales (su `y` es siempre 0: con el hook, tocarlas mostraría la barra).
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '../../../..');
const leer = (archivo: string) => fs.readFileSync(path.join(RAIZ, archivo), 'utf8');
const usos = (fuente: string) => fuente.split('{...barraAlDesplazar}').length - 1;

/** Archivo → cuántas listas verticales con el comportamiento. */
const PANTALLAS: Record<string, number> = {
  'src/screens/HoyScreen.tsx': 1,
  'src/screens/PlanScreen.tsx': 3,
  'src/screens/TrainingScreen.tsx': 1,
  // Muro, Testimonios/Ranking, Classroom (catálogo, curso y lección) y Tribu.
  'src/screens/ComunidadScreen.tsx': 6,
  'src/features/eventos/components/SeccionEventos.tsx': 1,
  'src/screens/YoScreen.tsx': 11,
  // Administración
  'src/features/admin/screens/AdminInicioScreen.tsx': 1,
  'src/features/admin/screens/BienvenidaAdminScreen.tsx': 1,
  'src/features/admin/screens/CambiarDiaScreen.tsx': 1,
  'src/features/admin/screens/FichaAprendizScreen.tsx': 1,
  'src/features/admin/screens/GrupoDetalleScreen.tsx': 1,
  'src/features/admin/screens/GrupoFormScreen.tsx': 1,
  'src/features/admin/screens/GruposAdminScreen.tsx': 1,
  'src/features/admin/screens/GuiasRecepcionScreen.tsx': 1,
  'src/features/admin/screens/MasOpcionesScreen.tsx': 1,
  'src/features/admin/screens/PersonasAdminScreen.tsx': 1,
  'src/features/admin/screens/SemaforoAdminScreen.tsx': 1,
  'src/features/admin/screens/SemaforoGrupoAdminScreen.tsx': 1,
  'src/features/admin/screens/SolicitudesAdminScreen.tsx': 1,
  'src/features/admin/screens/StaffRolesScreen.tsx': 1,
  'src/features/caja/screens/CajaContenidoScreen.tsx': 1,
  'src/features/caja/screens/CajaDetalleScreen.tsx': 1,
  'src/features/caja/screens/CajaListaScreen.tsx': 1,
  'src/features/caja/screens/MiCajaScreen.tsx': 1,
  // Mentor y Líder de Mentores
  'src/features/mentor/screens/MiCelulaScreen.tsx': 1,
  'src/features/mentor/screens/AlumnoScreen.tsx': 1,
  'src/features/lider-mentores/components/MarcoDelLider.tsx': 1,
  'src/features/semaforo/screens/SemaforoScreen.tsx': 1,
  'src/features/semaforo/screens/SemaforoGruposScreen.tsx': 1,
  'src/features/tickets/screens/BandejaTicketsScreen.tsx': 1,
};

describe('pantallas con «ocultar la barra al desplazar»', () => {
  it.each(Object.entries(PANTALLAS))('%s usa el hook en sus listas', (archivo, cantidad) => {
    const fuente = leer(archivo);
    expect(fuente).toMatch(/const barraAlDesplazar = useOcultarBarraAlDesplazar\(/);
    expect(usos(fuente)).toBe(cantidad);
  });

  it('las sub-vistas de Plan, Yo y Comunidad devuelven la barra al cambiar', () => {
    expect(leer('src/screens/PlanScreen.tsx')).toMatch(/useOcultarBarraAlDesplazar\(\{ vista: activeSubView \}\)/);
    expect(leer('src/screens/YoScreen.tsx')).toMatch(/useOcultarBarraAlDesplazar\(\{ vista: activeView \}\)/);
    expect(leer('src/screens/ComunidadScreen.tsx')).toMatch(/vista: `\$\{seccionActiva\}/);
  });

  it('el encabezado de Comunidad se esconde con la barra en todas sus secciones (2026-10-02)', () => {
    const comunidad = leer('src/screens/ComunidadScreen.tsx');
    expect(comunidad).toMatch(/useOcultarBarraAlDesplazar\(\{\s*vista: [^\n]*\n\s*onScroll: encabezado\.alDesplazar,\s*\}\)/);
    // Cada lista con la barra deja arriba el lugar del encabezado, que va encima de ella.
    expect(comunidad.split('rellenoDelEncabezado,\n').length - 1).toBe(PANTALLAS['src/screens/ComunidadScreen.tsx']);
    expect(comunidad).toMatch(/alDesplazar=\{encabezado\.alDesplazar\}/);
    // Y las vistas de Eventos (lista, detalle, formulario, agenda) son otras listas: sin `vista`,
    // abrir un evento con la lista desplazada dejaba el encabezado escondido sobre un hueco (E-516).
    expect(leer('src/features/eventos/components/SeccionEventos.tsx')).toMatch(
      /useOcultarBarraAlDesplazar\(\{ onScroll: alDesplazar, vista: vista\.nombre \}\)/
    );
  });

  it('la conversación abierta del chat no la usa (va a pantalla completa, sin barra)', () => {
    const fuente = leer('src/screens/ComunidadScreen.tsx');
    const inicio = fuente.indexOf('onScroll={bajadaDelChat.alDesplazarse}');
    expect(inicio).toBeGreaterThan(0);
    const lista = fuente.slice(fuente.lastIndexOf('<FlatList', inicio), fuente.indexOf('/>', inicio));
    expect(lista).not.toContain('barraAlDesplazar');
  });

  it('ninguna lista horizontal la usa', () => {
    for (const archivo of Object.keys(PANTALLAS)) {
      const fuente = leer(archivo);
      const horizontales = fuente.split(/<(?:ScrollView|FlatList)\b/).slice(1).filter(t => /^\s*horizontal\b|\n\s*horizontal\b/.test(t.slice(0, t.indexOf('>'))));
      for (const t of horizontales) expect(t.slice(0, t.indexOf('>'))).not.toContain('barraAlDesplazar');
    }
  });
});
