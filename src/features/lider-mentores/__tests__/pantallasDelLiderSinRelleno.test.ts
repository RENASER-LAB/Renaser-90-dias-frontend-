import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Las pantallas del líder (spec 056) hablan con cifras, nombres, estados y botones: ni textos de ayuda ni párrafos de relleno (FR-045), en español de Perú
 * con tuteo y en tipo oración (AGENTS.md, regla 6), sin emojis como íconos (regla 1), sin «90 días» escrito a mano (regla 7) y con el `Alert` de la app y no
 * el de `react-native` (que en la web no hace nada, E-144). Es la guarda de lo que se repite (regla 10): las pantallas y piezas nuevas del líder se revisan
 * aquí; si falla, el mensaje dice qué línea y cómo se arregla.
 */
const RAIZ = path.resolve(__dirname, '..', '..', '..', '..');
/** Lo nuevo de la 056. Lo anterior del líder (la ficha de la persona de Administración, «Hábitos de todos»…) no cambia en esta spec. */
const NUEVAS = [
  'screens/MisMentoresScreen.tsx',
  'screens/LiderMentoresScreen.tsx',
  'screens/FichaDelMentorScreen.tsx',
  'screens/FichaDelAprendizDelLider.tsx',
  'screens/GrupoDelLiderScreen.tsx',
  'screens/GruposDelLiderScreen.tsx',
  'screens/CrearGrupoScreen.tsx',
  'screens/ConsultasDelLiderScreen.tsx',
  'screens/ReporteScreen.tsx',
  'components/AnilloDeCupo.tsx',
  'components/BarraDeColores.tsx',
  'components/BotonDeEstrella.tsx',
  'components/ComoMentor.tsx',
  'components/ContadoresPorColor.tsx',
  'components/EstadoConForma.tsx',
  'components/FilaDeMentorConCupo.tsx',
  'components/FilaPorResolver.tsx',
  'components/HojaDeTexto.tsx',
  'components/HojaElegirMentor.tsx',
  'components/HojaProgramarSesion.tsx',
  'components/HojaSumarAprendices.tsx',
  'components/LecturaFallida.tsx',
  'components/ListaDeAprendicesParaElegir.tsx',
  'components/ListaDeMentoresParaElegir.tsx',
];

const sinComentarios = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
const FUENTES = NUEVAS.map(archivo => {
  const ruta = path.join(RAIZ, 'src/features/lider-mentores', archivo);
  return { archivo, texto: fs.existsSync(ruta) ? sinComentarios(fs.readFileSync(ruta, 'utf8')) : '' };
});

