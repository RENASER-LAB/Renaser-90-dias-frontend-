import { API_CONFIG } from '../config/apiConfig';
import { ALL_WORLD_PHONE_COUNTRIES } from './phoneCountriesService';

export interface CountryOption {
  name: string;
  flag: string;
  iso: string;
  apiName: string;
}

export interface GooglePlaceResult {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  pais: string;
  departamento: string;
  ciudad: string;
  distrito: string;
}

export interface DetectedLocation {
  pais: string;
  departamento: string;
  ciudad: string;
  distrito: string;
  codigoPais: string;
  iso: string;
  flag: string;
}

// 100% Instant In-Memory Dataset for Countries (0ms, 0 Lag)
export const ALL_WORLD_COUNTRIES: CountryOption[] = ALL_WORLD_PHONE_COUNTRIES.map(c => ({
  name: c.name,
  flag: c.flag,
  iso: c.iso,
  apiName: c.name,
}));

// Instant In-Memory States / Departments Database (0ms Latency)
const INSTANT_STATES_MAP: Record<string, string[]> = {
  Perú: [
    'Arequipa', 'Lima', 'Cusco', 'La Libertad', 'Piura', 'Lambayeque', 'Junín',
    'Ancash', 'Ica', 'Cajamarca', 'Puno', 'Loreto', 'San Martín', 'Huánuco',
    'Tacna', 'Ayacucho', 'Ucayali', 'Moquegua', 'Tumbes', 'Amazonas', 'Apurímac',
    'Huancavelica', 'Madre de Dios', 'Pasco', 'Callao'
  ],
  Bolivia: [
    'Santa Cruz', 'La Paz', 'Cochabamba', 'Chuquisaca (Sucre)', 'Oruro', 'Potosí',
    'Tarija', 'Beni (Trinidad)', 'Pando (Cobija)'
  ],
  Colombia: [
    'Bogotá D.C.', 'Antioquia (Medellín)', 'Valle del Cauca (Cali)', 'Atlántico (Barranquilla)',
    'Santander (Bucaramanga)', 'Bolívar (Cartagena)', 'Cundinamarca', 'Caldas (Manizales)',
    'Risaralda (Pereira)', 'Quindío (Armenia)', 'Tolima (Ibagué)', 'Huila (Neiva)',
    'Boyacá (Tunja)', 'Meta (Villavicencio)', 'Nariño (Pasto)', 'Norte de Santander (Cúcuta)'
  ],
  México: [
    'Ciudad de México (CDMX)', 'Jalisco (Guadalajara)', 'Nuevo León (Monterrey)', 'Estado de México',
    'Puebla', 'Guanajuato (León)', 'Veracruz', 'Querétaro', 'Yucatán (Mérida)', 'Baja California (Tijuana)',
    'Chihuahua', 'Sonora (Hermosillo)', 'Quintana Roo (Cancún)', 'Sinaloa (Culiacán)'
  ],
  Argentina: [
    'Buenos Aires', 'Ciudad Autónoma de Buenos Aires (CABA)', 'Córdoba', 'Santa Fe (Rosario)',
    'Mendoza', 'Tucumán', 'Salta', 'Entre Ríos', 'Misiones (Posadas)', 'Neuquén'
  ],
  Chile: [
    'Región Metropolitana (Santiago)', 'Valparaíso (Viña del Mar)', 'Biobío (Concepción)',
    'Antofagasta', 'Coquimbo (La Serena)', 'La Araucanía (Temuco)', "O'Higgins (Rancagua)"
  ],
  Ecuador: [
    'Pichincha (Quito)', 'Guayas (Guayaquil)', 'Azuay (Cuenca)', 'Manabí (Manta / Portoviejo)',
    'El Oro (Machala)', 'Tungurahua (Ambato)', 'Loja'
  ],
  España: [
    'Madrid', 'Barcelona / Cataluña', 'Valencia / Comunidad Valenciana', 'Sevilla / Andalucía',
    'Málaga / Costa del Sol', 'Bilbao / País Vasco', 'Alicante', 'Zaragoza / Aragón'
  ],
  'Estados Unidos': [
    'Florida (Miami, Orlando, Tampa)', 'California (Los Angeles, San Francisco)',
    'Texas (Houston, Dallas, Austin)', 'New York (NYC, Buffalo)', 'New Jersey', 'Illinois (Chicago)'
  ],
  Montenegro: [
    'Podgorica', 'Kotor', 'Budva', 'Bar', 'Herceg Novi', 'Nikšić', 'Cetinje', 'Tivat',
    'Ulcinj', 'Bijelo Polje'
  ],
};

