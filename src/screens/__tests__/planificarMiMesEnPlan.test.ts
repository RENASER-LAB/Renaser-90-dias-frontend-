/**
 * «Planificar mi mes» en Plan (spec 028, FR-014 a FR-016). La pantalla monta medio app, así que —igual que `planEsperaAlMapa`— se lee el
 * código sin comentarios y se comprueba DÓNDE está el botón y la hoja; lo que hacen se prueba aparte (`planDelMes`, `botonPlanificarMes`,
 * `planDelEje`).
 */
import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const RAIZ = path.resolve(__dirname, '..', '..');
const leer = (relativo: string) => fs.readFileSync(path.join(RAIZ, relativo), 'utf-8');
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}
const PLAN = sinComentarios(leer('screens/PlanScreen.tsx'));

describe('Plan: «Planificar mi mes»', () => {
  const inicio = PLAN.indexOf("{puerta !== 'abierta' ? (");
  const separador = PLAN.indexOf(') : (', inicio);
  const aviso = PLAN.slice(inicio, separador);
  const contenido = PLAN.slice(separador, PLAN.indexOf('</ScrollView>', separador));

  it('el botón vive solo con la puerta del Mapa abierta: con el Mapa sin activar Plan no lo ofrece', () => {
    expect(aviso).not.toContain('<BotonPlanificarMes');
    expect(contenido).toContain('<BotonPlanificarMes');
  });

  it('va debajo del objetivo de 90 días y arriba del resto de lo de la semana', () => {
    const objetivo = contenido.indexOf('<TarjetaDelObjetivo');
    const boton = contenido.indexOf('<BotonPlanificarMes');
    const semana = contenido.indexOf('<PlanDelEje');
    expect(objetivo).toBeGreaterThan(-1);
    expect(boton).toBeGreaterThan(objetivo);
    expect(semana).toBeGreaterThan(boton);
  });

  it('muestra el mes en curso del programa (y ninguno mientras `/home` no llegó) y abre la hoja', () => {
    // El mes en curso se cuenta con la duración del programa de la persona: 12 meses en 365 días (E2E de las formaciones, J2-6).
    expect(PLAN).toMatch(
      /<BotonPlanificarMes mesEnCurso=\{resumen \? etiquetaDelMes\(mesDe\(diaPrograma, undefined, resumen\?\.duracionDias\), resumen\?\.duracionDias\) : null\} onPress=\{\(\) => setPlanificandoMes\(true\)\} \/>/,
    );
  });

  it('la hoja recibe el eje abierto, el día del programa, las maestras y el MISMO plan mensual que la tarjeta (una sola lectura)', () => {
    const hoja = PLAN.slice(PLAN.indexOf('<PlanDelMesModal'), PLAN.indexOf('/>', PLAN.indexOf('<PlanDelMesModal')));
    expect(hoja).toContain('visible={planificandoMes}');
    expect(hoja).toContain('alCerrar={() => setPlanificandoMes(false)}');
    expect(hoja).toContain('eje={ejeAbierto}');
    expect(hoja).toContain('diaPrograma={diaPrograma}');
    expect(hoja).toContain('duracionDias={resumen?.duracionDias}');
    expect(hoja).toContain('maestras={objetivos.rocas}');
    expect(hoja).toContain('planMensual={planMensual}');
    expect((PLAN.match(/usePlanMensual\(\)/g) ?? []).length).toBe(1);
  });

  it('tocar la semana de ahora le pide a `PlanDelEje` abrir «Organizar mi semana» (un contador, no un callback del hijo)', () => {
    expect(PLAN).toContain('onOrganizarSemana={() => setPedidoDeOrganizar(n => n + 1)}');
    expect(PLAN).toContain('pedidoDeOrganizar={pedidoDeOrganizar}');
  });

  it('no suma otro scroll a Plan ni toca el formulario del objetivo del mes de siempre', () => {
    expect((PLAN.match(/<ScrollView/g) ?? []).length).toBe(2);
    expect(PLAN).toContain('<EditarObjetivoDelMesModal');
    expect(PLAN).toContain('const [editandoMes, setEditandoMes] = useState(false);');
  });
});
