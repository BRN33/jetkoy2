import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface Suggestion {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

export interface AddressResult {
  text: string;
  lat: number;
  lng: number;
}

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSelect?: (result: AddressResult) => void;
  placeholder?: string;
}

export function AddressInput({ value, onChangeText, onSelect, placeholder }: Props) {
  const colors = useColors();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((text: string) => {
    onChangeText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}, İstanbul&format=json&limit=6&countrycodes=tr&accept-language=tr&viewbox=28.0,40.7,29.9,41.4&bounded=1`;
        const res = await fetch(url, { headers: { "User-Agent": "JetKoy/1.0" } });
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [onChangeText]);

  const pick = (item: Suggestion) => {
    const short = item.display_name.split(",").slice(0, 2).join(",").trim();
    onChangeText(short);
    onSelect?.({ text: short, lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.inputRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          value={value}
          onChangeText={search}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          autoCorrect={false}
        />
        {loading && <ActivityIndicator size="small" color={colors.mutedForeground} style={{ marginRight: 12 }} />}
      </View>
      {open && (
        <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.place_id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => (
              <Pressable
                onPress={() => pick(item)}
                style={[
                  styles.item,
                  index < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <Text style={[styles.itemText, { color: colors.foreground }]} numberOfLines={2}>
                  {item.display_name}
                </Text>
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative", zIndex: 10 },
  inputRow: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 16,
    fontSize: 16,
  },
  dropdown: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 12,
    maxHeight: 200,
    overflow: "hidden",
    zIndex: 100,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  item: { padding: 14 },
  itemText: { fontSize: 14, lineHeight: 20 },
});
