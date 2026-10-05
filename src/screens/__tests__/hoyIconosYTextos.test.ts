/**
 * Hoy después del inventario de íconos (rediseño aprobado por el dueño el 2026-10-05). Se lee el código
 * fuente sin comentarios —Hoy monta medio app (voz, semáforo, mentor, administración)—; acá importa QUÉ
 * dibuja.
 *
 * Contra el código anterior falla: los puntos llevaban `zap` y «PTS», Coherencia la diana `target`, la
 * racha `fire` a 14, el Mapa el asterisco `spark` y un `GoldCircle`, «Hábitos de hoy» el `sun`, el autor
 * de la evidencia un `user` fijo y la foto una `camera`; los rótulos iban en versales («COHERENCIA»,
 * «RACHA ACTUAL», «DÍAS», «TU ACOMPAÑANTE», «DÍA n DE 90»), la fecha del evento era
 * `toLocaleString('es-ES', { dateStyle: 'short' })`, las tarjetas eran `Pressable` sin respuesta al
 * dedo, los chevrons iban a 14 y el orbe no vibraba.
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

const HOY = sinComentarios(leer('screens/HoyScreen.tsx'));
/** Los nombres de ícono que dibuja un archivo (`name="…"`). */
const iconos = (codigo: string) => [...codigo.matchAll(/<Icon\s+name="(\w+)"/g)].map(m => m[1]);

describe('Hoy: íconos', () => {
  it('ninguna de las metáforas equivocadas del inventario', () => {
    const usados = iconos(HOY);
    for (const viejo of ['zap', 'target', 'fire', 'spark', 'sun', 'user', 'camera', 'arrow']) {
      expect({ viejo, usado: usados.includes(viejo) }).toEqual({ viejo, usado: false });
    }
    expect(HOY).not.toMatch(/GoldCircle/);
  });

  it('los nuevos: medidor, llama, mapa, lista con tildes, imagen; el autor con foto o iniciales', () => {
    const usados = iconos(HOY);
    for (const nuevo of ['gauge', 'flame', 'map', 'listChecks', 'image', 'calendar']) {
      expect({ nuevo, usado: usados.includes(nuevo) }).toEqual({ nuevo, usado: true });
    }
    expect(HOY).toMatch(/<AvatarPersona[\s\S]*?avatarUrl=\{ultimaPublicacion\.authorAvatarUrl\}/);
  });

  it('los chevrons de «entrar» van a 16 (ninguno a 14) y los íconos a 16, 20 o 24', () => {
    expect(HOY).not.toMatch(/name="chevron" size=\{14\}/);
    const tamanos = [...HOY.matchAll(/<Icon\s+name="\w+"\s+size=\{([^}]+)\}/g)].map(m => m[1]);
    expect(tamanos.length).toBeGreaterThan(8);
    for (const t of tamanos) expect(['TAMANO_ICONO.chico', 'TAMANO_ICONO.normal', 'TAMANO_ICONO.grande']).toContain(t);
  });

  it('Icon.tsx tiene el bloque de Hoy, en caja de 24, y sus nombres en el tipo', () => {
    const icon = leer('components/Icon.tsx');
    expect(icon).toMatch(/\/\* Hoy \*\//);
    const bloque = icon.slice(icon.indexOf('/* Hoy */'), icon.indexOf("case 'chevron':"));
    for (const nombre of ['gauge', 'map', 'listChecks', 'flame', 'flag']) {
      expect(bloque).toContain(`case '${nombre}':`);
      expect(icon).toMatch(new RegExp(`\\| '${nombre}'`));
    }
    expect(bloque).not.toMatch(/\{\.\.\.s\}/);
  });
});

