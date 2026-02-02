import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MUNICIPALITIES } from '../config/municipalities';
import MunicipalMap from './MunicipalMap';

export default function MunicipalAnalysis() {
  const [municipalityData, setMunicipalityData] = useState<{ [key: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para filtros y ordenamiento
  const [searchQuery, setSearchQuery] = useState('');
  const [progressFilter, setProgressFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [alertFilter, setAlertFilter] = useState<'all' | 'with' | 'without'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'reportedTables' | 'progress' | 'totalVotes' | 'alertCount'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Función para filtrar y ordenar los municipios
  const getFilteredAndSortedMunicipalities = () => {
    return MUNICIPALITIES.filter(municipio => {
      const data = municipalityData[municipio.name.toLowerCase()] || {
        reportedTables: 0,
        totalTables: municipio.tables,
        totalVotes: 0,
        progress: 0,
        alertCount: 0
      };

      // Filtro por búsqueda
      if (searchQuery && !municipio.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Filtro por progreso
      if (progressFilter !== 'all') {
        if (progressFilter === 'low' && data.progress >= 30) return false;
        if (progressFilter === 'medium' && (data.progress < 30 || data.progress >= 70)) return false;
        if (progressFilter === 'high' && data.progress < 70) return false;
      }

      // Filtro por alertas
      if (alertFilter !== 'all') {
        if (alertFilter === 'with' && data.alertCount === 0) return false;
        if (alertFilter === 'without' && data.alertCount > 0) return false;
      }

      return true;
    }).sort((a, b) => {
      const dataA = municipalityData[a.name.toLowerCase()] || { reportedTables: 0, totalTables: a.tables, totalVotes: 0, progress: 0, alertCount: 0 };
      const dataB = municipalityData[b.name.toLowerCase()] || { reportedTables: 0, totalTables: b.tables, totalVotes: 0, progress: 0, alertCount: 0 };

      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'reportedTables':
          comparison = dataA.reportedTables - dataB.reportedTables;
          break;
        case 'progress':
          comparison = dataA.progress - dataB.progress;
          break;
        case 'totalVotes':
          comparison = dataA.totalVotes - dataB.totalVotes;
          break;
        case 'alertCount':
          comparison = dataA.alertCount - dataB.alertCount;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Cargar datos de municipios desde Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener todos los reportes
        const reportsSnapshot = await getDocs(collection(db, 'reports'));
        const reports = reportsSnapshot.docs.map(doc => doc.data());
        
        // Calcular estadísticas por municipio
        const data: { [key: string]: any } = {};
        
        MUNICIPALITIES.forEach(municipio => {
          // Filtrar reportes de este municipio
          const municipioReports = reports.filter(r => 
            r.municipioId?.toLowerCase() === municipio.id.toLowerCase() || 
            r.municipio?.toLowerCase() === municipio.name.toLowerCase()
          );
          
          // Calcular progreso
          const reportedTables = municipioReports.length;
          const progress = municipio.tables > 0 
            ? (reportedTables / municipio.tables) * 100 
            : 0;
          
          // Calcular votos totales
          const totalVotes = municipioReports.reduce((sum, report) => 
            sum + (report.totalVotes || 0), 0);
          
          // Contar alertas
          const alertCount = municipioReports.filter(r => r.hasIrregularity).length;
          
          // Guardar datos (clave en minúsculas para coincidir con GeoJSON)
          data[municipio.name.toLowerCase()] = {
            reportedTables,
            totalTables: municipio.tables,
            totalVotes,
            progress: Math.round(progress),
            alertCount
          };
        });
        
        setMunicipalityData(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching municipal data:', err);
        setError('Error al cargar los datos territoriales');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700 font-medium">Cargando análisis territorial...</p>
          <p className="text-gray-500 mt-2">Obteniendo datos de los 27 municipios de Caldas</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg max-w-2xl">
          <div className="flex">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700">{error}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              Análisis Territorial - Caldas 2026
            </h1>
            <p className="text-gray-600">
              Monitoreo en tiempo real de los 27 municipios • Última actualización: {new Date().toLocaleTimeString('es-CO')}
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <button 
              onClick={() => window.history.back()}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto">
        {/* Mapa Interactivo */}
        <div className="mb-8">
          <MunicipalMap data={municipalityData} />
        </div>

        {/* Tabla Detallada de Municipios */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
          <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
            <h2 className="text-xl font-bold flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2-4h10m-6 2a2 2 0 100-4H5a2 2 0 000 4h14a2 2 0 000-4h-6m-2 4h10" />
              </svg>
              Tabla Detallada por Municipio
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Datos actualizados en tiempo real • {getFilteredAndSortedMunicipalities().length} municipios filtrados
            </p>
          </div>
          
          {/* Filtros */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Búsqueda */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Buscar municipio</label>
                <input
                  type="text"
                  placeholder="Ej: Manizales, La Dorada..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Filtro por progreso */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Avance de reportes</label>
                <select
                  value={progressFilter}
                  onChange={(e) => setProgressFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todos los municipios</option>
                  <option value="low">Bajo avance (0-30%)</option>
                  <option value="medium">Avance medio (30-70%)</option>
                  <option value="high">Alto avance (70-100%)</option>
                </select>
              </div>
              
              {/* Filtro por alertas */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Alertas</label>
                <select
                  value={alertFilter}
                  onChange={(e) => setAlertFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Todos</option>
                  <option value="with">Con alertas</option>
                  <option value="without">Sin alertas</option>
                </select>
              </div>
              
              {/* Botones de acción */}
              <div className="flex items-end space-x-2">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setProgressFilter('all');
                    setAlertFilter('all');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Limpiar filtros
                </button>
                <button
                  onClick={() => {
                    // Descargar datos filtrados como CSV
                    const filtered = getFilteredAndSortedMunicipalities();
                    const csvContent = [
                      ['Municipio', 'Mesas Reportadas', 'Total Mesas', 'Avance (%)', 'Votos Totales', 'Alertas'],
                      ...filtered.map(m => {
                        const data = municipalityData[m.name.toLowerCase()] || { reportedTables: 0, totalTables: m.tables, totalVotes: 0, progress: 0, alertCount: 0 };
                        return [
                          m.name,
                          data.reportedTables,
                          data.totalTables,
                          data.progress,
                          data.totalVotes,
                          data.alertCount
                        ];
                      })
                    ].map(row => row.join(',')).join('\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.setAttribute('href', url);
                    link.setAttribute('download', `analisis_caldas_${new Date().toISOString().split('T')[0]}.csv`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Exportar CSV
                </button>
              </div>
            </div>
          </div>
          
          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    { key: 'name', label: 'Municipio' },
                    { key: 'reportedTables', label: 'Mesas Reportadas' },
                    { key: 'progress', label: 'Avance' },
                    { key: 'totalVotes', label: 'Votos Totales' },
                    { key: 'alertCount', label: 'Alertas' }
                  ].map((column) => (
                    <th 
                      key={column.key} 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (sortBy === column.key as any) {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy(column.key as any);
                          setSortDirection('asc');
                        }
                      }}
                    >
                      <div className="flex items-center">
                        {column.label}
                        {sortBy === column.key && (
                          <svg 
                            className={`w-4 h-4 ml-1 ${sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortDirection === 'asc' ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                          </svg>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getFilteredAndSortedMunicipalities().map((municipio) => {
                  const data = municipalityData[municipio.name.toLowerCase()] || {
                    reportedTables: 0,
                    totalTables: municipio.tables,
                    totalVotes: 0,
                    progress: 0,
                    alertCount: 0
                  };
                  
                  return (
                    <tr key={municipio.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {municipio.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {data.reportedTables.toLocaleString('es-CO')} / {data.totalTables.toLocaleString('es-CO')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${
                                data.progress < 30 ? 'bg-red-500' : 
                                data.progress < 70 ? 'bg-yellow-500' : 'bg-green-500'
                              }`} 
                              style={{ width: `${data.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-500 font-medium">{data.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                        {data.totalVotes.toLocaleString('es-CO')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {data.alertCount > 0 ? (
                          <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-red-100 text-red-800 border-2 border-red-200">
                            ⚠️ {data.alertCount}
                          </span>
                        ) : (
                          <span className="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-green-100 text-green-800 border-2 border-green-200">
                            ✅ 0
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Mensaje si no hay resultados */}
            {getFilteredAndSortedMunicipalities().length === 0 && (
              <div className="p-8 text-center">
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-gray-600 font-medium">No se encontraron municipios con los filtros aplicados</p>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setProgressFilter('all');
                    setAlertFilter('all');
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
          
          <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600 flex justify-between items-center">
            <p>
              Mostrando {getFilteredAndSortedMunicipalities().length} de 27 municipios • 
              Última actualización: {new Date().toLocaleTimeString('es-CO')}
            </p>
            <p className="font-medium text-indigo-600">
              {Object.values(municipalityData).reduce((sum, m: any) => sum + (m.reportedTables || 0), 0)} mesas reportadas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