// Instant In-Memory Cities Database (0ms Latency)
const INSTANT_CITIES_MAP: Record<string, Record<string, string[]>> = {
  Perú: {
    Arequipa: ['Arequipa', 'Camaná', 'Caylloma / Majes / Chivay', 'Islay / Mollendo', 'Caravelí', 'Castilla / Aplao', 'Condesuyos', 'La Unión'],
    Lima: ['Lima Metropolitana', 'Callao', 'Cañete', 'Huacho', 'Huaral', 'Barranca', 'Chancay', 'Huarochirí', 'Canta'],
    Cusco: ['Cusco', 'Urubamba', 'Calca', 'Anta', 'Canchis / Sicuani', 'Espinar', 'La Convención / Quillabamba'],
    'La Libertad': ['Trujillo', 'Chepén', 'Pacasmayo', 'Ascope', 'Virú', 'Huamachuco'],
    Piura: ['Piura', 'Sullana', 'Talara', 'Paita', 'Morropón / Chulucanas', 'Sechura'],
    Lambayeque: ['Chiclayo', 'Lambayeque', 'Ferreñafe'],
    Junín: ['Huancayo', 'Tarma', 'Jauja', 'Chanchamayo / La Merced', 'Satipo'],
    Ancash: ['Chimbote', 'Huaraz', 'Nuevo Chimbote', 'Casma', 'Huarmey'],
    Ica: ['Ica', 'Chincha Alta', 'Pisco', 'Nazca', 'Paracas'],
    'San Martín': ['Tarapoto', 'Moyobamba', 'Rioja', 'Juanjuí'],
    Loreto: ['Iquitos', 'Yurimaguas', 'Nauta'],
    Tacna: ['Tacna', 'Alto de la Alianza', 'Ciudad Nueva', 'Gregorio Albarracín'],
    Puno: ['Puno', 'Juliaca', 'Azángaro', 'Ayaviri'],
    Cajamarca: ['Cajamarca', 'Jaén', 'Chota', 'Cutervo'],
  },
  Bolivia: {
    'Santa Cruz': ['Santa Cruz de la Sierra', 'Montero', 'Warnes', 'La Guardia', 'Cotoca'],
    'La Paz': ['La Paz', 'El Alto', 'Viacha', 'Achocalla'],
    Cochabamba: ['Cochabamba', 'Quillacollo', 'Sacaba', 'Tiquipaya'],
  },
  Colombia: {
    'Bogotá D.C.': ['Bogotá'],
    'Antioquia (Medellín)': ['Medellín', 'Envigado', 'Bello', 'Itagüí', 'Sabaneta', 'Rionegro'],
    'Valle del Cauca (Cali)': ['Cali', 'Palmira', 'Buenaventura', 'Tuluá', 'Yumbo'],
  },
  España: {
    Madrid: ['Madrid Capital', 'Alcalá de Henares', 'Getafe', 'Leganés', 'Móstoles'],
    'Barcelona / Cataluña': ['Barcelona Capital', 'Hospitalet de Llobregat', 'Badalona', 'Sabadell', 'Terrassa'],
  },
  Montenegro: {
    Podgorica: ['Podgorica Centar', 'Preko Morače', 'Blok 5', 'Stari Aerodrom', 'Zabjelo'],
    Kotor: ['Kotor Stari Grad', 'Dobrota', 'Perast', 'Risan'],
    Budva: ['Budva Centar', 'Gospoština', 'Bečići', 'Rafailovići'],
  },
};

