'use client';

import 'leaflet/dist/leaflet.css';
import { useMemo } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from 'react-leaflet';

type Coordinates = {
    lat: number;
    lng: number;
};

type Props = {
    value: Coordinates | null;
    onChange: (next: Coordinates) => void;
};

const DEFAULT_CENTER: Coordinates = { lat: 30.04442, lng: 31.235712 };

function PickerEvents({ onChange }: { onChange: (next: Coordinates) => void }) {
    useMapEvents({
        click(event) {
            onChange({ lat: event.latlng.lat, lng: event.latlng.lng });
        },
    });

    return null;
}

export default function MapPickerCanvas({ value, onChange }: Props) {
    const center = useMemo(() => value || DEFAULT_CENTER, [value]);

    return (
        <MapContainer center={center} zoom={11} style={{ height: 360, width: '100%' }} scrollWheelZoom>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <PickerEvents onChange={onChange} />
            {value && (
                <CircleMarker center={[value.lat, value.lng]} radius={8} pathOptions={{ color: '#1B6B45', fillColor: '#1B6B45', fillOpacity: 0.85 }} />
            )}
        </MapContainer>
    );
}
