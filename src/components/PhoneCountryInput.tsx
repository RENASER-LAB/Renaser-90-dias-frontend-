import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from './Icon';
import { MicroLabel } from './ui';
import {
  PhoneCountry,
  ALL_WORLD_PHONE_COUNTRIES,
  searchPhoneCountries,
  findCountryByCodeOrIso,
} from '../services/phoneCountriesService';

interface PhoneCountryInputProps {
  label: string;
  value: string;
  onChange: (fullNumber: string, countryCode: string, localNumber: string) => void;
  helperText?: string;
  error?: string;
}

// Memoized Country Row for 0ms Rendering
const CountryRow = React.memo(
  ({
    item,
    isSelected,
    onSelect,
    themeColors,
    bodyStyle,
    microStyle,
  }: {
    item: PhoneCountry;
    isSelected: boolean;
    onSelect: (item: PhoneCountry) => void;
    themeColors: any;
    bodyStyle: any;
    microStyle: any;
  }) => {
    return (
      <Pressable
        onPress={() => onSelect(item)}
        style={[
          styles.countryRow,
          {
            borderColor: isSelected ? themeColors.gold : themeColors.border,
            backgroundColor: isSelected ? themeColors.cardBgAlt : 'transparent',
          },
        ]}
      >
        <Text style={styles.rowFlag}>{item.flag}</Text>
        <Text style={[bodyStyle, { color: themeColors.textStrong, flex: 1, fontSize: 14.5 }]}>
          {item.name}
        </Text>
        <Text style={[microStyle, { color: themeColors.gold, fontFamily: 'Jost_700Bold', fontSize: 13 }]}>
          {item.code}
        </Text>
      </Pressable>
    );
  }
);

export function PhoneCountryInput({
  label,
  value,
  onChange,
  helperText,
  error,
}: PhoneCountryInputProps) {
  const { c, t } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Extract initial country and local number
  const [selectedCountry, setSelectedCountry] = useState<PhoneCountry>(() => {
    // Try fast prefix match
    const match = ALL_WORLD_PHONE_COUNTRIES.find(ct => value && value.startsWith(ct.code));
    return match || ALL_WORLD_PHONE_COUNTRIES[0];
  });

  // Extract local phone number from full value
  const localNumber = useMemo(() => {
    if (!value) return '';
    if (value.startsWith(selectedCountry.code)) {
      return value.slice(selectedCountry.code.length).trim();
    }
    return value;
  }, [value, selectedCountry.code]);

  // Instant pre-indexed search
  const filteredCountries = useMemo(() => {
    return searchPhoneCountries(searchQuery);
  }, [searchQuery]);

  const handleSelectCountry = useCallback(
    (ct: PhoneCountry) => {
      setSelectedCountry(ct);
      setModalVisible(false);
      setSearchQuery('');
      onChange(`${ct.code} ${localNumber}`, ct.code, localNumber);
    },
    [localNumber, onChange]
  );

  const handleLocalNumberChange = (text: string) => {
    const numericOnly = text.replace(/[^\d]/g, '');
    onChange(`${selectedCountry.code} ${numericOnly}`, selectedCountry.code, numericOnly);
  };

  const renderCountryItem = useCallback(
    ({ item }: { item: PhoneCountry }) => (
      <CountryRow
        item={item}
        isSelected={item.code === selectedCountry.code && item.name === selectedCountry.name}
        onSelect={handleSelectCountry}
        themeColors={c}
        bodyStyle={t.body}
        microStyle={t.micro}
      />
    ),
    [c, handleSelectCountry, selectedCountry.code, selectedCountry.name, t.body, t.micro]
  );

  return (
    <View style={styles.container}>
      <View style={styles.labelGroup}>
        <MicroLabel>{label}</MicroLabel>
        {helperText && (
          <Text style={[t.small, { color: c.textSoft, fontSize: 12, lineHeight: 16, marginTop: 2 }]}>
            {helperText}
          </Text>
        )}
      </View>

      <View style={styles.inputRow}>
        {/* Country Code Selector Pill */}
        <Pressable
          onPress={() => {
            setSearchQuery('');
            setModalVisible(true);
          }}
          style={[
            styles.countryPill,
            {
              borderColor: c.borderStrong,
              backgroundColor: c.cardBgAlt,
            },
          ]}
        >
          <Text style={styles.flagText}>{selectedCountry.flag}</Text>
          <Text style={[t.body, { color: c.goldInk, fontFamily: 'Jost_700Bold', fontSize: 14 }]}>
            {selectedCountry.code}
          </Text>
          <Text style={[t.micro, { color: c.tabInactive, fontSize: 10 }]}>▾</Text>
        </Pressable>

        {/* Local Number Input */}
        <View
          style={[
            styles.phoneInputWrap,
            {
              borderColor: error ? c.danger : c.borderStrong,
              backgroundColor: c.cardBgAlt,
            },
          ]}
        >
          <TextInput
            value={localNumber}
            onChangeText={handleLocalNumberChange}
            placeholder={selectedCountry.example || '999 999 999'}
            placeholderTextColor={c.tabInactive}
            keyboardType="phone-pad"
            maxLength={selectedCountry.maxDigits || 12}
            style={[styles.phoneTextInput, { color: c.textStrong }]}
          />
        </View>
      </View>

      {error && (
        <Text style={[t.small, { color: c.danger, fontSize: 11.5, marginTop: 2 }]}>
          {error}
        </Text>
      )}

      {/* Searchable Country Modal with Lazy FlatList */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModalVisible(false);
          setSearchQuery('');
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: c.cardBg, borderColor: c.gold }]}>
            <View style={styles.modalHeader}>
              <MicroLabel>PAÍS Y PREFIJO TELEFÓNICO (TODOS LOS PAÍSES)</MicroLabel>
              <Text style={[t.screenTitle, { color: c.textStrong, fontSize: 18, marginTop: 2 }]}>
                Selecciona tu País
              </Text>
            </View>

            {/* Search input */}
            <View style={[styles.searchBox, { borderColor: c.border, backgroundColor: c.cardBgAlt }]}>
              <Icon name="spark" size={16} color={c.goldInk} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Buscar país o prefijo (ej. Perú, Montenegro, +51...)"
                placeholderTextColor={c.tabInactive}
                style={[styles.searchInput, { color: c.textStrong }]}
                autoCapitalize="none"
                autoFocus
              />
            </View>

            {/* Virtualized Lazy Country FlatList (0ms, 60 FPS) */}
            <FlatList
              data={filteredCountries}
              keyExtractor={item => `${item.iso}-${item.code}-${item.name}`}
              renderItem={renderCountryItem}
              style={styles.countryScroll}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={3}
              removeClippedSubviews={true}
              getItemLayout={(_, index) => ({ length: 48, offset: 48 * index, index })}
            />

            <Pressable
              onPress={() => {
                setModalVisible(false);
                setSearchQuery('');
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
    gap: 6,
    width: '100%',
  },
  labelGroup: {
    marginBottom: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 50,
    gap: 6,
  },
  flagText: {
    fontSize: 18,
  },
  phoneInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 12,
  },
  phoneTextInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
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
    maxHeight: 520,
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
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  countryScroll: {
    maxHeight: 280,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    gap: 10,
    height: 48,
  },
  rowFlag: {
    fontSize: 20,
  },
  closeBtn: {
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
  },
});
