import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Alert } from './Alerta';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from './Icon';
import { MicroLabel } from './ui';
import { Presionable } from './Presionable';
import { HojaDeOpciones, OpcionDeHoja } from './hojaDesdeAbajo/HojaDeOpciones';
import { LocationService, GooglePlaceResult } from '../services/locationService';
import { tacto } from '../utils/tacto';

export interface LocationData {
  pais: string;
  departamento: string;
  ciudad: string;
  distrito: string;
  direccion?: string;
}

interface LocationCascadePickerProps {
  data: LocationData;
  onChange: (data: LocationData) => void;
  error?: string;
}

type ModalType = 'pais' | 'departamento' | 'ciudad' | 'distrito' | null;

interface ListItem {
  label: string;
  value: string;
  /** La bandera, en la lista de países. */
  prefijo?: string;
}

function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const claveDeItem = (item: ListItem) => item.value;
const etiquetaDeItem = (item: ListItem) => item.label;
const prefijoDeItem = (item: ListItem) => item.prefijo;

/**
 * «¿Dónde vives?» de la Ficha Inicial: país, departamento, ciudad y distrito en cascada, más la
 * dirección. 2026-10-05.
 *
 * **Qué cambió (la forma).** Los cuatro selectores eran cajitas de 2 × 2 con «▾» que abrían un
 * diálogo centrado con «SELECCIONAR ›» en cada fila y un botón «CERRAR». Ahora son las filas de una
 * lista agrupada (como los ajustes del teléfono) y cada una abre una hoja desde abajo con buscador
 * (sin tildes), la lista virtualizada y lo elegido marcado con ✓.
 *
 * **Qué no cambió (el contrato).** La cascada es la misma: elegir un país pone su primer
 * departamento, ciudad y distrito; elegir un departamento, su primera ciudad y distrito; y así. La
 * búsqueda en Google Places del distrito, la opción «Usar …» con lo escrito, el botón de ubicación
 * y la dirección guardan lo mismo que antes.
 *
 * **Atribución de Google.** Las sugerencias de Places se muestran sin un mapa de Google, y su
 * política pide entonces la atribución «Powered by Google» junto a ellas. Antes faltaba.
 */
