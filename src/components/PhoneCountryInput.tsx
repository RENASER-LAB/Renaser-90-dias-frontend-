import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from './Icon';
import { MicroLabel } from './ui';
import { Presionable } from './Presionable';
import { HojaDeOpciones } from './hojaDesdeAbajo/HojaDeOpciones';
import { PhoneCountry, ALL_WORLD_PHONE_COUNTRIES, searchPhoneCountries } from '../services/phoneCountriesService';
import { useEnfocarAlLlegar } from '../hooks/useEnfocarAlLlegar';

interface PhoneCountryInputProps {
  /** Vacío = sin rótulo arriba (cuando el título de la pantalla ya dice qué se pide). */
  label: string;
  value: string;
  onChange: (fullNumber: string, countryCode: string, localNumber: string) => void;
  helperText?: string;
  error?: string;
  /**
   * Lo que necesita el campo del número para comportarse como en una app (2026-10-05, onboarding
   * de un paso por pantalla): abrir el teclado solo al llegar (con `useEnfocarAlLlegar`, no con el
   * `autoFocus` del `TextInput`, que en Android no abre el teclado al montar), y que la tecla de
   * acción del teclado lleve al paso siguiente en vez de sólo cerrarlo.
   */
  autoFocus?: boolean;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
}

const claveDePais = (pais: PhoneCountry) => `${pais.iso}-${pais.code}-${pais.name}`;
const nombreDePais = (pais: PhoneCountry) => pais.name;
const banderaDePais = (pais: PhoneCountry) => pais.flag;
const prefijoDePais = (pais: PhoneCountry) => pais.code;

/**
 * El WhatsApp de la Ficha Inicial: la píldora del país (bandera y prefijo) y el número.
 *
 * La píldora abre una hoja desde abajo con buscador (2026-10-05; antes, un diálogo centrado con
 * «CERRAR»): los 249 países en una lista virtualizada, el elegido marcado y a la vista, y la búsqueda
 * por nombre sin tildes, por prefijo o por código ISO (`searchPhoneCountries`, sin cambios). Lo que
 * se guarda no cambió: `"+51 987654321"` y el prefijo por separado.
 */
export function PhoneCountryInput({
  label,
  value,
  onChange,
  helperText,
  error,
  autoFocus,
  returnKeyType,
  onSubmitEditing,
}: PhoneCountryInputProps) {
  const { c, t } = useTheme();
  const campoNumero = useRef<TextInput>(null);
  useEnfocarAlLlegar(campoNumero, Boolean(autoFocus));
  const [hojaAbierta, setHojaAbierta] = useState(false);
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
  const filteredCountries = useMemo(() => searchPhoneCountries(searchQuery), [searchQuery]);

  const cerrarHoja = useCallback(() => {
    setHojaAbierta(false);
    setSearchQuery('');
  }, []);

  const handleSelectCountry = useCallback(
    (ct: PhoneCountry) => {
      setSelectedCountry(ct);
      cerrarHoja();
      onChange(`${ct.code} ${localNumber}`, ct.code, localNumber);
    },
    [cerrarHoja, localNumber, onChange],
  );

  const esElPaisElegido = useCallback(
    (ct: PhoneCountry) => ct.code === selectedCountry.code && ct.name === selectedCountry.name,
    [selectedCountry.code, selectedCountry.name],
  );

  const handleLocalNumberChange = (text: string) => {
    const numericOnly = text.replace(/[^\d]/g, '');
    onChange(`${selectedCountry.code} ${numericOnly}`, selectedCountry.code, numericOnly);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelGroup}>
        {Boolean(label) && <MicroLabel>{label}</MicroLabel>}
        {helperText && (
          <Text style={[t.small, { color: c.textSoft, fontSize: 12, lineHeight: 16, marginTop: 2 }]}>{helperText}</Text>
        )}
      </View>

      <View style={styles.inputRow}>
        <Presionable
          onPress={() => {
            setSearchQuery('');
            setHojaAbierta(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Código de país: ${selectedCountry.name}, ${selectedCountry.code}`}
          accessibilityHint="Abre la lista de países"
          style={[styles.countryPill, { borderColor: c.borderStrong, backgroundColor: c.cardBgAlt }]}
        >
          <Text style={styles.flagText}>{selectedCountry.flag}</Text>
          <Text style={[t.body, { color: c.textStrong, fontFamily: 'Jost_500Medium', fontSize: 16 }]}>
            {selectedCountry.code}
          </Text>
          <View style={styles.flechaAbajo}>
            <Icon name="chevron" size={12} color={c.chevron} />
          </View>
        </Presionable>

        <View
          style={[
            styles.phoneInputWrap,
            { borderColor: error ? c.danger : c.borderStrong, backgroundColor: c.cardBgAlt },
          ]}
        >
          <TextInput
            value={localNumber}
            onChangeText={handleLocalNumberChange}
            placeholder={selectedCountry.example || '999 999 999'}
            placeholderTextColor={c.tabInactive}
            keyboardType="phone-pad"
            // El prefijo va en la píldora de al lado: lo que se autocompleta es el número local.
            autoComplete="tel-national"
            textContentType="telephoneNumber"
            accessibilityLabel={label || 'Número de WhatsApp'}
            ref={campoNumero}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            maxLength={selectedCountry.maxDigits || 12}
            style={[styles.phoneTextInput, { color: c.textStrong, fontFamily: 'Jost_400Regular' }]}
          />
        </View>
      </View>

      {error && <Text style={[t.small, { color: c.danger, fontSize: 11.5, marginTop: 2 }]}>{error}</Text>}

      <HojaDeOpciones<PhoneCountry>
        visible={hojaAbierta}
        alCerrar={cerrarHoja}
        titulo="Código de país"
        opciones={filteredCountries}
        claveDe={claveDePais}
        etiquetaDe={nombreDePais}
        prefijoDe={banderaDePais}
        detalleDe={prefijoDePais}
        esElegida={esElPaisElegido}
        alElegir={handleSelectCountry}
        busqueda={searchQuery}
        alBuscar={setSearchQuery}
        placeholderBusqueda="Buscar país o prefijo (ej. Perú, +51)"
        etiquetaBusqueda="Buscar país o prefijo"
      />
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
    paddingHorizontal: 12,
    height: 52,
    gap: 6,
  },
  flagText: {
    fontSize: 20,
  },
  flechaAbajo: {
    transform: [{ rotate: '90deg' }],
    marginLeft: 2,
  },
  phoneInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 12,
  },
  phoneTextInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
});