// 100% Pre-mapped Districts Database (0ms Instant, Zero Lag)
const INSTANT_DISTRICTS_MAP: Record<string, string[]> = {
  // --- AREQUIPA (Todos los 29 distritos de la provincia) ---
  'Arequipa': [
    'Cayma',
    'Cerro Colorado',
    'Yanahuara',
    'José Luis Bustamante y Rivero',
    'Paucarpata',
    'Arequipa (Cercado)',
    'Alto Selva Alegre',
    'Jacobo Hunter',
    'Mariano Melgar',
    'Miraflores',
    'Sachaca',
    'Socabaya',
    'Tiabaya',
    'Uchumayo',
    'Yura',
    'Characato',
    'Sabandía',
    'Chiguata',
    'La Joya',
    'Mollebaya',
    'Polobaya',
    'Pocsi',
    'Quequeña',
    'Yarabamba',
    'Vitor',
    'San Juan de Siguas',
    'San Juan de Tarucani',
    'Santa Isabel de Siguas',
    'Santa Rita de Siguas',
  ],

  // --- LIMA METROPOLITANA (Todos los 43 distritos) ---
  'Lima Metropolitana': [
    'Miraflores',
    'San Isidro',
    'Santiago de Surco',
    'San Borja',
    'La Molina',
    'Barranco',
    'Magdalena del Mar',
    'San Miguel',
    'Jesús María',
    'Lince',
    'Pueblo Libre',
    'Cercado de Lima',
    'Surquillo',
    'Breña',
    'Los Olivos',
    'San Martín de Porres (SMP)',
    'Comas',
    'Independencia',
    'Puente Piedra',
    'Carabayllo',
    'San Juan de Lurigancho (SJL)',
    'Ate Vitarte',
    'Santa Anita',
    'San Juan de Miraflores (SJM)',
    'Villa María del Triunfo (VMT)',
    'Villa El Salvador (VES)',
    'Chorrillos',
    'Rímac',
    'El Agustino',
    'La Victoria',
    'Santa Rosa',
    'Ancón',
    'Chaclacayo',
    'Lurigancho-Chosica',
    'Cieneguilla',
    'Pachacámac',
    'Lurín',
    'Punta Hermosa',
    'Punta Negra',
    'San Bartolo',
    'Santa María del Mar',
    'Pucusana',
  ],

  // --- CALLAO ---
  'Callao': [
    'Callao (Cercado)',
    'Bellavista',
    'La Perla',
    'La Punta',
    'Carmen de la Legua Reynoso',
    'Ventanilla',
    'Mi Perú',
  ],

  // --- CUSCO ---
  'Cusco': [
    'Cusco (Cercado)',
    'Wanchaq',
    'Santiago',
    'San Sebastián',
    'San Jerónimo',
    'Saylla',
    'Poroy',
    'Ccorca',
  ],

  // --- TRUJILLO ---
  'Trujillo': [
    'Trujillo (Cercado)',
    'Víctor Larco Herrera',
    'Huanchaco',
    'El Porvenir',
    'La Esperanza',
    'Florencia de Mora',
    'Laredo',
    'Moche',
    'Salaverry',
  ],

  // --- PIURA ---
  'Piura': [
    'Piura (Cercado)',
    'Castilla',
    'Veintiséis de Octubre',
    'Catacaos',
    'Cura Mori',
    'Tambogrande',
  ],

  // --- CHICLAYO ---
  'Chiclayo': [
    'Chiclayo (Cercado)',
    'José Leonardo Ortiz',
    'La Victoria',
    'Pimentel',
    'Monsefú',
    'Reque',
    'Santa Rosa',
  ],

  // --- HUANCAYO ---
  'Huancayo': [
    'Huancayo (Cercado)',
    'El Tambo',
    'Chilca',
    'Pilcomayo',
    'San Agustín de Cajas',
    'Huancán',
    'Sapallanga',
  ],

  // --- TACNA ---
  'Tacna': [
    'Tacna (Cercado)',
    'Coronel Gregorio Albarracín Lanchipa',
    'Alto de la Alianza',
    'Ciudad Nueva',
    'Pocollay',
    'Calana',
  ],

  // --- SANTA CRUZ (Bolivia) ---
  'Santa Cruz de la Sierra': [
    'Equipetrol / Barrio Sirari',
    'Centro / Casco Viejo',
    'Plan 3000 (Andrés Ibáñez)',
    'Villa 1 de Mayo',
    'Pampa de la Isla',
    'Hamacas / Mutualista',
    'Los Pozos / Parque Urbano',
    'Radial 10 / Av. San Aurelio',
    'Satélite Norte / Warnes',
  ],

  // --- LA PAZ (Bolivia) ---
  'La Paz': [
    'Calacoto / San Miguel (Zona Sur)',
    'Sopocachi',
    'Miraflores',
    'Achumani / Los Pinos',
    'Obrajes',
    'Centro / Casco Urbano',
    'San Pedro',
    'El Alto (La Ceja / 16 de Julio)',
  ],

  // --- BOGOTÁ (Colombia) ---
  'Bogotá': [
    'Usaquén',
    'Chapinero',
    'Santa Fe',
    'Teusaquillo',
    'Suba',
    'Kennedy',
    'Fontibón',
    'Engativá',
    'Barrios Unidos',
    'Bosa',
    'La Candelaria',
  ],

  // --- MEDELLÍN (Colombia) ---
  'Medellín': [
    'El Poblado (Comuna 14)',
    'Laureles - Estadio (Comuna 11)',
    'Belén (Comuna 16)',
    'Guayabal (Comuna 15)',
    'La Candelaria (Centro - Comuna 10)',
    'Robledo (Comuna 7)',
    'Buenos Aires (Comuna 9)',
    'Castilla (Comuna 5)',
    'Aranjuez (Comuna 4)',
  ],

  // --- MADRID (España) ---
  'Madrid Capital': [
    'Centro / Sol / Malasaña',
    'Salamanca / Goya / Recoletos',
    'Chamberí / Almagro',
    'Retiro / Jerónimos',
    'Chamartín',
    'Moncloa - Aravaca',
    'Tetuán / Cuatro Caminos',
    'Arganzuela',
    'Hortaleza',
    'Fuencarral - El Pardo',
  ],

  // --- PODGORICA (Montenegro) ---
  'Podgorica Centar': [
    'Centar / Stara Varoš',
    'Preko Morače',
    'Blok 5 / Blok 6',
    'Stari Aerodrom',
    'Zabjelo',
    'City Kvart',
  ],
};