export function LocationCascadePicker({ data, onChange, error }: LocationCascadePickerProps) {
  const { c, t } = useTheme();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
  const [isDetectingGPS, setIsDetectingGPS] = useState(false);
  const [googleResults, setGoogleResults] = useState<GooglePlaceResult[]>([]);

  const countriesList = useMemo(() => LocationService.getCountries(), []);

  const currentCountry = data.pais || 'Perú';
  const currentDept = data.departamento || 'Arequipa';
  const currentCity = data.ciudad || 'Arequipa';

  // Synchronous, Instant States, Cities & Districts in 0ms (Zero Lag!)
  const availableStates = useMemo(() => LocationService.getStates(currentCountry), [currentCountry]);

  const availableCities = useMemo(
    () => LocationService.getCities(currentCountry, currentDept || availableStates[0] || ''),
    [currentCountry, currentDept, availableStates],
  );

  const availableDistricts = useMemo(
    () => LocationService.getDistricts(currentCity, currentDept),
    [currentCity, currentDept],
  );

  // Selected Country Object
  const selectedCountryObj = useMemo(() => {
    return (
      countriesList.find(ct => normalize(ct.name) === normalize(currentCountry)) ||
      countriesList[0] || {
        name: 'Perú',
        flag: '🇵🇪',
        iso: 'PE',
        apiName: 'Peru',
      }
    );
  }, [countriesList, currentCountry]);

  const cerrarHoja = useCallback(() => {
    setActiveModal(null);
    setSearchQuery('');
    setGoogleResults([]);
  }, []);

  const abrirHoja = (tipo: Exclude<ModalType, null>) => {
    setSearchQuery('');
    setActiveModal(tipo);
  };

  // Live Predictive Search with Google Places for Districts
  const handleDistrictSearchChange = (text: string) => {
    setSearchQuery(text);
    const q = text.trim();

    if (q.length < 2) {
      setGoogleResults([]);
      setIsSearchingGoogle(false);
      return;
    }

    setIsSearchingGoogle(true);
    LocationService.searchGooglePlaces(q, selectedCountryObj.iso).then(results => {
      setGoogleResults(results);
      setIsSearchingGoogle(false);
    });
  };

  // GPS 1-Tap Location Detection (Instagram / Uber style)
  const handleUseCurrentGPS = async () => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      setIsDetectingGPS(true);
      navigator.geolocation.getCurrentPosition(
        async position => {
          try {
            const { latitude, longitude } = position.coords;
            const place = await LocationService.reverseGeocodeGPS(latitude, longitude);
            if (place) {
              onChange({
                ...data,
                pais: place.pais || data.pais || 'Perú',
                departamento: place.departamento || data.departamento || '',
                ciudad: place.ciudad || data.ciudad || '',
                distrito: place.distrito || place.mainText || data.distrito || '',
              });
              Alert.alert('📍 Ubicación detectada', `${place.mainText}, ${place.secondaryText}`);
            } else {
              fallbackIPDetection();
            }
          } finally {
            setIsDetectingGPS(false);
          }
        },
        () => {
          fallbackIPDetection();
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 },
      );
    } else {
      fallbackIPDetection();
    }
  };

  const fallbackIPDetection = async () => {
    setIsDetectingGPS(true);
    try {
      const loc = await LocationService.detectUserLocation();
      onChange({
        ...data,
        pais: loc.pais,
        departamento: loc.departamento,
        ciudad: loc.ciudad,
        distrito: loc.distrito,
      });
      Alert.alert('📍 Ubicación aproximada', `${loc.distrito}, ${loc.ciudad}, ${loc.pais}`);
    } finally {
      setIsDetectingGPS(false);
    }
  };

  const handleSelectGooglePlace = (g: GooglePlaceResult) => {
    tacto.seleccion();
    cerrarHoja();
    onChange({
      ...data,
      pais: g.pais || data.pais || 'Perú',
      departamento: g.departamento || data.departamento || '',
      ciudad: g.ciudad || data.ciudad || '',
      distrito: g.distrito || g.mainText || data.distrito || '',
    });
  };

  const usarLoEscrito = () => {
    tacto.seleccion();
    onChange({ ...data, distrito: searchQuery.trim() });
    cerrarHoja();
  };

  // Instant Local Filtered Items in 0ms (0 API Credits, 0 Lag)
  const filteredLocalItems = useMemo<ListItem[]>(() => {
    const q = normalize(searchQuery);
    if (activeModal === 'pais') {
      const paises = q
        ? countriesList.filter(ct => normalize(ct.name).includes(q) || ct.iso.toLowerCase().includes(q))
        : countriesList;
      return paises.map(ct => ({ label: ct.name, value: ct.name, prefijo: ct.flag }));
    }
    const lista =
      activeModal === 'departamento'
        ? availableStates
        : activeModal === 'ciudad'
        ? availableCities
        : activeModal === 'distrito'
        ? availableDistricts
        : [];
    return (q ? lista.filter(v => normalize(v).includes(q)) : lista).map(v => ({ label: v, value: v }));
  }, [activeModal, searchQuery, countriesList, availableStates, availableCities, availableDistricts]);

  const getModalTitle = () => {
    if (activeModal === 'pais') return 'País';
    if (activeModal === 'departamento') return 'Departamento / Estado';
    if (activeModal === 'ciudad') return 'Provincia / Ciudad';
    if (activeModal === 'distrito') return `Distritos de ${currentCity}`;
    return '';
  };

  /** Lo elegido en el nivel abierto, para marcarlo con ✓ en la lista. */
  const esElegido = useCallback(
    (item: ListItem) => {
      if (activeModal === 'pais') return normalize(item.value) === normalize(currentCountry);
      if (activeModal === 'departamento') return item.value === data.departamento;
      if (activeModal === 'ciudad') return item.value === data.ciudad;
      if (activeModal === 'distrito') return item.value === data.distrito;
      return false;
    },
    [activeModal, currentCountry, data.ciudad, data.departamento, data.distrito],
  );

  /** La cascada de siempre: elegir un nivel pone el primero de cada nivel de abajo. */
  const elegirItem = useCallback(
    (item: ListItem) => {
      if (activeModal === 'pais') {
        const newStates = LocationService.getStates(item.value);
        const firstState = newStates[0] || '';
        const newCities = LocationService.getCities(item.value, firstState);
        const firstCity = newCities[0] || '';
        const newDistricts = LocationService.getDistricts(firstCity, firstState);
        const firstDistrict = newDistricts[0] || '';
        onChange({ ...data, pais: item.value, departamento: firstState, ciudad: firstCity, distrito: firstDistrict });
      } else if (activeModal === 'departamento') {
        const newCities = LocationService.getCities(currentCountry, item.value);
        const firstCity = newCities[0] || '';
        const newDistricts = LocationService.getDistricts(firstCity, item.value);
        const firstDistrict = newDistricts[0] || '';
        onChange({ ...data, departamento: item.value, ciudad: firstCity, distrito: firstDistrict });
      } else if (activeModal === 'ciudad') {
        const newDistricts = LocationService.getDistricts(item.value, currentDept);
        const firstDistrict = newDistricts[0] || '';
        onChange({ ...data, ciudad: item.value, distrito: firstDistrict });
      } else if (activeModal === 'distrito') {
        onChange({ ...data, distrito: item.value });
      }
      cerrarHoja();
    },
    [activeModal, cerrarHoja, currentCountry, currentDept, data, onChange],
  );

  const escrito = searchQuery.trim();
  const encabezadoDistrito =
    activeModal === 'distrito' && escrito.length > 0 ? (
      <View>
        <OpcionDeHoja etiqueta={`Usar «${escrito}»`} elegida={false} alTocar={usarLoEscrito} />
        {googleResults.length > 0 && (
          <View style={styles.sugerencias}>
            <View style={styles.rotuloSeccion}>
              <MicroLabel>Sugerencias</MicroLabel>
            </View>
            {googleResults.map(g => (
              <Pressable
                key={g.placeId}
                onPress={() => handleSelectGooglePlace(g)}
                accessibilityRole="button"
                accessibilityLabel={g.secondaryText ? `${g.mainText}, ${g.secondaryText}` : g.mainText}
                style={({ pressed }) => [styles.filaSugerencia, { backgroundColor: pressed ? c.goldWash : 'transparent' }]}
              >
                <Icon name="search" size={16} color={c.tabInactive} strokeWidth={1.4} />
                <View style={styles.textosSugerencia}>
                  <Text numberOfLines={1} style={[t.body, { color: c.textStrong, fontSize: 16 }]}>
                    {g.mainText}
                  </Text>
                  {Boolean(g.secondaryText) && (
                    <Text numberOfLines={1} style={[t.small, { color: c.textSoft }]}>
                      {g.secondaryText}
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
            {/* Exigido por la política de Google Places cuando sus resultados se muestran sin un mapa. */}
            <Text
              accessibilityLabel="Sugerencias con tecnología de Google"
              style={[t.small, styles.atribucion, { color: c.textSoft }]}
            >
              Powered by Google
            </Text>
          </View>
        )}
        {filteredLocalItems.length > 0 && (
          <View style={styles.rotuloSeccion}>
            <MicroLabel>{`Distritos de ${currentCity}`}</MicroLabel>
          </View>
        )}
      </View>
    ) : null;

  const filas: { tipo: Exclude<ModalType, null>; rotulo: string; valor: string; bandera?: string }[] = [
    { tipo: 'pais', rotulo: 'PAÍS', valor: data.pais || 'Perú', bandera: selectedCountryObj.flag },
    { tipo: 'departamento', rotulo: 'DEPTO / ESTADO', valor: data.departamento || availableStates[0] || 'Seleccionar' },
    { tipo: 'ciudad', rotulo: 'CIUDAD / PROVINCIA', valor: data.ciudad || availableCities[0] || 'Seleccionar' },
    { tipo: 'distrito', rotulo: 'DISTRITO / ZONA', valor: data.distrito || availableDistricts[0] || 'Seleccionar' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <MicroLabel>Ubicación geográfica</MicroLabel>
        <Presionable
          onPress={handleUseCurrentGPS}
          disabled={isDetectingGPS}
          accessibilityRole="button"
          accessibilityLabel="Usar mi ubicación"
          hitSlop={8}
          style={[styles.gpsBtn, { borderColor: c.gold, backgroundColor: isDetectingGPS ? c.cardBg : c.goldWash }]}
        >
          {isDetectingGPS ? <ActivityIndicator size="small" color={c.goldInk} /> : null}
          <Text style={[t.micro, { color: c.goldInk, fontSize: 10.5, fontFamily: 'Jost_700Bold' }]}>
            {isDetectingGPS ? 'DETECTANDO...' : '📍 MI UBICACIÓN'}
          </Text>
        </Presionable>
      </View>

      <View style={[styles.grupo, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
        {filas.map((fila, i) => (
          <Pressable
            key={fila.tipo}
            onPress={() => abrirHoja(fila.tipo)}
            accessibilityRole="button"
            accessibilityLabel={`${fila.rotulo.toLowerCase()}: ${fila.valor}`}
            style={({ pressed }) => [styles.filaGrupo, { backgroundColor: pressed ? c.goldWash : 'transparent' }]}
          >
            <View style={styles.textosFila}>
              <Text style={[t.micro, { color: c.textSoft, fontSize: 10.5 }]}>{fila.rotulo}</Text>
              <Text numberOfLines={1} style={[t.body, styles.valorFila, { color: c.textStrong }]}>
                {fila.bandera ? `${fila.bandera}  ${fila.valor}` : fila.valor}
              </Text>
            </View>
            <Icon name="chevron" size={14} color={c.chevron} />
            {i < filas.length - 1 && <View style={[styles.divisor, { backgroundColor: c.divider }]} />}
          </Pressable>
        ))}
      </View>

      <View style={{ gap: 4 }}>
        <Text style={[t.micro, { color: c.textSoft, fontSize: 10 }]}>DIRECCIÓN EXACTA / CALLE Y NÚMERO</Text>
        <View style={[styles.addressInputWrap, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
          <TextInput
            value={data.direccion || ''}
            onChangeText={val => onChange({ ...data, direccion: val })}
            placeholder="Ej. Av. Ejército 710, Dpto 402 / Calle Mercaderes 123"
            placeholderTextColor={c.tabInactive}
            accessibilityLabel="Dirección exacta, calle y número"
            style={[styles.addressTextInput, { color: c.textStrong }]}
          />
        </View>
      </View>

      {error && <Text style={[t.small, { color: c.danger, fontSize: 11.5 }]}>{error}</Text>}

      <HojaDeOpciones<ListItem>
        visible={activeModal !== null}
        alCerrar={cerrarHoja}
        titulo={getModalTitle()}
        opciones={filteredLocalItems}
        claveDe={claveDeItem}
        etiquetaDe={etiquetaDeItem}
        prefijoDe={prefijoDeItem}
        esElegida={esElegido}
        alElegir={elegirItem}
        busqueda={searchQuery}
        alBuscar={activeModal === 'distrito' ? handleDistrictSearchChange : setSearchQuery}
        buscando={activeModal === 'distrito' && isSearchingGoogle}
        autoCapitalize="words"
        placeholderBusqueda={
          activeModal === 'pais'
            ? 'Buscar país (ej. Bolivia, España, México...)'
            : activeModal === 'distrito'
            ? 'Buscar distrito (ej. Cayma, Yanahuara...)'
            : 'Escribe para filtrar...'
        }
        etiquetaBusqueda={activeModal === 'pais' ? 'Buscar país' : activeModal === 'distrito' ? 'Buscar distrito' : 'Filtrar la lista'}
        encabezadoDeLista={encabezadoDistrito}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 32,
  },
  grupo: {
    borderWidth: 1.5,
    borderRadius: 14,
    overflow: 'hidden',
  },
  filaGrupo: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  textosFila: {
    flex: 1,
    gap: 3,
  },
  valorFila: {
    fontSize: 16,
    fontFamily: 'Jost_500Medium',
  },
  divisor: {
    position: 'absolute',
    left: 16,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
  addressInputWrap: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
    justifyContent: 'center',
  },
  addressTextInput: {
    fontSize: 16,
    fontFamily: 'Jost_400Regular',
  },
  sugerencias: {
    paddingBottom: 4,
  },
  rotuloSeccion: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  filaSugerencia: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 12,
  },
  textosSugerencia: {
    flex: 1,
  },
  atribucion: {
    textAlign: 'right',
    paddingHorizontal: 20,
    paddingTop: 2,
    fontSize: 12,
  },
});
