import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Alert } from './Alerta';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from './Icon';
import { MicroLabel } from './ui';
import { LocationService, CountryOption, GooglePlaceResult } from '../services/locationService';

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
}

function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function LocationCascadePicker({
  data,
  onChange,
  error,
}: LocationCascadePickerProps) {
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
  const availableStates = useMemo(() => {
    return LocationService.getStates(currentCountry);
  }, [currentCountry]);

  const availableCities = useMemo(() => {
    return LocationService.getCities(currentCountry, currentDept || availableStates[0] || '');
  }, [currentCountry, currentDept, availableStates]);

  const availableDistricts = useMemo(() => {
    return LocationService.getDistricts(currentCity, currentDept);
  }, [currentCity, currentDept]);

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
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
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
    setActiveModal(null);
    setSearchQuery('');
    setGoogleResults([]);

    onChange({
      ...data,
      pais: g.pais || data.pais || 'Perú',
      departamento: g.departamento || data.departamento || '',
      ciudad: g.ciudad || data.ciudad || '',
      distrito: g.distrito || g.mainText || data.distrito || '',
    });
  };

  // Instant Local Filtered Items in 0ms (0 API Credits, 0 Lag)
  const filteredLocalItems = useMemo<ListItem[]>(() => {
    const q = normalize(searchQuery);
    if (activeModal === 'pais') {
      if (!q) return countriesList.map(ct => ({ label: `${ct.flag} ${ct.name}`, value: ct.name }));
      return countriesList
        .filter(ct => normalize(ct.name).includes(q) || ct.iso.toLowerCase().includes(q))
        .map(ct => ({ label: `${ct.flag} ${ct.name}`, value: ct.name }));
    }
    if (activeModal === 'departamento') {
      if (!q) return availableStates.map(d => ({ label: d, value: d }));
      return availableStates
        .filter(d => normalize(d).includes(q))
        .map(d => ({ label: d, value: d }));
    }
    if (activeModal === 'ciudad') {
      if (!q) return availableCities.map(ci => ({ label: ci, value: ci }));
      return availableCities
        .filter(ci => normalize(ci).includes(q))
        .map(ci => ({ label: ci, value: ci }));
    }
    if (activeModal === 'distrito') {
      if (!q) return availableDistricts.map(di => ({ label: di, value: di }));
      return availableDistricts
        .filter(di => normalize(di).includes(q))
        .map(di => ({ label: di, value: di }));
    }
    return [];
  }, [activeModal, searchQuery, countriesList, availableStates, availableCities, availableDistricts]);

  const getModalTitle = () => {
    if (activeModal === 'pais') return 'Selecciona tu País';
    if (activeModal === 'departamento') return 'Selecciona Departamento / Estado';
    if (activeModal === 'ciudad') return 'Selecciona Provincia / Ciudad';
    if (activeModal === 'distrito') return `Distritos de ${currentCity}`;
    return '';
  };

  // High-performance virtualized item renderer (Lazy list)
  const renderLocalItem = useCallback(({ item }: { item: ListItem }) => (
    <Pressable
      onPress={() => {
        if (activeModal === 'pais') {
          const newStates = LocationService.getStates(item.value);
          const firstState = newStates[0] || '';
          const newCities = LocationService.getCities(item.value, firstState);
          const firstCity = newCities[0] || '';
          const newDistricts = LocationService.getDistricts(firstCity, firstState);
          const firstDistrict = newDistricts[0] || '';
          onChange({
            ...data,
            pais: item.value,
            departamento: firstState,
            ciudad: firstCity,
            distrito: firstDistrict,
          });
        } else if (activeModal === 'departamento') {
          const newCities = LocationService.getCities(currentCountry, item.value);
          const firstCity = newCities[0] || '';
          const newDistricts = LocationService.getDistricts(firstCity, item.value);
          const firstDistrict = newDistricts[0] || '';
          onChange({
            ...data,
            departamento: item.value,
            ciudad: firstCity,
            distrito: firstDistrict,
          });
        } else if (activeModal === 'ciudad') {
          const newDistricts = LocationService.getDistricts(item.value, currentDept);
          const firstDistrict = newDistricts[0] || '';
          onChange({
            ...data,
            ciudad: item.value,
            distrito: firstDistrict,
          });
        } else if (activeModal === 'distrito') {
          onChange({
            ...data,
            distrito: item.value,
          });
        }
        setActiveModal(null);
        setSearchQuery('');
        setGoogleResults([]);
      }}
      style={[styles.itemRow, { borderColor: c.border }]}
    >
      <Text style={[t.body, { color: c.textStrong, fontSize: 14.5, flex: 1 }]}>
        {item.label}
      </Text>
      <Text style={[t.micro, { color: c.goldInk }]}>SELECCIONAR ›</Text>
    </Pressable>
  ), [activeModal, currentCountry, currentDept, data, onChange, c.border, c.gold, c.textStrong, t.body, t.micro]);

  const renderGoogleItem = useCallback(({ item }: { item: GooglePlaceResult }) => (
    <Pressable
      onPress={() => handleSelectGooglePlace(item)}
      style={[styles.googleItemRow, { borderColor: c.border }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[t.body, { color: c.textStrong, fontSize: 14.5, fontFamily: 'Jost_700Bold' }]}>
          {item.mainText}
        </Text>
        {Boolean(item.secondaryText) && (
          <Text style={[t.micro, { color: c.textSoft, fontSize: 11.5, marginTop: 1 }]}>
            {item.secondaryText}
          </Text>
        )}
      </View>
      <Text style={[t.micro, { color: c.goldInk, fontFamily: 'Jost_700Bold' }]}>SELECCIONAR ›</Text>
    </Pressable>
  ), [c.border, c.gold, c.textSoft, c.textStrong, t.body, t.micro]);

  return (
    <View style={styles.container}>
      {/* Header con Título y Botón GPS */}
      <View style={styles.headerRow}>
        <MicroLabel>UBICACIÓN GEOGRÁFICA</MicroLabel>
        <Pressable
          onPress={handleUseCurrentGPS}
          disabled={isDetectingGPS}
          style={[
            styles.gpsBtn,
            { borderColor: c.gold, backgroundColor: isDetectingGPS ? c.cardBg : c.goldWash },
          ]}
        >
          {isDetectingGPS ? (
            <ActivityIndicator size="small" color={c.goldInk} />
          ) : (
            <Icon name="spark" size={13} color={c.goldInk} />
          )}
          <Text style={[t.micro, { color: c.goldInk, fontSize: 10.5, fontFamily: 'Jost_700Bold' }]}>
            {isDetectingGPS ? 'DETECTANDO...' : '📍 MI UBICACIÓN'}
          </Text>
        </Pressable>
      </View>

      {/* Fila 1: Selector de País & Departamento */}
      <View style={styles.row}>
        {/* Selector País */}
        <View style={{ flex: 1 }}>
          <Text style={[t.micro, { color: c.textSoft, marginBottom: 4, fontSize: 10 }]}>PAÍS</Text>
          <Pressable
            onPress={() => {
              setSearchQuery('');
              setActiveModal('pais');
            }}
            style={[styles.pickerBtn, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}
          >
            <Text style={[t.body, { color: data.pais ? c.textStrong : c.tabInactive, fontSize: 14 }]} numberOfLines={1}>
              {selectedCountryObj.flag} {data.pais || 'Perú'}
            </Text>
            <Text style={[t.micro, { color: c.goldInk }]}>▾</Text>
          </Pressable>
        </View>

        {/* Selector Departamento / Estado */}
        <View style={{ flex: 1 }}>
          <Text style={[t.micro, { color: c.textSoft, marginBottom: 4, fontSize: 10 }]}>DEPTO / ESTADO</Text>
          <Pressable
            onPress={() => {
              setSearchQuery('');
              setActiveModal('departamento');
            }}
            style={[styles.pickerBtn, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}
          >
            <Text style={[t.body, { color: data.departamento ? c.textStrong : c.tabInactive, fontSize: 14 }]} numberOfLines={1}>
              {data.departamento || availableStates[0] || 'Seleccionar'}
            </Text>
            <Text style={[t.micro, { color: c.goldInk }]}>▾</Text>
          </Pressable>
        </View>
      </View>

      {/* Fila 2: Selector de Ciudad & Distrito */}
      <View style={styles.row}>
        {/* Selector Ciudad */}
        <View style={{ flex: 1 }}>
          <Text style={[t.micro, { color: c.textSoft, marginBottom: 4, fontSize: 10 }]}>CIUDAD / PROVINCIA</Text>
          <Pressable
            onPress={() => {
              setSearchQuery('');
              setActiveModal('ciudad');
            }}
            style={[styles.pickerBtn, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}
          >
            <Text style={[t.body, { color: data.ciudad ? c.textStrong : c.tabInactive, fontSize: 14 }]} numberOfLines={1}>
              {data.ciudad || availableCities[0] || 'Seleccionar'}
            </Text>
            <Text style={[t.micro, { color: c.goldInk }]}>▾</Text>
          </Pressable>
        </View>

        {/* Selector Distrito con Lista Mapeada y Búsqueda en Google Places */}
        <View style={{ flex: 1 }}>
          <Text style={[t.micro, { color: c.textSoft, marginBottom: 4, fontSize: 10 }]}>DISTRITO / ZONA</Text>
          <Pressable
            onPress={() => {
              setSearchQuery('');
              setActiveModal('distrito');
            }}
            style={[
              styles.pickerBtn,
              {
                borderColor: data.distrito ? c.gold : c.borderStrong,
                backgroundColor: c.cardBgAlt,
              },
            ]}
          >
            <Text
              style={[
                t.body,
                {
                  color: data.distrito ? c.textStrong : c.tabInactive,
                  fontSize: 14,
                  fontFamily: data.distrito ? 'Jost_500Medium' : 'Jost_400Regular',
                },
              ]}
              numberOfLines={1}
            >
              {data.distrito || availableDistricts[0] || 'Seleccionar ▾'}
            </Text>
            <Text style={[t.micro, { color: c.goldInk }]}>▾</Text>
          </Pressable>
        </View>
      </View>

      {/* Fila 3: Campo Dedicado Separado para Calle y Número */}
      <View style={{ gap: 4 }}>
        <Text style={[t.micro, { color: c.textSoft, fontSize: 10 }]}>DIRECCIÓN EXACTA / CALLE Y NÚMERO</Text>
        <View style={[styles.addressInputWrap, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}>
          <TextInput
            value={data.direccion || ''}
            onChangeText={val => onChange({ ...data, direccion: val })}
            placeholder="Ej. Av. Ejército 710, Dpto 402 / Calle Mercaderes 123"
            placeholderTextColor={c.tabInactive}
            style={[styles.addressTextInput, { color: c.textStrong }]}
          />
        </View>
      </View>

      {error && <Text style={[t.small, { color: c.danger, fontSize: 11.5 }]}>{error}</Text>}

      {/* Modal Interactivo con Virtualized FlatList (0ms) */}
      <Modal
        visible={activeModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setActiveModal(null);
          setSearchQuery('');
          setGoogleResults([]);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: c.cardBg, borderColor: c.gold }]}>
            <View style={styles.modalHeader}>
              <MicroLabel>UBICACIÓN RENASER</MicroLabel>
              <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 18, marginTop: 2 }]}>
                {getModalTitle()}
              </Text>
            </View>

            {/* Input de Búsqueda */}
            <View style={[styles.searchBox, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
              <Icon name="spark" size={16} color={c.goldInk} />
              <TextInput
                value={searchQuery}
                onChangeText={activeModal === 'distrito' ? handleDistrictSearchChange : setSearchQuery}
                placeholder={
                  activeModal === 'pais'
                    ? 'Buscar país (ej. Bolivia, España, México...)'
                    : activeModal === 'distrito'
                    ? 'Buscar distrito (ej. Cayma, Yanahuara, Paucarpata...)'
                    : 'Escribe para filtrar...'
                }
                placeholderTextColor={c.tabInactive}
                style={[styles.searchInput, { color: c.textStrong }]}
                autoCapitalize="words"
                autoFocus
              />
              {isSearchingGoogle && <ActivityIndicator size="small" color={c.goldInk} />}
            </View>

            {/* Opción Manual de Distrito */}
            {searchQuery.trim().length > 0 && activeModal === 'distrito' && (
              <Pressable
                onPress={() => {
                  onChange({
                    ...data,
                    distrito: searchQuery.trim(),
                  });
                  setActiveModal(null);
                  setSearchQuery('');
                  setGoogleResults([]);
                }}
                style={[styles.customOptionBtn, { borderColor: c.gold, backgroundColor: c.goldWash }]}
              >
                <Icon name="check" size={14} color={c.goldInk} />
                <Text style={[t.body, { color: c.goldInk, fontSize: 13.5, fontFamily: 'Jost_700Bold', flex: 1 }]}>
                  USAR: "{searchQuery.trim()}"
                </Text>
                <Text style={[t.micro, { color: c.goldInk }]}>SELECCIONAR</Text>
              </Pressable>
            )}

            {/* Si hay resultados de Google Places cuando escribe */}
            {googleResults.length > 0 && activeModal === 'distrito' && (
              <View style={styles.googleSection}>
                <View style={styles.googleHeader}>
                  <Icon name="spark" size={12} color={c.goldInk} />
                  <Text style={[t.micro, { color: c.goldInk, fontSize: 11, fontFamily: 'Jost_700Bold' }]}>
                    SUGERENCIAS EN VIVO (GOOGLE PLACES)
                  </Text>
                </View>
                <FlatList
                  data={googleResults}
                  keyExtractor={item => item.placeId}
                  renderItem={renderGoogleItem}
                  style={{ maxHeight: 110 }}
                  keyboardShouldPersistTaps="handled"
                />
              </View>
            )}

            {/* Lista Mapeada Principal (FlatList Lazy 0ms) */}
            <FlatList
              data={filteredLocalItems}
              keyExtractor={item => item.value}
              renderItem={renderLocalItem}
              style={styles.itemsScroll}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={3}
              removeClippedSubviews={true}
              getItemLayout={(_, index) => ({ length: 48, offset: 48 * index, index })}
            />

            <Pressable
              onPress={() => {
                setActiveModal(null);
                setSearchQuery('');
                setGoogleResults([]);
              }}
              style={[styles.closeBtn, { borderColor: c.border }]}
            >
              <Text style={[t.micro, { color: c.textSoft, fontSize: 11, fontFamily: 'Jost_700Bold', textAlign: 'center' }]}>
                CERRAR
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
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
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  addressInputWrap: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    justifyContent: 'center',
  },
  addressTextInput: {
    fontSize: 14.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: 560,
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  modalHeader: {
    alignItems: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14.5,
  },
  customOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  googleSection: {
    gap: 4,
    maxHeight: 130,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(178,146,79,0.2)',
    paddingBottom: 4,
  },
  googleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  googleItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    height: 44,
  },
  itemsScroll: {
    maxHeight: 240,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    height: 48,
  },
  closeBtn: {
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
  },
});
