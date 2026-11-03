import { IconName } from '../../../components/Icon';
import { FichaInicialData } from '../types/onboarding.types';
import { PLAZO_POR_DEFECTO } from '../../objetivos/utils/nombreDelObjetivo';

export interface ChapterConfig {
  id: number;
  title: string;
  /** Una función del plazo si nombra el programa («Capítulo 3 · … decisión a 90 días»): es el de cada formación (issue #103). Se lee con `subtituloDelCapitulo`. */
  subtitle: string | ((plazo: string) => string);
  icon: IconName;
}

/** El subtítulo de un capítulo con el plazo del programa de la persona («90 días», «3 meses», «1 año»; sin plazo, el de siempre). */
export function subtituloDelCapitulo(capitulo: ChapterConfig, plazo: string = PLAZO_POR_DEFECTO): string {
  return typeof capitulo.subtitle === 'function' ? capitulo.subtitle(plazo) : capitulo.subtitle;
}

export const CHAPTERS_CONFIG: ChapterConfig[] = [
  {
    id: 1,
    title: 'IDENTIDAD Y FAMILIA',
    subtitle: 'Capítulo 1 · Perfil personal, familiar y profesional',
    icon: 'user',
  },
  {
    id: 2,
    title: 'DESCANSO Y SALUD',
    subtitle: 'Capítulo 2 · Horas de sueño, calidad y medicación',
    icon: 'activity',
  },
  {
    id: 3,
    title: 'CONSENTIMIENTO Y COMPROMISO',
    subtitle: plazo => `Capítulo 3 · Autorización de datos y decisión a ${plazo}`,
    icon: 'spark',
  },
];

export const INITIAL_FICHA_DATA: FichaInicialData = {
  identidad: {
    nombre: '',
    sexo: '',
    estadoCivil: '',
    cantidadHijos: '0',
    ocupacion: '',
    tipoNegocio: '',
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    fechaNacimiento: '',
    whatsapp: '',
    codigoPais: '+51',
    email: '',
    pais: 'Perú',
    departamento: 'Lima',
    ciudad: 'Lima Metropolitana',
    distrito: 'Miraflores',
    direccion: '',
    expectativa: '',
    temor: '',
  },
  salud: {
    peso: '',
    estatura: '',
    horasSueno: '7.5',
    calidadSueno: 7,
    condicionesSalud: [],
    tomaMedicacionRegular: false,
    especificacionMedicacion: '',
    motivoMedicacion: '',
    objetivoSmartSalud: '',
  },
  consentimiento: {
    autorizaUsoDatos: false,
    compromiso90Dias: false,
    dispuestoSoltar: '',
    firmaDigital: '',
  },
};