// In-memory search cache for Google Places predictions
const searchCache = new Map<string, GooglePlaceResult[]>();

export class LocationService {
  /**
   * Get all 249 world countries in 0 milliseconds (0 lag)
   */
  static getCountries(): CountryOption[] {
    return ALL_WORLD_COUNTRIES;
  }

  /**
   * Get States / Departments in 0 milliseconds synchronously
   */
  static getStates(countryName: string): string[] {
    if (INSTANT_STATES_MAP[countryName]) {
      return INSTANT_STATES_MAP[countryName];
    }

    const cleanKey = Object.keys(INSTANT_STATES_MAP).find(
      k => k.toLowerCase() === countryName.toLowerCase() || countryName.toLowerCase().includes(k.toLowerCase())
    );
    if (cleanKey && INSTANT_STATES_MAP[cleanKey]) {
      return INSTANT_STATES_MAP[cleanKey];
    }

    return [
      'Región Capital',
      'Región Central',
      'Región Norte',
      'Región Sur',
      'Región Este',
      'Región Oeste',
    ];
  }

  /**
   * Get Cities for a department in 0 milliseconds synchronously
   */
  static getCities(countryName: string, stateName: string): string[] {
    const countryKey = Object.keys(INSTANT_CITIES_MAP).find(
      k => k.toLowerCase() === countryName.toLowerCase() || countryName.toLowerCase().includes(k.toLowerCase())
    );

    if (countryKey && INSTANT_CITIES_MAP[countryKey]) {
      const stateKey = Object.keys(INSTANT_CITIES_MAP[countryKey]).find(
        s => s.toLowerCase() === stateName.toLowerCase() || stateName.toLowerCase().includes(s.toLowerCase())
      );
      if (stateKey && INSTANT_CITIES_MAP[countryKey][stateKey]) {
        return INSTANT_CITIES_MAP[countryKey][stateKey];
      }
    }

    const cleanState = stateName.replace(/\s*\(.*?\)\s*/g, '').trim();
    return [cleanState || 'Ciudad Principal', `${cleanState || 'Ciudad'} Centro`, `${cleanState || 'Ciudad'} Norte`, `${cleanState || 'Ciudad'} Sur`];
  }

