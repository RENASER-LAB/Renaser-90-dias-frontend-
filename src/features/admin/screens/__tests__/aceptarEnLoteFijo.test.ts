import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

const fuente = fs.readFileSync(path.resolve(__dirname, '../SolicitudesAdminScreen.tsx'), 'utf8');

/**
 * E2E de las formaciones (01/11/2026): «Aceptar N solicitudes» estaba al final de la lista de pendientes. Con 17 pendientes, después de marcar tres
 * arriba había que desplazar toda la lista para encontrar el botón. Va fijo abajo, fuera de lo que se desliza, y sin meterse debajo del botón de SER.
 */
describe('«Aceptar N solicitudes» queda fijo abajo mientras se elige', () => {
  it('el botón está después del ScrollView y no adentro', () => {
    const finDeLaLista = fuente.indexOf('</ScrollView>');
    const boton = fuente.indexOf("'Marca a quién aceptar'");
    expect(finDeLaLista).toBeGreaterThan(0);
    expect(boton).toBeGreaterThan(finDeLaLista);
  });

  it('solo existe mientras se está seleccionando en «Pendientes» y se corre lo justo para no quedar bajo el botón flotante de SER', () => {
    expect(fuente).toMatch(/seleccionando && vista === 'PENDING' \? \(\s*<View style=\{\[estilos\.barraDeAceptar/);
    expect(fuente).toContain('entradaParaElLanzador(horizontalPadding)');
  });

  it('no se repite dentro de la lista', () => {
    expect(fuente.match(/Marca a quién aceptar/g)).toHaveLength(1);
  });
});
