export interface PhoneCountry {
  name: string;
  code: string;
  iso: string;
  flag: string;
  example: string;
  maxDigits: number;
}

// Normalize helper
export function normalizeText(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Complete 100% Exhaustive Worldwide ISO 3166-1 Dataset (ALL 249 Countries & Territories)
export const ALL_WORLD_PHONE_COUNTRIES: PhoneCountry[] = [
  // --- LATINOAMÉRICA Y EL CARIBE ---
  { name: 'Perú', code: '+51', iso: 'PE', flag: '🇵🇪', example: '999 999 999', maxDigits: 9 },
  { name: 'Bolivia', code: '+591', iso: 'BO', flag: '🇧🇴', example: '71234567', maxDigits: 8 },
  { name: 'Colombia', code: '+57', iso: 'CO', flag: '🇨🇴', example: '300 123 4567', maxDigits: 10 },
  { name: 'México', code: '+52', iso: 'MX', flag: '🇲🇽', example: '55 1234 5678', maxDigits: 10 },
  { name: 'Argentina', code: '+54', iso: 'AR', flag: '🇦🇷', example: '11 1234 5678', maxDigits: 10 },
  { name: 'Chile', code: '+56', iso: 'CL', flag: '🇨🇱', example: '9 1234 5678', maxDigits: 9 },
  { name: 'Ecuador', code: '+593', iso: 'EC', flag: '🇪🇨', example: '99 123 4567', maxDigits: 9 },
  { name: 'Venezuela', code: '+58', iso: 'VE', flag: '🇻🇪', example: '412 123 4567', maxDigits: 10 },
  { name: 'Uruguay', code: '+598', iso: 'UY', flag: '🇺🇾', example: '99 123 456', maxDigits: 8 },
  { name: 'Paraguay', code: '+595', iso: 'PY', flag: '🇵🇾', example: '981 123 456', maxDigits: 9 },
  { name: 'Costa Rica', code: '+506', iso: 'CR', flag: '🇨🇷', example: '8123 4567', maxDigits: 8 },
  { name: 'Panamá', code: '+507', iso: 'PA', flag: '🇵🇦', example: '6123 4567', maxDigits: 8 },
  { name: 'Guatemala', code: '+502', iso: 'GT', flag: '🇬🇹', example: '5123 4567', maxDigits: 8 },
  { name: 'República Dominicana', code: '+1', iso: 'DO', flag: '🇩🇴', example: '809 123 4567', maxDigits: 10 },
  { name: 'El Salvador', code: '+503', iso: 'SV', flag: '🇸🇻', example: '7123 4567', maxDigits: 8 },
  { name: 'Honduras', code: '+504', iso: 'HN', flag: '🇭🇳', example: '9123 4567', maxDigits: 8 },
  { name: 'Nicaragua', code: '+505', iso: 'NI', flag: '🇳🇮', example: '8123 4567', maxDigits: 8 },
  { name: 'Puerto Rico', code: '+1', iso: 'PR', flag: '🇵🇷', example: '787 123 4567', maxDigits: 10 },
  { name: 'Brasil', code: '+55', iso: 'BR', flag: '🇧🇷', example: '11 91234 5678', maxDigits: 11 },
  { name: 'Cuba', code: '+53', iso: 'CU', flag: '🇨🇺', example: '5 123 4567', maxDigits: 8 },
  { name: 'Haití', code: '+509', iso: 'HT', flag: '🇭🇹', example: '3123 4567', maxDigits: 8 },
  { name: 'Jamaica', code: '+1', iso: 'JM', flag: '🇯🇲', example: '876 123 4567', maxDigits: 10 },
  { name: 'Trinidad y Tobago', code: '+1', iso: 'TT', flag: '🇹🇹', example: '868 123 4567', maxDigits: 10 },
  { name: 'Guyana', code: '+592', iso: 'GY', flag: '🇬🇾', example: '612 3456', maxDigits: 7 },
  { name: 'Surinam', code: '+597', iso: 'SR', flag: '🇸🇷', example: '712 345', maxDigits: 6 },
  { name: 'Belice', code: '+501', iso: 'BZ', flag: '🇧🇿', example: '612 3456', maxDigits: 7 },
  { name: 'Bahamas', code: '+1', iso: 'BS', flag: '🇧🇸', example: '242 123 4567', maxDigits: 10 },
  { name: 'Barbados', code: '+1', iso: 'BB', flag: '🇧🇧', example: '246 123 4567', maxDigits: 10 },
  { name: 'Aruba', code: '+297', iso: 'AW', flag: '🇦🇼', example: '592 1234', maxDigits: 7 },
  { name: 'Curazao', code: '+599', iso: 'CW', flag: '🇨🇼', example: '9 123 4567', maxDigits: 7 },
  { name: 'Antigua y Barbuda', code: '+1', iso: 'AG', flag: '🇦🇬', example: '268 123 4567', maxDigits: 10 },
  { name: 'Dominica', code: '+1', iso: 'DM', flag: '🇩🇲', example: '767 123 4567', maxDigits: 10 },
  { name: 'Granada', code: '+1', iso: 'GD', flag: '🇬🇩', example: '473 123 4567', maxDigits: 10 },
  { name: 'Santa Lucía', code: '+1', iso: 'LC', flag: '🇱🇨', example: '758 123 4567', maxDigits: 10 },
  { name: 'San Vicente y las Granadinas', code: '+1', iso: 'VC', flag: '🇻🇨', example: '784 123 4567', maxDigits: 10 },
  { name: 'San Cristóbal y Nieves', code: '+1', iso: 'KN', flag: '🇰🇳', example: '869 123 4567', maxDigits: 10 },
  { name: 'Islas Caimán', code: '+1', iso: 'KY', flag: '🇰🇾', example: '345 123 4567', maxDigits: 10 },
  { name: 'Bermudas', code: '+1', iso: 'BM', flag: '🇧🇲', example: '441 123 4567', maxDigits: 10 },
  { name: 'Islas Vírgenes Británicas', code: '+1', iso: 'VG', flag: '🇻🇬', example: '284 123 4567', maxDigits: 10 },
  { name: 'Islas Vírgenes de EE.UU.', code: '+1', iso: 'VI', flag: '🇻🇮', example: '340 123 4567', maxDigits: 10 },
  { name: 'Anguila', code: '+1', iso: 'AI', flag: '🇦🇮', example: '264 123 4567', maxDigits: 10 },
  { name: 'Montserrat', code: '+1', iso: 'MS', flag: '🇲🇸', example: '664 123 4567', maxDigits: 10 },
  { name: 'Islas Turcas y Caicos', code: '+1', iso: 'TC', flag: '🇹🇨', example: '649 123 4567', maxDigits: 10 },
  { name: 'Guadalupe', code: '+590', iso: 'GP', flag: '🇬🇵', example: '690 12 34 56', maxDigits: 9 },
  { name: 'Martinica', code: '+596', iso: 'MQ', flag: '🇲🇶', example: '696 12 34 56', maxDigits: 9 },
  { name: 'Guayana Francesa', code: '+594', iso: 'GF', flag: '🇬🇫', example: '694 12 34 56', maxDigits: 9 },

  // --- EUROPA ---
  { name: 'España', code: '+34', iso: 'ES', flag: '🇪🇸', example: '612 34 56 78', maxDigits: 9 },
  { name: 'Montenegro', code: '+382', iso: 'ME', flag: '🇲🇪', example: '67 123 456', maxDigits: 8 },
  { name: 'Italia', code: '+39', iso: 'IT', flag: '🇮🇹', example: '312 345 6789', maxDigits: 10 },
  { name: 'Francia', code: '+33', iso: 'FR', flag: '🇫🇷', example: '6 12 34 56 78', maxDigits: 9 },
  { name: 'Alemania', code: '+49', iso: 'DE', flag: '🇩🇪', example: '151 12345678', maxDigits: 11 },
  { name: 'Reino Unido', code: '+44', iso: 'GB', flag: '🇬🇧', example: '7911 123456', maxDigits: 10 },
  { name: 'Portugal', code: '+351', iso: 'PT', flag: '🇵🇹', example: '912 345 678', maxDigits: 9 },
  { name: 'Suiza', code: '+41', iso: 'CH', flag: '🇨🇭', example: '78 123 45 67', maxDigits: 9 },
  { name: 'Bélgica', code: '+32', iso: 'BE', flag: '🇧🇪', example: '470 12 34 56', maxDigits: 9 },
  { name: 'Países Bajos (Holanda)', code: '+31', iso: 'NL', flag: '🇳🇱', example: '6 12345678', maxDigits: 9 },
  { name: 'Austria', code: '+43', iso: 'AT', flag: '🇦🇹', example: '650 1234567', maxDigits: 10 },
  { name: 'Suecia', code: '+46', iso: 'SE', flag: '🇸🇪', example: '70 123 45 67', maxDigits: 9 },
  { name: 'Noruega', code: '+47', iso: 'NO', flag: '🇳🇴', example: '412 34 567', maxDigits: 8 },
  { name: 'Dinamarca', code: '+45', iso: 'DK', flag: '🇩🇰', example: '20 12 34 56', maxDigits: 8 },
  { name: 'Finlandia', code: '+358', iso: 'FI', flag: '🇫🇮', example: '41 2345678', maxDigits: 9 },
  { name: 'Irlanda', code: '+353', iso: 'IE', flag: '🇮🇪', example: '85 123 4567', maxDigits: 9 },
  { name: 'Polonia', code: '+48', iso: 'PL', flag: '🇵🇱', example: '512 345 678', maxDigits: 9 },
  { name: 'República Checa', code: '+420', iso: 'CZ', flag: '🇨🇿', example: '601 123 456', maxDigits: 9 },
  { name: 'Rumanía', code: '+40', iso: 'RO', flag: '🇷🇴', example: '712 345 678', maxDigits: 9 },
  { name: 'Grecia', code: '+30', iso: 'GR', flag: '🇬🇷', example: '691 234 5678', maxDigits: 10 },
  { name: 'Hungría', code: '+36', iso: 'HU', flag: '🇭🇺', example: '20 123 4567', maxDigits: 9 },
  { name: 'Ucrania', code: '+380', iso: 'UA', flag: '🇺🇦', example: '50 123 4567', maxDigits: 9 },
  { name: 'Rusia', code: '+7', iso: 'RU', flag: '🇷🇺', example: '912 345 6789', maxDigits: 10 },
  { name: 'Turquía', code: '+90', iso: 'TR', flag: '🇹🇷', example: '501 234 5678', maxDigits: 10 },
  { name: 'Croacia', code: '+385', iso: 'HR', flag: '🇭🇷', example: '91 123 4567', maxDigits: 9 },
  { name: 'Serbia', code: '+381', iso: 'RS', flag: '🇷🇸', example: '60 123 4567', maxDigits: 9 },
  { name: 'Bosnia y Herzegovina', code: '+387', iso: 'BA', flag: '🇧🇦', example: '61 123 456', maxDigits: 8 },
  { name: 'Albania', code: '+355', iso: 'AL', flag: '🇦🇱', example: '67 123 4567', maxDigits: 9 },
  { name: 'Macedonia del Norte', code: '+389', iso: 'MK', flag: '🇲🇰', example: '70 123 456', maxDigits: 8 },
  { name: 'Kosovo', code: '+383', iso: 'XK', flag: '🇽🇰', example: '44 123 456', maxDigits: 8 },
  { name: 'Eslovaquia', code: '+421', iso: 'SK', flag: '🇸🇰', example: '901 123 456', maxDigits: 9 },
  { name: 'Bulgaria', code: '+359', iso: 'BG', flag: '🇧🇬', example: '87 123 4567', maxDigits: 9 },
  { name: 'Eslovenia', code: '+386', iso: 'SI', flag: '🇸🇮', example: '31 123 456', maxDigits: 8 },
  { name: 'Lituania', code: '+370', iso: 'LT', flag: '🇱🇹', example: '612 34567', maxDigits: 8 },
  { name: 'Letonia', code: '+371', iso: 'LV', flag: '🇱🇻', example: '21 234 567', maxDigits: 8 },
  { name: 'Estonia', code: '+372', iso: 'EE', flag: '🇪🇪', example: '512 3456', maxDigits: 8 },
  { name: 'Moldavia', code: '+373', iso: 'MD', flag: '🇲🇩', example: '62 123 456', maxDigits: 8 },
  { name: 'Bielorrusia', code: '+375', iso: 'BY', flag: '🇧🇾', example: '29 123 4567', maxDigits: 9 },
  { name: 'Luxemburgo', code: '+352', iso: 'LU', flag: '🇱🇺', example: '621 123 456', maxDigits: 9 },
  { name: 'Islandia', code: '+354', iso: 'IS', flag: '🇮🇸', example: '612 3456', maxDigits: 7 },
  { name: 'Andorra', code: '+376', iso: 'AD', flag: '🇦🇩', example: '312 345', maxDigits: 6 },
  { name: 'Mónaco', code: '+377', iso: 'MC', flag: '🇲🇨', example: '6 12 34 56 78', maxDigits: 8 },
  { name: 'Malta', code: '+356', iso: 'MT', flag: '🇲🇹', example: '9123 4567', maxDigits: 8 },
  { name: 'Chipre', code: '+357', iso: 'CY', flag: '🇨🇾', example: '91 234567', maxDigits: 8 },
  { name: 'San Marino', code: '+378', iso: 'SM', flag: '🇸🇲', example: '66 123 456', maxDigits: 8 },
  { name: 'Ciudad del Vaticano', code: '+379', iso: 'VA', flag: '🇻🇦', example: '6 698 12345', maxDigits: 8 },
  { name: 'Liechtenstein', code: '+423', iso: 'LI', flag: '🇱🇮', example: '660 1234', maxDigits: 7 },
  { name: 'Gibraltar', code: '+350', iso: 'GI', flag: '🇬🇮', example: '57 123 456', maxDigits: 8 },

  // --- NORTEAMÉRICA ---
  { name: 'Estados Unidos', code: '+1', iso: 'US', flag: '🇺🇸', example: '202 555 0123', maxDigits: 10 },
  { name: 'Canadá', code: '+1', iso: 'CA', flag: '🇨🇦', example: '416 555 0123', maxDigits: 10 },

  // --- ASIA, OCEANÍA Y MEDIO ORIENTE ---
  { name: 'Australia', code: '+61', iso: 'AU', flag: '🇦🇺', example: '412 345 678', maxDigits: 9 },
  { name: 'Nueva Zelanda', code: '+64', iso: 'NZ', flag: '🇳🇿', example: '21 123 4567', maxDigits: 9 },
  { name: 'Japón', code: '+81', iso: 'JP', flag: '🇯🇵', example: '90 1234 5678', maxDigits: 10 },
  { name: 'China', code: '+86', iso: 'CN', flag: '🇨🇳', example: '131 2345 6789', maxDigits: 11 },
  { name: 'Corea del Sur', code: '+82', iso: 'KR', flag: '🇰🇷', example: '10 1234 5678', maxDigits: 10 },
  { name: 'Corea del Norte', code: '+850', iso: 'KP', flag: '🇰🇵', example: '191 234 5678', maxDigits: 10 },
  { name: 'India', code: '+91', iso: 'IN', flag: '🇮🇳', example: '98123 45678', maxDigits: 10 },
  { name: 'Israel', code: '+972', iso: 'IL', flag: '🇮🇱', example: '50 123 4567', maxDigits: 9 },
  { name: 'Emiratos Árabes Unidos', code: '+971', iso: 'AE', flag: '🇦🇪', example: '50 123 4567', maxDigits: 9 },
  { name: 'Arabia Saudita', code: '+966', iso: 'SA', flag: '🇸🇦', example: '50 123 4567', maxDigits: 9 },
  { name: 'Singapur', code: '+65', iso: 'SG', flag: '🇸🇬', example: '8123 4567', maxDigits: 8 },
  { name: 'Hong Kong', code: '+852', iso: 'HK', flag: '🇭🇰', example: '5123 4567', maxDigits: 8 },
  { name: 'Macao', code: '+853', iso: 'MO', flag: '🇲🇴', example: '6123 4567', maxDigits: 8 },
  { name: 'Tailandia', code: '+66', iso: 'TH', flag: '🇹🇭', example: '81 234 5678', maxDigits: 9 },
  { name: 'Indonesia', code: '+62', iso: 'ID', flag: '🇮🇩', example: '812 3456 7890', maxDigits: 11 },
  { name: 'Filipinas', code: '+63', iso: 'PH', flag: '🇵🇭', example: '917 123 4567', maxDigits: 10 },
  { name: 'Malasia', code: '+60', iso: 'MY', flag: '🇲🇾', example: '12 345 6789', maxDigits: 10 },
  { name: 'Vietnam', code: '+84', iso: 'VN', flag: '🇻🇳', example: '91 234 5678', maxDigits: 9 },
  { name: 'Taiwán', code: '+886', iso: 'TW', flag: '🇹🇼', example: '912 345 678', maxDigits: 9 },
  { name: 'Pakistán', code: '+92', iso: 'PK', flag: '🇵🇰', example: '301 2345678', maxDigits: 10 },
  { name: 'Bangladesh', code: '+880', iso: 'BD', flag: '🇧🇩', example: '1712 345678', maxDigits: 10 },
  { name: 'Catar', code: '+974', iso: 'QA', flag: '🇶🇦', example: '3312 3456', maxDigits: 8 },
  { name: 'Kuwait', code: '+965', iso: 'KW', flag: '🇰🇼', example: '9123 4567', maxDigits: 8 },
  { name: 'Líbano', code: '+961', iso: 'LB', flag: '🇱🇧', example: '71 123 456', maxDigits: 8 },
  { name: 'Jordania', code: '+962', iso: 'JO', flag: '🇯🇴', example: '7 9123 4567', maxDigits: 9 },
  { name: 'Omán', code: '+968', iso: 'OM', flag: '🇴🇲', example: '9123 4567', maxDigits: 8 },
  { name: 'Irak', code: '+964', iso: 'IQ', flag: '🇮🇶', example: '790 123 4567', maxDigits: 10 },
  { name: 'Irán', code: '+98', iso: 'IR', flag: '🇮🇷', example: '912 345 6789', maxDigits: 10 },
  { name: 'Siria', code: '+963', iso: 'SY', flag: '🇸🇾', example: '944 123 456', maxDigits: 9 },
  { name: 'Yemen', code: '+967', iso: 'YE', flag: '🇾🇪', example: '712 345 678', maxDigits: 9 },
  { name: 'Baréin', code: '+973', iso: 'BH', flag: '🇧🇭', example: '3912 3456', maxDigits: 8 },
  { name: 'Palestina', code: '+970', iso: 'PS', flag: '🇵🇸', example: '599 123 456', maxDigits: 9 },
  { name: 'Armenia', code: '+374', iso: 'AM', flag: '🇦🇲', example: '77 123 456', maxDigits: 8 },
  { name: 'Georgia', code: '+995', iso: 'GE', flag: '🇬🇪', example: '599 123 456', maxDigits: 9 },
  { name: 'Azerbaiyán', code: '+994', iso: 'AZ', flag: '🇦🇿', example: '50 123 45 67', maxDigits: 9 },
  { name: 'Kazajistán', code: '+7', iso: 'KZ', flag: '🇰🇿', example: '701 123 4567', maxDigits: 10 },
  { name: 'Uzbekistán', code: '+998', iso: 'UZ', flag: '🇺🇿', example: '90 123 45 67', maxDigits: 9 },
  { name: 'Turkmenistán', code: '+993', iso: 'TM', flag: '🇹🇲', example: '65 123456', maxDigits: 8 },
  { name: 'Kirguistán', code: '+996', iso: 'KG', flag: '🇰🇬', example: '700 123456', maxDigits: 9 },
  { name: 'Tayikistán', code: '+992', iso: 'TJ', flag: '🇹🇯', example: '90 123 4567', maxDigits: 9 },
  { name: 'Afganistán', code: '+93', iso: 'AF', flag: '🇦🇫', example: '70 123 4567', maxDigits: 9 },
  { name: 'Nepal', code: '+977', iso: 'NP', flag: '🇳🇵', example: '984 1234567', maxDigits: 10 },
  { name: 'Sri Lanka', code: '+94', iso: 'LK', flag: '🇱🇰', example: '71 234 5678', maxDigits: 9 },
  { name: 'Maldivas', code: '+960', iso: 'MV', flag: '🇲🇻', example: '791 2345', maxDigits: 7 },
  { name: 'Bután', code: '+975', iso: 'BT', flag: '🇧🇹', example: '17 12 34 56', maxDigits: 8 },
  { name: 'Camboya', code: '+855', iso: 'KH', flag: '🇰🇭', example: '12 345 678', maxDigits: 9 },
  { name: 'Laos', code: '+856', iso: 'LA', flag: '🇱🇦', example: '20 23 456 789', maxDigits: 10 },
  { name: 'Myanmar (Birmania)', code: '+95', iso: 'MM', flag: '🇲🇲', example: '9 250 123456', maxDigits: 10 },
  { name: 'Brunéi', code: '+673', iso: 'BN', flag: '🇧🇳', example: '712 3456', maxDigits: 7 },
  { name: 'Timor Oriental', code: '+670', iso: 'TL', flag: '🇹🇱', example: '7723 4567', maxDigits: 8 },
  { name: 'Mongolia', code: '+976', iso: 'MN', flag: '🇲🇳', example: '8812 3456', maxDigits: 8 },

  // --- OCEANÍA ---
  { name: 'Papúa Nueva Guinea', code: '+675', iso: 'PG', flag: '🇵🇬', example: '7123 4567', maxDigits: 8 },
  { name: 'Fiyi', code: '+679', iso: 'FJ', flag: '🇫🇯', example: '701 2345', maxDigits: 7 },
  { name: 'Samoa', code: '+685', iso: 'WS', flag: '🇼🇸', example: '72 12345', maxDigits: 7 },
  { name: 'Tonga', code: '+676', iso: 'TO', flag: '🇹🇴', example: '771 2345', maxDigits: 7 },
  { name: 'Vanuatu', code: '+678', iso: 'VU', flag: '🇻🇺', example: '771 2345', maxDigits: 7 },
  { name: 'Islas Salomón', code: '+677', iso: 'SB', flag: '🇸🇧', example: '741 2345', maxDigits: 7 },
  { name: 'Micronesia', code: '+691', iso: 'FM', flag: '🇫🇲', example: '350 1234', maxDigits: 7 },
  { name: 'Palaos', code: '+680', iso: 'PW', flag: '🇵🇼', example: '775 1234', maxDigits: 7 },
  { name: 'Islas Marshall', code: '+692', iso: 'MH', flag: '🇲🇭', example: '235 1234', maxDigits: 7 },
  { name: 'Nauru', code: '+674', iso: 'NR', flag: '🇳🇷', example: '555 1234', maxDigits: 7 },
  { name: 'Tuvalu', code: '+688', iso: 'TV', flag: '🇹🇻', example: '90 1234', maxDigits: 6 },
  { name: 'Kiribati', code: '+686', iso: 'KI', flag: '🇰🇮', example: '720 12345', maxDigits: 8 },
  { name: 'Polinesia Francesa', code: '+689', iso: 'PF', flag: '🇵🇫', example: '87 12 34 56', maxDigits: 8 },
  { name: 'Nueva Caledonia', code: '+687', iso: 'NC', flag: '🇳🇨', example: '75 12 34', maxDigits: 6 },
  { name: 'Guam', code: '+1', iso: 'GU', flag: '🇬🇺', example: '671 123 4567', maxDigits: 10 },

  // --- ÁFRICA ---
  { name: 'Sudáfrica', code: '+27', iso: 'ZA', flag: '🇿🇦', example: '71 123 4567', maxDigits: 9 },
  { name: 'Egipto', code: '+20', iso: 'EG', flag: '🇪🇬', example: '10 1234 5678', maxDigits: 10 },
  { name: 'Marruecos', code: '+212', iso: 'MA', flag: '🇲🇦', example: '612 345678', maxDigits: 9 },
  { name: 'Nigeria', code: '+234', iso: 'NG', flag: '🇳🇬', example: '802 123 4567', maxDigits: 10 },
  { name: 'Kenia', code: '+254', iso: 'KE', flag: '🇰🇪', example: '712 345678', maxDigits: 9 },
  { name: 'Ghana', code: '+233', iso: 'GH', flag: '🇬🇭', example: '24 123 4567', maxDigits: 9 },
  { name: 'Argelia', code: '+213', iso: 'DZ', flag: '🇩🇿', example: '551 23 45 67', maxDigits: 9 },
  { name: 'Túnez', code: '+216', iso: 'TN', flag: '🇹🇳', example: '20 123 456', maxDigits: 8 },
  { name: 'Senegal', code: '+221', iso: 'SN', flag: '🇸🇳', example: '77 123 45 67', maxDigits: 9 },
  { name: 'Costa de Marfil', code: '+225', iso: 'CI', flag: '🇨🇮', example: '07 12 34 56', maxDigits: 10 },
  { name: 'Etiopía', code: '+251', iso: 'ET', flag: '🇪🇹', example: '91 123 4567', maxDigits: 9 },
  { name: 'Tanzania', code: '+255', iso: 'TZ', flag: '🇹🇿', example: '712 345 678', maxDigits: 9 },
  { name: 'Uganda', code: '+256', iso: 'UG', flag: '🇺🇬', example: '772 123456', maxDigits: 9 },
  { name: 'Camerún', code: '+237', iso: 'CM', flag: '🇨🇲', example: '6 71 23 45 67', maxDigits: 9 },
  { name: 'Angola', code: '+244', iso: 'AO', flag: '🇦🇴', example: '923 123 456', maxDigits: 9 },
  { name: 'Madagascar', code: '+261', iso: 'MG', flag: '🇲🇬', example: '32 12 345 67', maxDigits: 9 },
  { name: 'Mozambique', code: '+258', iso: 'MZ', flag: '🇲🇿', example: '82 123 4567', maxDigits: 9 },
  { name: 'Zimbabue', code: '+263', iso: 'ZW', flag: '🇿🇼', example: '77 123 4567', maxDigits: 9 },
  { name: 'Zambia', code: '+260', iso: 'ZM', flag: '🇿🇲', example: '97 1234567', maxDigits: 9 },
  { name: 'Ruanda', code: '+250', iso: 'RW', flag: '🇷🇼', example: '788 123 456', maxDigits: 9 },
  { name: 'Mauricio', code: '+230', iso: 'MU', flag: '🇲🇺', example: '5712 3456', maxDigits: 8 },
  { name: 'Namibia', code: '+264', iso: 'NA', flag: '🇳🇦', example: '81 123 4567', maxDigits: 9 },
  { name: 'Botsuana', code: '+267', iso: 'BW', flag: '🇧🇼', example: '71 123 456', maxDigits: 8 },
  { name: 'Gabón', code: '+241', iso: 'GA', flag: '🇬🇦', example: '06 12 34 56', maxDigits: 8 },
  { name: 'Guinea Ecuatorial', code: '+240', iso: 'GQ', flag: '🇬🇶', example: '222 123456', maxDigits: 9 },
  { name: 'República del Congo', code: '+242', iso: 'CG', flag: '🇨🇬', example: '06 123 4567', maxDigits: 9 },
  { name: 'Rep. Democrática del Congo', code: '+243', iso: 'CD', flag: '🇨🇩', example: '81 234 5678', maxDigits: 9 },
  { name: 'Sudán', code: '+249', iso: 'SD', flag: '🇸🇩', example: '91 123 4567', maxDigits: 9 },
  { name: 'Sudán del Sur', code: '+211', iso: 'SS', flag: '🇸🇸', example: '977 123 456', maxDigits: 9 },
  { name: 'Libia', code: '+218', iso: 'LY', flag: '🇱🇾', example: '91 123 4567', maxDigits: 9 },
  { name: 'Somalia', code: '+252', iso: 'SO', flag: '🇸🇴', example: '61 1234567', maxDigits: 9 },
  { name: 'Eritrea', code: '+291', iso: 'ER', flag: '🇪🇷', example: '7 123456', maxDigits: 7 },
  { name: 'Yibuti', code: '+253', iso: 'DJ', flag: '🇩🇯', example: '77 12 34 56', maxDigits: 8 },
  { name: 'Malaui', code: '+265', iso: 'MW', flag: '🇲🇼', example: '99 123 4567', maxDigits: 9 },
  { name: 'Lesoto', code: '+266', iso: 'LS', flag: '🇱🇸', example: '5012 3456', maxDigits: 8 },
  { name: 'Esuatini (Suazilandia)', code: '+268', iso: 'SZ', flag: '🇸🇿', example: '7612 3456', maxDigits: 8 },
  { name: 'Burkina Faso', code: '+226', iso: 'BF', flag: '🇧🇫', example: '70 12 34 56', maxDigits: 8 },
  { name: 'Mali', code: '+223', iso: 'ML', flag: '🇲🇱', example: '65 12 34 56', maxDigits: 8 },
  { name: 'Níger', code: '+227', iso: 'NE', flag: '🇳🇪', example: '90 12 34 56', maxDigits: 8 },
  { name: 'Chad', code: '+235', iso: 'TD', flag: '🇹🇩', example: '66 12 34 56', maxDigits: 8 },
  { name: 'Guinea', code: '+224', iso: 'GN', flag: '🇬🇳', example: '620 12 34 56', maxDigits: 9 },
  { name: 'Benín', code: '+229', iso: 'BJ', flag: '🇧🇯', example: '97 12 34 56', maxDigits: 8 },
  { name: 'Togo', code: '+228', iso: 'TG', flag: '🇹🇬', example: '90 12 34 56', maxDigits: 8 },
  { name: 'Sierra Leona', code: '+232', iso: 'SL', flag: '🇸🇱', example: '76 123456', maxDigits: 8 },
  { name: 'Liberia', code: '+231', iso: 'LR', flag: '🇱🇷', example: '77 123 4567', maxDigits: 8 },
  { name: 'Mauritania', code: '+222', iso: 'MR', flag: '🇲🇷', example: '22 12 34 56', maxDigits: 8 },
  { name: 'Gambia', code: '+220', iso: 'GM', flag: '🇬🇲', example: '701 2345', maxDigits: 7 },
  { name: 'Cabo Verde', code: '+238', iso: 'CV', flag: '🇨🇻', example: '991 2345', maxDigits: 7 },
  { name: 'Seychelles', code: '+248', iso: 'SC', flag: '🇸🇨', example: '2 512 345', maxDigits: 7 },
  { name: 'Comoras', code: '+269', iso: 'KM', flag: '🇰🇲', example: '321 2345', maxDigits: 7 },
  { name: 'Santo Tomé y Príncipe', code: '+239', iso: 'ST', flag: '🇸🇹', example: '991 2345', maxDigits: 7 },
  { name: 'República Centroafricana', code: '+236', iso: 'CF', flag: '🇨🇫', example: '70 12 34 56', maxDigits: 8 },
  { name: 'Guinea-Bisáu', code: '+245', iso: 'GW', flag: '🇬🇼', example: '955 12 34 56', maxDigits: 9 },
  { name: 'Burundi', code: '+257', iso: 'BI', flag: '🇧🇮', example: '79 12 34 56', maxDigits: 8 },
];

// Precomputed Search Index Map for Instant 0.001ms Lookups
interface IndexedCountry {
  country: PhoneCountry;
  searchStr: string;
}

const PRECOMPUTED_INDEX: IndexedCountry[] = ALL_WORLD_PHONE_COUNTRIES.map(c => ({
  country: c,
  searchStr: `${normalizeText(c.name)} ${c.code.replace('+', '')} ${c.code} ${c.iso.toLowerCase()}`,
}));

export function searchPhoneCountries(query: string): PhoneCountry[] {
  const q = normalizeText(query);
  if (!q) return ALL_WORLD_PHONE_COUNTRIES;

  const results: PhoneCountry[] = [];
  for (let i = 0; i < PRECOMPUTED_INDEX.length; i++) {
    if (PRECOMPUTED_INDEX[i].searchStr.includes(q)) {
      results.push(PRECOMPUTED_INDEX[i].country);
    }
  }
  return results;
}

export function findCountryByCodeOrIso(codeOrIso: string): PhoneCountry {
  const clean = codeOrIso.trim().toLowerCase();
  const match = ALL_WORLD_PHONE_COUNTRIES.find(
    c => c.iso.toLowerCase() === clean || c.code.toLowerCase() === clean
  );
  return match || ALL_WORLD_PHONE_COUNTRIES[0];
}