describe('Hoy: textos en tipo oración', () => {
  it('sin versales espaciadas en el encabezado, las métricas y el orbe', () => {
    for (const viejo of ['COHERENCIA', 'RACHA ACTUAL', '>DÍAS<', 'TU ACOMPAÑANTE', 'PROGRAMA ACTIVO', ' PTS', 'DÍA {', 'toUpperCase()']) {
      expect({ viejo, esta: HOY.includes(viejo) }).toEqual({ viejo, esta: false });
    }
    expect(HOY).toMatch(/Día \{diaConocido \?\? '—'\} de \{DIAS_DEL_PROGRAMA\}/);
    expect(HOY).toMatch(/\{puntosLiga\} pts/);
    expect(HOY).toMatch(/>\s*Tu acompañante\s*</);
  });

  it('la fecha del próximo evento ya no es la corta del sistema («5/10/26, 20:00»)', () => {
    expect(HOY).not.toMatch(/dateStyle: 'short'/);
    expect(HOY).toMatch(/cuandoEsElEvento\(resumen\.proximoEvento\.iniciaEn\)/);
  });

  it('la foto de la evidencia se cuenta como foto, no como «evidencia»', () => {
    expect(HOY).toMatch(/' foto' : ' fotos'/);
    expect(HOY).not.toMatch(/' evidencia' : ' evidencias'/);
  });
});

describe('Hoy: tacto', () => {
  it('las tarjetas de Hoy responden al dedo (Presionable): mapa, hábitos, acciones, evidencia y evento', () => {
    const tarjetas = [...HOY.matchAll(/<Presionable\b/g)].length;
    expect(tarjetas).toBeGreaterThanOrEqual(5);
  });

  it('el orbe vibra al empezar a escuchar y al cerrar la conversación manteniéndolo', () => {
    expect(HOY).toMatch(/if \(tocarEmpiezaAEscuchar\(voz\.fase, voz\.disponible\)\) tacto\.seleccion\(\);\s*voz\.tocar\(\);/);
    expect(HOY).toMatch(/tacto\.mantener\(\);\s*terminarConversacion\(\);/);
    expect(HOY).toMatch(/onTocar=\{tocarOrbe\}\s*onMantener=\{mantenerOrbe\}/);
  });

  it('la tarjeta del semáforo y el Código Renaser también', () => {
    expect(sinComentarios(leer('features/semaforo/components/TarjetaSemaforoHoy.tsx'))).toMatch(/<Presionable/);
    expect(sinComentarios(leer('features/radar/components/TarjetaCodigoRenaser.tsx'))).toMatch(/<Presionable/);
  });
});

describe('el chat de SER (cabecera y vacío)', () => {
  const PANEL = sinComentarios(leer('features/renasia/screens/RenasiaPanel.tsx'));

  it('SER se presenta con su orbe, en la cabecera y en el vacío; Sparkie conserva su globo', () => {
    const orbes = [...PANEL.matchAll(/agent === 'COMPANION' \? \(\s*<OrbeQuieto size=\{(\d+)\}/g)].map(m => Number(m[1]));
    expect(orbes).toEqual([38, 64]);
  });

  it('cerrar es un ✕ de 24 en 44, sin disco', () => {
    expect(PANEL).toMatch(/<Icon name="close" size=\{TAMANO_ICONO\.grande\}/);
    expect(PANEL).toMatch(/cerrarBtn: \{\s*width: 44,\s*height: 44,/);
  });

  it('sin versales y con el campo en un renglón en la web (como el chat de Comunidad)', () => {
    expect(PANEL).not.toMatch(/REINTENTAR|VER MENSAJES ANTERIORES/);
    const campo = PANEL.slice(PANEL.indexOf('<TextInput'));
    expect(campo.slice(0, campo.indexOf('/>'))).toMatch(/\{\.\.\.propsDelCampoDelChat\(\)\}/);
  });

  it('la propuesta de SER lleva su orbe y los botones en tipo oración', () => {
    const hoja = sinComentarios(leer('features/renasia/components/AccionDelAcompanante.tsx'));
    expect(iconos(hoja)).not.toContain('spark');
    expect(hoja).toMatch(/<OrbeQuieto size=\{TAMANO_ICONO\.normal\}/);
    for (const texto of ['CANCELAR', 'CONFIRMAR', 'TOMAR FOTO']) expect(hoja).not.toContain(texto);
    for (const texto of ['"Cancelar"', '"Confirmar"', '"Tomar foto"']) expect(hoja).toContain(texto);
  });
});
