import React, { useState } from "react";
import "../styles/LocationPicker.css";

function LocationPicker({ value, onChange }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Safely convert coordinates to numbers.
    const latitude =
        value?.latitude !== null &&
        value?.latitude !== undefined &&
        value?.latitude !== ""
            ? Number(value.latitude)
            : null;

    const longitude =
        value?.longitude !== null &&
        value?.longitude !== undefined &&
        value?.longitude !== ""
            ? Number(value.longitude)
            : null;

    const hasValidCoordinates =
        latitude !== null &&
        longitude !== null &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180;

    const useCurrentLocation = () => {
        if (!navigator.geolocation) {
            setError(
                "Location services are not supported by this browser."
            );
            return;
        }

        setLoading(true);
        setError("");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const rawLat = position.coords.latitude;
                const rawLon = position.coords.longitude;
                const latitude = Number(Number(rawLat).toFixed(6));
                const longitude = Number(Number(rawLon).toFixed(6));

                let locationName = "Current location";

                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${rawLat}&lon=${rawLon}`
                    );

                    if (!response.ok) {
                        throw new Error("Unable to retrieve location name.");
                    }

                    const data = await response.json();

                    locationName =
                        data.display_name || "Current location";
                } catch {
                    locationName = "Current location";
                }

                onChange({
                    location_name: locationName,
                    latitude: latitude,
                    longitude: longitude,
                });

                setLoading(false);
            },
            () => {
                setError(
                    "Unable to access your location. Please allow location permission or try again."
                );

                setLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    };

    return (
        <div className="location-picker">
            <div className="location-picker-header">
                <div>
                    <label>
                        Location <span>*</span>
                    </label>

                    <p>
                        Select your current location or use
                        the location detected by your device.
                    </p>
                </div>

                <button
                    type="button"
                    className="location-current-button"
                    onClick={useCurrentLocation}
                    disabled={loading}
                >
                    {loading
                        ? "Detecting..."
                        : "📍 Use my location"}
                </button>
            </div>

            <div className="location-input-box">
                <span className="location-icon">📍</span>

                <input
                    type="text"
                    value={value?.location_name || ""}
                    onChange={(e) =>
                        onChange({
                            location_name: e.target.value,
                            latitude: value?.latitude ?? null,
                            longitude: value?.longitude ?? null,
                        })
                    }
                    placeholder="Enter location or click 'Use my location'"
                />
            </div>

            {hasValidCoordinates && (
                <div className="location-selected">
                    <strong>Location selected</strong>

                    <span>
                        Latitude: {latitude.toFixed(6)}
                    </span>

                    <span>
                        Longitude: {longitude.toFixed(6)}
                    </span>
                </div>
            )}

            {error && (
                <small className="location-error">
                    {error}
                </small>
            )}
        </div>
    );
}

export default LocationPicker;