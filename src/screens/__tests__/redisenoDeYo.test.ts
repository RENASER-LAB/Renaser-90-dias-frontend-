import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Rediseño de Yo y del Centro de Perfil y Ajustes (aprobado por el dueño el 2026-10-05; mosaico
 * `trainingyo-iconos-inventario.png`, filas de Yo y Ajustes, y las decisiones 10, 12 y 14).
 *
 * Se lee el código sin comentarios, como `yoSinAdorno` y `textosVerdaderosDeYo`: el comentario que
 * cuenta qué había antes puede nombrarlo; lo que no puede es volver. Contra el código anterior falla
 * cada bloque: había dos «Cerrar sesión», «Eliminar mi cuenta» era un enlace en Yo, los títulos
 * decían «FASE 1:…», cada sub-vista tenía «← VOLVER A AJUSTES», los éxitos eran diálogos con 🦅, el
 * Pacto firmado mostraba el lienzo otra vez y los interruptores eran `Switch` con colores a mano.
 */
const SRC = path.resolve(__dirname, '..', '..');
const sinComentarios = (texto: string) =>
  texto
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
const leer = (relativo: string) => sinComentarios(fs.readFileSync(path.join(SRC, relativo), 'utf-8'));
const yo = leer('screens/YoScreen.tsx');

describe('una sola de cada cosa (decisión 10)', () => {
  it('«Cerrar sesión» está una vez: en Ajustes, al final, en rojo y sin «›»', () => {
    expect(yo.match(/onPress=\{logout\}/g)).toHaveLength(1);
    expect(yo).toMatch(/titulo="Cerrar sesión"\s+peligro\s+sinChevron\s+onPress=\{logout\}/);
    expect(yo).not.toContain('CERRAR SESIÓN');
  });

  it('«Eliminar mi cuenta» es una fila roja de Ajustes, no un enlace subrayado en Yo', () => {
    expect(yo.match(/setEliminandoCuenta\(true\)/g)).toHaveLength(1);
    expect(yo).toMatch(/titulo="Eliminar mi cuenta"\s+peligro\s+onPress=\{\(\) => setEliminandoCuenta\(true\)\}/);
    expect(yo).not.toContain("textDecorationLine: 'underline'");
    // Va en el último grupo de Ajustes, junto a cerrar sesión.
    const ultimoGrupo = yo.slice(yo.lastIndexOf('<GrupoDeAjustes>'));
    expect(ultimoGrupo).toContain('titulo="Eliminar mi cuenta"');
    expect(ultimoGrupo).toContain('titulo="Cerrar sesión"');
  });
});

