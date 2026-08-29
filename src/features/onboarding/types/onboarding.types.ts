export type SexoOption = 'Masculino' | 'Femenino' | 'Otro';
export type EstadoCivilOption = 'Soltero(a)' | 'Casado(a)' | 'Conviviente' | 'Divorciado(a)' | 'Viudo(a)';

export interface FichaIdentidadData {
  nombre: string;
  sexo: SexoOption | '';
  estadoCivil: EstadoCivilOption | '';
  cantidadHijos: string;
  ocupacion: string;
  tipoNegocio: string;
  tipoDocumento: 'DNI' | 'Pasaporte' | 'Carné de extranjería' | string;
  numeroDocumento: string;
  fechaNacimiento: string;
  whatsapp: string;
  codigoPais?: string;
  email: string;
  pais: string;
  departamento?: string;
  ciudad: string;
  distrito?: string;
  direccion?: string;
  expectativa: string;
  temor: string;
}

export interface FichaSaludData {
  peso: string;
  estatura: string;
  horasSueno: string;
  calidadSueno: number; // 1 to 10
  condicionesSalud: string[];
  tomaMedicacionRegular: boolean;
  especificacionMedicacion: string;
  motivoMedicacion: string;
  objetivoSmartSalud: string;
}

export interface FichaConsentimientoData {
  autorizaUsoDatos: boolean;
  compromiso90Dias: boolean;
  dispuestoSoltar: string;
  firmaDigital: string;
}

export interface FichaInicialData {
  identidad: FichaIdentidadData;
  salud: FichaSaludData;
  consentimiento: FichaConsentimientoData;
}

// Legacy types for compatibility
export interface FichaCuerpoData {
  peso: string;
  estatura: string;
  horasSueno: string;
  calidadSueno: number;
  medicacion: string;
  smartCuerpo: string;
}

export interface FichaMenteData {
  pensamientoBoicot: string;
  criticoInterno: string;
  creenciaLimitante: string;
  definicionHoy: string;
  sinoCambio: string;
  quienQuieresSer: string;
}

export interface FichaAlmaData {
  fraseParental: string;
  vinculoPadre: number;
  vinculoMadre: number;
  fraseDineroInfancia: string;
  mereceDinero: number;
  porqueMerece: string;
}

export interface FichaNegocioData {
  metaFacturacion: string;
  producto: string;
  clienteIdeal: string;
  enemigoPublico: string;
  smartNegocio: string;
}

export interface FichaCompromisoData {
  porqueAhora: string;
  razonPrincipal: string;
  costoFracaso: string;
  dispuestoSoltar: string;
  compromisoFirmado: boolean;
}
