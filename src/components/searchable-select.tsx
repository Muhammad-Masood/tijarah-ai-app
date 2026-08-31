import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SearchableSelectOption = {
  label: string;
  value: string;
};

type SearchableSelectProps = {
  label: string;
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function SearchableSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
}: SearchableSelectProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, options]);

  function openModal() {
    if (disabled) return;
    setSearchQuery('');
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
    setSearchQuery('');
  }

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    closeModal();
  }

  return (
    <View style={styles.fieldGroup}>
      <ThemedText type="bodyMd" themeColor="textSecondary">{label}</ThemedText>
      <Pressable
        onPress={openModal}
        disabled={disabled}
        style={[
          styles.trigger,
          {
            backgroundColor: theme.surfaceContainerLowest,
            borderColor: isOpen ? theme.primary : theme.border,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Select ${label}`}
        accessibilityState={{ disabled, expanded: isOpen }}>
        <ThemedText type="bodyLg" themeColor={value ? 'text' : 'textSecondary'} style={styles.triggerValue} numberOfLines={1}>
          {value ? selectedLabel : placeholder}
        </ThemedText>
        {value ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onChange('');
            }}
            hitSlop={8}
            accessibilityLabel={`Clear ${label}`}>
            <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
        )}
      </Pressable>

      <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
        <ThemedView style={styles.modalScreen}>
          <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Pressable onPress={closeModal} style={styles.modalAction}>
                <ThemedText type="bodyMd" themeColor="primary">Close</ThemedText>
              </Pressable>
              <ThemedText type="headlineSm" style={styles.modalTitle} numberOfLines={1}>{label}</ThemedText>
              <View style={styles.modalAction} />
            </View>
            <View style={[styles.searchRow, { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest }]}>
              <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search options"
                placeholderTextColor={theme.textSecondary}
                autoCorrect={false}
                autoCapitalize="none"
                style={[styles.searchInput, { color: theme.text }]}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8} accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                </Pressable>
              ) : null}
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              {filteredOptions.length === 0 ? (
                <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.emptyState}>
                  No options match your search.
                </ThemedText>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => handleSelect(option.value)}
                      style={[
                        styles.optionItem,
                        {
                          borderColor: isSelected ? theme.primary : theme.border,
                          backgroundColor: isSelected ? theme.primaryContainer : theme.surfaceContainerLowest,
                        },
                      ]}>
                      <ThemedText type="bodyMd" themeColor={isSelected ? 'onPrimaryContainer' : 'text'} style={styles.optionLabel}>
                        {option.label}
                      </ThemedText>
                      {isSelected ? <Ionicons name="checkmark-circle" size={20} color={theme.primary} /> : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </SafeAreaView>
        </ThemedView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: Spacing.one,
  },
  trigger: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  triggerValue: {
    flex: 1,
  },
  modalScreen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  modalHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
  },
  modalAction: {
    width: 64,
    minHeight: 44,
    justifyContent: 'center',
  },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
  },
  searchRow: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.three,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingHorizontal: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.two,
  },
  modalContent: {
    padding: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  optionItem: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  optionLabel: {
    flex: 1,
  },
  emptyState: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
});