describe('Ajustes estilo iOS', () => {
  /* > **Corregido 2026-10-06 (D-245).** Esperaba solo Perfil, Tu proceso, Herramientas y
     > Preferencias. Se suma «Legal», con la Política de Privacidad, antes del grupo rojo. */
  it('los grupos se llaman Perfil, Tu proceso, Herramientas, Preferencias y Legal (decisión 14, D-245)', () => {
    const titulos = [...yo.matchAll(/<GrupoDeAjustes titulo="([^"]+)">/g)].map(m => m[1]);
    expect(titulos).toEqual(['Perfil', 'Tu proceso', 'Herramientas', 'Preferencias', 'Legal']);
    expect(yo).not.toMatch(/FASE \d:/);
  });

  it('las filas son `FilaDeAjuste` (sin el borde inferior sin color que dibujaba la línea negra)', () => {
    expect(yo).not.toContain('menuOptionRow');
    expect(yo).not.toContain('groupedBox');
  });

  /* > **Corregido 2026-10-05.** La lista incluía `signature`, el ícono de la fila «Mi ficha y Pacto» de
     > Yo. Esa fila se quitó (pedido del dueño: abría lo mismo que «Mi onboarding» de Ajustes; ver
     > `unaSolaEntradaAlOnboarding.test.ts`). El ícono queda en `Icon.tsx`, sin uso. */
  it('cada fila con su ícono del inventario', () => {
    for (const icono of ['user', 'idCard', 'listChecks', 'images', 'compass', 'bell', 'alarmClock', 'trash', 'logout', 'package', 'lifeBuoy']) {
      expect(yo).toContain(`icono="${icono}"`);
    }
    // «Lo que SER recuerda» con la cara de SER, no con el cerebro de «Mente». Corregido 2026-10-06: era el orbe
    // (`OrbeQuieto`); ahora el fénix de SER (pedido del dueño).
    expect(yo).toMatch(/baldosa=\{<FenixDeSerQuieto /);
    for (const viejo of ['"stack"', '"brain"', '"heart"', '"clock"', '"spark"']) expect(yo).not.toContain(`name=${viejo}`);
  });

  it('los interruptores son `Interruptor`, no `Switch` con colores a mano', () => {
    for (const archivo of ['screens/YoScreen.tsx', 'features/alarmas/components/InterruptoresDeAvisos.tsx', 'features/alarmas/components/SeccionAlarmas.tsx']) {
      const codigo = leer(archivo);
      expect(codigo).not.toMatch(/<Switch\b/);
      expect(codigo).not.toMatch(/#332C20|thumbColor|trackColor/);
    }
    expect(yo).toMatch(/accesorio=\{<Interruptor valor=\{mode === 'dark'\} onCambiar=\{toggle\} etiqueta="Modo oscuro" \/>\}/);
  });
});

describe('Política de privacidad (D-245)', () => {
  it('es una fila de Ajustes en «Legal», con «›», que abre la página pública', () => {
    const legal = yo.slice(yo.indexOf('<GrupoDeAjustes titulo="Legal">'), yo.lastIndexOf('<GrupoDeAjustes>'));
    expect(legal).toMatch(/icono="lock"\s+titulo="Política de privacidad"\s+detalle="Qué datos guardamos y para qué"\s+onPress=\{\(\) => void abrirPoliticaDePrivacidad\(\)\}/);
    expect(legal).not.toContain('sinChevron');
  });
});

describe('volver: una sola forma', () => {
  it('las sub-vistas usan la cabecera «‹ título» de `CabeceraAdmin`, y Yo, el engranaje', () => {
    expect(yo).toMatch(/<CabeceraAdmin titulo=\{TITULO_DE_VISTA\[activeView\]\} onVolver=\{volver\} \/>/);
    expect(yo).not.toMatch(/VOLVER A/);
    expect(yo).not.toContain('detailTopBar');
    expect(yo).not.toContain('categoryPillBadge');
  });

  it('el gesto del sistema vuelve al mismo lugar que la «‹»', () => {
    expect(yo).toMatch(/useSystemBackHandler\(\(\) => \{\s*if \(!regreso\) return false;\s*setActiveView\(regreso\);/);
  });
});

describe('avisos y textos', () => {
  it('los éxitos son una línea con háptico, no un diálogo con emoji', () => {
    for (const viejo of ["Alert.alert('¡Pacto sellado!", "Alert.alert('Perfil guardado'", "Alert.alert('Información guardada'", "Alert.alert('Foto actualizada'", "'Evidencia registrada'"]) {
      expect(yo).not.toContain(viejo);
    }
    expect(yo).not.toMatch(/🦅|📷/);
    expect(yo).toContain('<ConfirmacionEnLinea');
    expect(yo).toMatch(/const confirmar = useCallback\(\(texto: string, vista: VistaDeYo\) => \{\s*tacto\.logro\(\);/);
    // Los errores siguen en diálogo.
    expect(yo).toContain("Alert.alert('No se pudo guardar'");
  });

  it('sin versales en botones, rótulos y campos', () => {
    for (const viejo of ['MI FICHA INICIAL', 'TUVE UNA EMERGENCIA', 'NOMBRE COMPLETO:', 'CORREO ELECTRÓNICO:', 'BIOGRAFÍA SOMÁTICA:', 'DEPARTAMENTO / ÁREA:', 'GUARDAR CAMBIOS', 'GUARDAR INFORMACIÓN', 'SELLAR MI COMPROMISO', 'ACTO FUNDACIONAL', 'FIRMA DIGITAL REGISTRADA', 'Cambiar Foto']) {
      expect(yo).not.toContain(viejo);
    }
  });
});

describe('el Pacto ya firmado (decisión 12)', () => {
  it('se muestra en solo lectura, con la fecha, sin lienzo ni «Sellar»', () => {
    const pacto = yo.slice(yo.indexOf("activeView === 'pacto' && ("), yo.indexOf("activeView === 'evidencias' && ("));
    expect(pacto).toMatch(/\{pactoYaFirmado \? \(\s*<PactoFirmado firmadoEn=\{etapasOnboarding\.pactoFirmadoEn\} \/>\s*\) : \(/);
    // El lienzo y el botón de sellar viven solo en la rama de «todavía no firmó».
    const sinFirmar = pacto.slice(pacto.indexOf('<PactoFirmado'));
    expect(sinFirmar).toContain('<SignatureCanvas');
    expect(sinFirmar).toContain('onPress={sellarPacto}');
    expect(pacto.indexOf('<SignatureCanvas')).toBeGreaterThan(pacto.indexOf('<PactoFirmado'));
  });
});

describe('El Método', () => {
  it('se desliza con el dedo, sin el giro 3D del `Animated` de React Native', () => {
    expect(yo).toContain('<MetodoEnPaginas fases={METODO_FASES} margenLateral={horizontalPadding} />');
    expect(yo).not.toMatch(/Animated\.(timing|sequence|Value)|rotateY|useNativeDriver/);
  });

  it('sin colores pastel a mano', () => {
    const contenido = yo.slice(yo.indexOf('const CONTENIDO_DEL_METODO'), yo.indexOf('const METODO_FASES'));
    expect(contenido).not.toMatch(/#[0-9A-Fa-f]{6}/);
    expect(contenido).not.toContain("'heart'");
  });
});
