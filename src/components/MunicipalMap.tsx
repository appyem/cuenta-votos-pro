import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para los íconos de Leaflet en React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MunicipalityData {
  [key: string]: {
    reportedTables: number;
    totalTables: number;
    totalVotes: number;
    leadingCandidate?: string;
    progress: number;
  };
}

interface MunicipalMapProps {
  data?: MunicipalityData;
  onMunicipalityClick?: (municipioId: string) => void;
}

export default function MunicipalMap({ data, onMunicipalityClick }: MunicipalMapProps) {
  const [geojsonData, setGeojsonData] = useState<GeoJSON.GeoJsonObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar GeoJSON al montar
  useEffect(() => {
    fetch('/caldas-municipios.geojson')
      .then(response => {
        if (!response.ok) throw new Error('Error al cargar el mapa de Caldas');
        return response.json();
      })
      .then(json => {
        setGeojsonData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error cargando GeoJSON:', err);
        setError('No se pudo cargar el mapa de Caldas. Verifica que el archivo exista en /public/caldas-municipios.geojson');
        setLoading(false);
      });
  }, []);

  // Estilo dinámico para cada municipio
  const getMunicipalityStyle = (feature: any): L.PathOptions => {
    const municipioName = feature.properties.MPIO_CNMBR.toLowerCase();
    const municipioData = data?.[municipioName];
    
    let fillColor = '#e0e0e0'; // Gris por defecto (sin datos)
    let fillOpacity = 0.7;
    
    if (municipioData) {
      const progress = municipioData.progress;
      if (progress < 30) fillColor = '#ef4444'; // Rojo
      else if (progress < 70) fillColor = '#f59e0b'; // Amarillo
      else fillColor = '#22c55e'; // Verde
      fillOpacity = 0.85;
    }

    return {
      fillColor,
      fillOpacity,
      color: '#1e293b',
      weight: 1.5,
      opacity: 0.9
    };
  };

  // Evento al hacer hover en municipio
  const highlightFeature = (e: any) => {
    const layer = e.target;
    layer.setStyle({
      weight: 3,
      color: '#6366f1',
      dashArray: '',
      fillOpacity: 0.9
    });
    layer.bringToFront();
  };

  const resetHighlight = (e: any) => {
    e.target.setStyle({
      weight: 1.5,
      color: '#1e293b',
      fillOpacity: 0.85
    });
  };

  // Evento al hacer clic
  const onEachFeature = (feature: any, layer: any) => {
    layer.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight,
      click: () => {
        const municipioId = feature.properties.MPIO_CNMBR.toLowerCase();
        onMunicipalityClick?.(municipioId);
      }
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando mapa de Caldas...</p>
        </div>
      </div>
    );
  }

  if (error || !geojsonData) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
        <div className="flex">
          <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-700">{error || 'Error al cargar el mapa'}</p>
        </div>
      </div>
    );
  }

  // Coordenadas centro de Caldas (tipadas correctamente)
  const center: LatLngExpression = [5.0854, -75.4517];

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
      <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <h2 className="text-xl font-bold flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Mapa Interactivo de Caldas
        </h2>
        <p className="text-blue-100 text-sm mt-1">
          Colores: <span className="mx-1 inline-block w-3 h-3 bg-red-500 rounded"></span> Bajo avance (0-30%) 
          <span className="mx-1 inline-block w-3 h-3 bg-yellow-500 rounded"></span> Medio avance (30-70%) 
          <span className="mx-1 inline-block w-3 h-3 bg-green-500 rounded"></span> Alto avance (70-100%)
        </p>
      </div>
      
      <div className="h-[500px] w-full">
        {/* @ts-ignore - Solución temporal para compatibilidad con versiones de react-leaflet */}
        <MapContainer
          center={center}
          zoom={9}
          scrollWheelZoom={true}
          className="w-full h-full"
          style={{ borderRadius: '0 0 0.75rem 0.75rem' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* @ts-ignore - Solución temporal para compatibilidad con GeoJSON */}
          <GeoJSON
            data={geojsonData}
            style={getMunicipalityStyle}
            onEachFeature={onEachFeature}
          />
        </MapContainer>
      </div>
      
      <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
        <p className="flex items-center justify-center">
          <svg className="w-3 h-3 mr-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Datos actualizados en tiempo real • Fuente: OpenStreetMap + Datos Electorales
        </p>
      </div>
    </div>
  );
}