/** Los textos entre comillas simples o invertidas con letras (no claves, rutas ni colores), con su línea. */
function textos(texto: string): Array<{ linea: number; valor: string }> {
  const salida: Array<{ linea: number; valor: string }> = [];
  texto.split('\n').forEach((l, i) => {
    for (const m of l.matchAll(/'([^'\n]{3,})'|`([^`\n]{3,})`/g)) salida.push({ linea: i + 1, valor: (m[1] ?? m[2]).replace(/\$\{[^}]*\}/g, '') });
    for (const m of l.matchAll(/>\s*([^<>{}\n]{3,}?)\s*</g)) salida.push({ linea: i + 1, valor: m[1] });
  });
  return salida.filter(t => /\p{L}{3}/u.test(t.valor) && !/^[./@#]|\.(tsx?|json)$|^[a-z]+(-[a-z]+)+$|^[a-zA-Z]+$/.test(t.valor));
}

describe('las pantallas y piezas nuevas del líder (spec 056)', () => {
  it('el barrido encuentra los archivos (si no, no vigila nada)', () => {
    const vacios = FUENTES.filter(f => f.texto === '').map(f => f.archivo);
    expect(vacios).toEqual([]);
  });

  it('no escriben textos de ayuda: ninguno empieza con «Toca», «Aquí», «Desliza», «Recuerda»… (FR-045)', () => { // spec 056 FR-045
    const AYUDA = /^(Toca |Toque |Aquí |Aqui |Desliza |Recuerda |Recuerde |Puedes |Pulsa |Aprieta |Usa este|Usa esta|Sirve para|Esta pantalla|Este botón|Esta sección)/;
    const malos = FUENTES.flatMap(f => textos(f.texto).filter(t => AYUDA.test(t.valor)).map(t => `${f.archivo}:${t.linea} «${t.valor}» → es ayuda: se quita; la pantalla dice cifras, nombres y botones`));
    expect(malos).toEqual([]);
  });

  it('no escriben párrafos de relleno: un texto de más de 14 palabras solo es un motivo o un rechazo (FR-045)', () => { // spec 056 FR-045
    const MOTIVO = /^(No se pudo|No pudimos|Revisa|Hay personas|Hoy no hay|Tu cuenta|Esta persona|Ese |Lo que|Pero |Entraron|Elige|Vuelve|Escribe|El grupo|Le avisaste|Le recordaste|Respondiste|Sesión programada|Las acciones|Los datos)/;
    const malos = FUENTES.flatMap(f =>
      textos(f.texto)
        .filter(t => t.valor.trim().split(/\s+/).length > 14 && !MOTIVO.test(t.valor.trim()))
        .map(t => `${f.archivo}:${t.linea} «${t.valor.slice(0, 60)}…» → demasiado largo para una pantalla de cifras: acórtalo o quítalo`),
    );
    expect(malos).toEqual([]);
  });

  it('no usan voseo: tuteo siempre (regla 6)', () => { // spec 056 FR-045
    const VOSEO = /(?<!\p{L})(Pedí|Revisá|Tocá|Escribí|Elegí|Intentá|Probá|Volvé|Ingresá|Esperá|Usá|Abrí|Cerrá|Mirá|Hacé|Decí|Poné|Andá|Vení|Contá|Buscá|Activá|Confirmá|Completá|Guardá|Agregá|tenés|podés|querés|sabés)(?!\p{L})/u;
    const malos = FUENTES.flatMap(f => textos(f.texto).filter(t => VOSEO.test(t.valor)).map(t => `${f.archivo}:${t.linea} «${t.valor}» → pásalo a tuteo`));
    expect(malos).toEqual([]);
  });

  it('los rótulos van en tipo oración, no en mayúsculas sostenidas (regla 4)', () => { // spec 056 FR-045
    const malos = FUENTES.flatMap(f =>
      textos(f.texto)
        .filter(t => t.valor.includes(' ') && t.valor.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '').length >= 6 && t.valor === t.valor.toUpperCase())
        .map(t => `${f.archivo}:${t.linea} «${t.valor}» → ponlo en tipo oración`),
    );
    expect(malos).toEqual([]);
  });

  it('no usan emojis como íconos ni «90 días» escrito a mano (reglas 1 y 7)', () => { // spec 056 FR-045
    const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u;
    const NOVENTA = /\b90\s*d[ií]as?\b|\bnoventa\b|\bd[ií]a\s*90\b/i;
    const malos = FUENTES.flatMap(f =>
      f.texto
        .split('\n')
        .map((l, i) => ({ l, i }))
        .filter(({ l }) => (EMOJI.test(l) && !/[✓×·°]/.test(l.replace(EMOJI, ''))) || NOVENTA.test(l))
        .map(({ i }) => `${f.archivo}:${i + 1} → sin emojis ni «90 días» a mano`),
    );
    expect(malos).toEqual([]);
  });

  it('los diálogos son los de la app (`Alert` de components/Alerta), no los de react-native (E-144)', () => { // spec 056 FR-042
    const malos = FUENTES.filter(f => /import\s*\{[^}]*\bAlert\b[^}]*\}\s*from\s*'react-native'/.test(f.texto)).map(f => `${f.archivo} → importa Alert de react-native: usa components/Alerta`);
    expect(malos).toEqual([]);
  });

  it('los colores salen del tema: ningún color escrito a mano (#rrggbb o rgb()) en las pantallas nuevas (regla 4)', () => { // spec 056 FR-043
    const malos = FUENTES.flatMap(f =>
      f.texto
        .split('\n')
        .map((l, i) => ({ l, i }))
        .filter(({ l }) => /['"`]#[0-9a-fA-F]{3,8}['"`]|rgba?\(/.test(l))
        .map(({ i }) => `${f.archivo}:${i + 1} → el color sale de useTheme()`),
    );
    expect(malos).toEqual([]);
  });
});
