import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

interface ReportData {
  id: string;
  name: string;
  phone: string;
  votingPlace: string;
  tableNumber: string | number;
  votes: { [key: string]: number };
  totalVotes: number;
  hasIrregularity: boolean;
  irregularityType: string;
  observation: string;
  municipio: string;
  timestamp: any;
  resolved?: boolean;
  resolvedAt?: any;
  resolvedBy?: string;
}

const IRREGULARITY_LABELS: { [key: string]: string } = {
  'documentacion': 'Falta de documentación',
  'presion': 'Presión a electores',
  'tecnica': 'Falla técnica',
  'otra': 'Otra irregularidad'
};

export default function AlertsView() {
  const [alerts, setAlerts] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'reports'), where('hasIrregularity', '==', true));
    
    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        try {
          const alertsData: ReportData[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || '',
              phone: data.phone || '',
              votingPlace: data.votingPlace || '',
              tableNumber: data.tableNumber || '',
              votes: data.votes || {},
              totalVotes: data.totalVotes || 0,
              hasIrregularity: data.hasIrregularity || false,
              irregularityType: data.irregularityType || '',
              observation: data.observation || '',
              municipio: data.municipio || 'Manizales',
              timestamp: data.timestamp,
              resolved: data.resolved,
              resolvedAt: data.resolvedAt,
              resolvedBy: data.resolvedBy
            };
          });

          alertsData.sort((a, b) => {
            const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
            const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
            return timeB - timeA;
          });
          
          let filteredAlerts = alertsData;
          if (filter === 'active') {
            filteredAlerts = alertsData.filter(a => !a.resolved);
          } else if (filter === 'resolved') {
            filteredAlerts = alertsData.filter(a => a.resolved);
          }
          
          setAlerts(filteredAlerts);
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error processing alerts:', err);
          setError('Error al procesar las alertas');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error fetching alerts:', err);
        setError(err.code === 'failed-precondition' 
          ? 'Índice de Firestore en creación. Recargue en 2-3 minutos.' 
          : 'Error de conexión con la base de datos');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [filter]);

  const handleResolveAlert = async (alertId: string) => {
    try {
      const alertRef = doc(db, 'reports', alertId);
      await updateDoc(alertRef, {
        resolved: true,
        resolvedAt: serverTimestamp(),
        resolvedBy: 'admin'
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
      alert('Error al marcar la alerta como resuelta');
    }
  };

  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'Reciente';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando alertas...</p>
          <p className="text-xs text-gray-500 mt-2">Recargue si tarda más de 30 segundos</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
        <div className="flex">
          <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-red-700 font-medium">{error}</p>
            {error.includes('Índice') && (
              <p className="text-xs mt-1 text-blue-600">
                Nota: El índice se está creando. Recargue la página en 2-3 minutos.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-block bg-red-100 text-red-700 rounded-full px-4 py-1 mb-3">
          <svg className="w-6 h-6 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Sistema de Alertas
        </div>
        <h1 className="text-3xl font-bold text-gray-800">Alertas de Irregularidades</h1>
        <p className="text-gray-600 mt-2">Monitoreo en tiempo real</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'all' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todas ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'active' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Activas ({alerts.filter(a => !a.resolved).length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'resolved' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Resueltas ({alerts.filter(a => a.resolved).length})
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">¡Sin alertas!</h2>
          <p className="text-gray-600">
            {filter === 'active' ? 'No hay irregularidades pendientes' : 'No se han reportado irregularidades'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border-l-4 rounded-xl p-5 ${
                alert.resolved ? 'bg-gray-50 border-gray-300' : 'bg-red-50 border-red-500'
              }`}
            >
              <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <svg className={`w-6 h-6 mr-2 ${alert.resolved ? 'text-gray-400' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className={`font-bold text-lg ${alert.resolved ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                      {IRREGULARITY_LABELS[alert.irregularityType] || alert.irregularityType}
                    </span>
                    {alert.resolved && (
                      <span className="ml-3 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        Resuelta
                      </span>
                    )}
                  </div>
                  
                  <p className={`text-gray-700 mb-3 whitespace-pre-line ${alert.resolved ? 'line-through text-gray-500' : ''}`}>
                    "{alert.observation}"
                  </p>
                  
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {alert.municipio} - {alert.votingPlace}
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Mesa #{alert.tableNumber}
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Reportado: {formatTimestamp(alert.timestamp)}
                    </div>
                  </div>
                </div>
                
                {!alert.resolved && (
                  <div className="mt-4 md:mt-0 md:ml-6 flex-shrink-0">
                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Resuelta
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Las alertas se actualizan en tiempo real. Si no ve datos, recargue la página.
          </p>
        </div>
      </div>
    </div>
  );
}