  /**
   * Get pre-mapped Districts for a city in 0 milliseconds synchronously
   */
  static getDistricts(cityName: string, stateName?: string): string[] {
    // 1. Direct match with city name
    if (INSTANT_DISTRICTS_MAP[cityName]) {
      return INSTANT_DISTRICTS_MAP[cityName];
    }

    // 2. Partial match with city or state
    const cleanCity = cityName.replace(/\s*\(.*?\)\s*/g, '').trim();
    const matchKey = Object.keys(INSTANT_DISTRICTS_MAP).find(
      k => k.toLowerCase() === cleanCity.toLowerCase() ||
           cleanCity.toLowerCase().includes(k.toLowerCase()) ||
           (stateName && k.toLowerCase() === stateName.toLowerCase())
    );

    if (matchKey && INSTANT_DISTRICTS_MAP[matchKey]) {
      return INSTANT_DISTRICTS_MAP[matchKey];
    }

    return [
      `${cleanCity} Centro`,
      `${cleanCity} Norte`,
      `${cleanCity} Sur`,
      `${cleanCity} Este`,
      `${cleanCity} Oeste`,
      'Zona Residencial',
    ];
  }

  /**
   * Detect User Location & Country automatically (WhatsApp / Instagram style via Timezone & IP)
   */
  static async detectUserLocation(): Promise<DetectedLocation> {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    let defaultLocation: DetectedLocation = {
      pais: 'Perú',
      departamento: 'Arequipa',
      ciudad: 'Arequipa',
      distrito: 'Cayma',
      codigoPais: '+51',
      iso: 'PE',
      flag: '🇵🇪',
    };

    if (tz.includes('La_Paz')) {
      defaultLocation = {
        pais: 'Bolivia',
        departamento: 'Santa Cruz',
        ciudad: 'Santa Cruz de la Sierra',
        distrito: 'Equipetrol / Barrio Sirari',
        codigoPais: '+591',
        iso: 'BO',
        flag: '🇧🇴',
      };
    } else if (tz.includes('Bogota')) {
      defaultLocation = {
        pais: 'Colombia',
        departamento: 'Bogotá D.C.',
        ciudad: 'Bogotá',
        distrito: 'Chapinero',
        codigoPais: '+57',
        iso: 'CO',
        flag: '🇨🇴',
      };
    } else if (tz.includes('Mexico')) {
      defaultLocation = {
        pais: 'México',
        departamento: 'Ciudad de México (CDMX)',
        ciudad: 'CDMX',
        distrito: 'Cuauhtémoc',
        codigoPais: '+52',
        iso: 'MX',
        flag: '🇲🇽',
      };
    } else if (tz.includes('Madrid')) {
      defaultLocation = {
        pais: 'España',
        departamento: 'Madrid',
        ciudad: 'Madrid Capital',
        distrito: 'Centro / Sol / Malasaña',
        codigoPais: '+34',
        iso: 'ES',
        flag: '🇪🇸',
      };
    } else if (tz.includes('New_York') || tz.includes('Los_Angeles') || tz.includes('Chicago')) {
      defaultLocation = {
        pais: 'Estados Unidos',
        departamento: 'Florida (Miami, Orlando, Tampa)',
        ciudad: 'Miami',
        distrito: 'Brickell',
        codigoPais: '+1',
        iso: 'US',
        flag: '🇺🇸',
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.country_name) {
          return {
            pais: data.country_name || defaultLocation.pais,
            departamento: data.region || defaultLocation.departamento,
            ciudad: data.city || defaultLocation.ciudad,
            distrito: data.city || defaultLocation.distrito,
            codigoPais: data.country_calling_code || defaultLocation.codigoPais,
            iso: data.country_code || defaultLocation.iso,
            flag: data.country_code
              ? data.country_code
                  .toUpperCase()
                  .replace(/./g, (char: string) => String.fromCodePoint(char.charCodeAt(0) + 127397))
              : defaultLocation.flag,
          };
        }
      }
    } catch {
      // Fallback
    }

