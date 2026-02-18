import React, { _useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useQuery } from "@tanstack/react-query";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../../services/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Navigation = NativeStackNavigationProp<any>;

interface Props {
  navigation: Navigation;
}

interface Machine {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: "active" | "low_stock" | "error" | "offline";
  distance?: number;
}

const COLORS = {
  primary: "#4F46E5",
  green: "#10B981",
  red: "#EF4444",
  amber: "#F59E0B",
  blue: "#3B82F6",
  bg: "#F9FAFB",
  card: "#fff",
  text: "#1F2937",
  muted: "#6B7280",
};

const statusColors = {
  active: COLORS.green,
  low_stock: COLORS.amber,
  error: COLORS.red,
  offline: COLORS.muted,
};

export function MapScreen({ navigation }: Props) {
  const mapRef = useRef<MapView>(null);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const bottomSheetAnim = useRef(new Animated.Value(0)).current;

  const { data: machines, isLoading } = useQuery({
    queryKey: ["machines-map"],
    queryFn: () => api.get("/machines/map").then((res) => res.data),
    staleTime: 3 * 60 * 1000,
  });

  const { data: userLocation } = useQuery({
    queryKey: ["user-location"],
    queryFn: () => api.get("/location/current").then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const handleMarkerPress = (machine: Machine) => {
    setSelectedMachine(machine);
    mapRef.current?.animateToRegion({
      latitude: machine.latitude,
      longitude: machine.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
    Animated.spring(bottomSheetAnim, {
      toValue: 1,
      useNativeDriver: false,
    }).start();
  };

  const handleMyLocation = async () => {
    if (userLocation) {
      mapRef.current?.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  const filteredMachines =
    machines?.filter((m: Machine) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  const bottomSheetHeight = bottomSheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search machines..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.muted}
        />
      </View>

      {/* Map View */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: userLocation?.latitude || 41.2995,
              longitude: userLocation?.longitude || 69.2401,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {/* User Location Marker */}
            {userLocation && (
              <Marker
                coordinate={{
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                }}
                title="Your Location"
              >
                <View style={styles.userLocationMarker} />
              </Marker>
            )}

            {/* Machine Markers */}
            {filteredMachines.map((machine: Machine) => (
              <Marker
                key={machine.id}
                coordinate={{
                  latitude: machine.latitude,
                  longitude: machine.longitude,
                }}
                onPress={() => handleMarkerPress(machine)}
              >
                <View
                  style={[
                    styles.markerPin,
                    {
                      backgroundColor: statusColors[machine.status],
                      borderColor: statusColors[machine.status],
                    },
                  ]}
                >
                  <Ionicons name="cafe" size={18} color={COLORS.card} />
                </View>
              </Marker>
            ))}
          </MapView>

          {/* My Location Button */}
          <TouchableOpacity
            style={styles.myLocationButton}
            onPress={handleMyLocation}
          >
            <Ionicons name="locate" size={24} color={COLORS.primary} />
          </TouchableOpacity>

          {/* Bottom Sheet - Selected Machine Info */}
          {selectedMachine && (
            <Animated.View
              style={[styles.bottomSheet, { height: bottomSheetHeight }]}
            >
              <View style={styles.bottomSheetContent}>
                <View style={styles.dragHandle} />

                <View style={styles.machineInfoHeader}>
                  <View>
                    <Text style={styles.machineName}>
                      {selectedMachine.name}
                    </Text>
                    <View style={styles.statusContainer}>
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor:
                              statusColors[selectedMachine.status],
                          },
                        ]}
                      />
                      <Text style={styles.statusLabel}>
                        {selectedMachine.status.replace("_", " ")}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      Animated.spring(bottomSheetAnim, {
                        toValue: 0,
                        useNativeDriver: false,
                      }).start();
                      setSelectedMachine(null);
                    }}
                  >
                    <Ionicons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.distanceInfo}>
                  <Ionicons name="location" size={16} color={COLORS.muted} />
                  <Text style={styles.distanceText}>
                    {selectedMachine.distance || "N/A"} km away
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.viewMenuButton}
                  onPress={() => {
                    navigation.navigate("Menu", {
                      machineId: selectedMachine.id,
                    });
                    Animated.spring(bottomSheetAnim, {
                      toValue: 0,
                      useNativeDriver: false,
                    }).start();
                  }}
                >
                  <Text style={styles.viewMenuButtonText}>View Menu</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={COLORS.card}
                  />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.text,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  map: {
    flex: 1,
  },
  userLocationMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.blue,
    borderWidth: 3,
    borderColor: COLORS.card,
  },
  markerPin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  myLocationButton: {
    position: "absolute",
    bottom: 260,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  bottomSheetContent: {
    flex: 1,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.bg,
    alignSelf: "center",
    marginBottom: 12,
  },
  machineInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  machineName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  distanceInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  distanceText: {
    marginLeft: 6,
    fontSize: 13,
    color: COLORS.muted,
  },
  viewMenuButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  viewMenuButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.card,
    marginRight: 8,
  },
});
