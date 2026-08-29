import { IconName } from '../../../components/Icon';
import { FichaInicialData } from '../types/onboarding.types';

export interface ChapterConfig {
  id: number;
  title: string;
  subtitle: string;
  icon: IconName;
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
    icon: 'body',
  },
  {
    id: 3,
    title: 'CONSENTIMIENTO Y COMPROMISO',
    subtitle: 'Capítulo 3 · Autorización de datos y decisión a 90 días',
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