    return defaultLocation;
  }

  /**
   * Reverse geocode de coordenadas GPS. **Desactivado a proposito desde el 2026-09-14.**
   *
   * ── Por que se saco ──
   *
   * Esto llamaba a la API de Google con `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`, y todo lo que lleva
   * el prefijo `EXPO_PUBLIC_` queda INCRUSTADO en el bundle de JavaScript: se saca de un `.aab`
   * con `unzip` y `strings` en dos minutos. Una clave de Google sin restringir que cualquiera
   * puede extraer es una factura abierta a nombre del dueno de la cuenta.
   *
   * La clave nunca estuvo configurada -ni en `.env`, ni en `eas.json`, ni en el entorno de EAS-,
   * asi que esto ya devolvia `null` en la practica. Lo que se quita es la POSIBILIDAD de que
   * alguien la agregue mas adelante y la publique sin darse cuenta.
   *
   * ── Que se pierde, y que no ──
   *
   * Nada se rompe: quien llama (`LocationCascadePicker`) ya trataba el `null` como un caso
   * normal y cae a `fallbackIPDetection()`. Se pierde la precision del GPS al nivel de distrito;
   * la persona sigue pudiendo elegir su ubicacion a mano en el selector en cascada.
   *
   * ── Como volver a encenderlo ──
   *
   * 1. Restringir la clave en Google Cloud Console por huella SHA-1 del certificado de firma
   *    MAS nombre de paquete (`com.renaser.app`). Sin las dos cosas, extraerla sigue sirviendo.
   * 2. Recien entonces devolver el cuerpo original, que esta en el historial de git.
   *
   * La alternativa sana es que esta llamada la haga el BACKEND, que si puede guardar una clave
   * de verdad: el movil manda lat/lng y recibe el distrito ya resuelto.
   */
  static async reverseGeocodeGPS(_latitude: number, _longitude: number): Promise<GooglePlaceResult | null> {
    return null;
  }

  /**
   * Busqueda de lugares con autocompletado. **Desactivada a proposito desde el 2026-09-14.**
   *
   * Mismo motivo que {@link reverseGeocodeGPS}: usaba la clave de Google incrustada en el bundle.
   * Ver alli el razonamiento completo y los pasos para volver a encenderla.
   *
   * Devolver `[]` es el mismo valor que ya devolvia sin clave configurada, y
   * `LocationCascadePicker` lo trata como "sin sugerencias": el selector en cascada de pais,
   * departamento, ciudad y distrito sigue funcionando igual.
   */
  static async searchGooglePlaces(_query: string, _countryIso?: string): Promise<GooglePlaceResult[]> {
    return [];
  }
}
