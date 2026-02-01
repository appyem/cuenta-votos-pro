import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function ResultsDisplay() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);

  // ===== CONEXIÓN DIRECTA A FIRESTORE (SIN FALLAS SILENCIOSAS) =====
  useEffect(() => {
    console.log('🔍 Iniciando conexión con Firestore para CANDIDATOS...');
    
    const unsubscribe = onSnapshot(
      collection(db, 'candidates'),
      (snapshot) => {
        console.log(`✅ Candidatos recibidos: ${snapshot.docs.length}`);
        const candidatesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          votes: 0 // Inicializar contador
        }));
        setCandidates(candidatesData);
        setLoadingCandidates(false);
      },
      (error) => {
        console.error('❌ ERROR FATAL en candidatos:', error);
        alert(`Error de conexión con candidatos: ${error.message}`);
        setLoadingCandidates(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    console.log('🔍 Iniciando conexión con Firestore para REPORTES...');
    
    const unsubscribe = onSnapshot(
      collection(db, 'reports'),
      (snapshot) => {
        console.log(`✅ Reportes recibidos: ${snapshot.docs.length}`);
        const reportsData = snapshot.docs.map(doc => doc.data());
        setReports(reportsData);
        setLastUpdate(new Date());
        setLoadingReports(false);
      },
      (error) => {
        console.error('❌ ERROR FATAL en reportes:', error);
        alert(`Error de conexión con reportes: ${error.message}`);
        setLoadingReports(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ===== CÁLCULO EN TIEMPO REAL (SIN DEPENDENCIAS ROTAS) =====
  const { totalVotes, candidatesWithVotes } = useMemo(() => {
    if (candidates.length === 0 || reports.length === 0) {
      return { totalVotes: 0, candidatesWithVotes: candidates };
    }

    // Inicializar contadores
    const voteCounters: { [key: string]: number } = {};
    candidates.forEach(cand => {
      voteCounters[cand.id] = 0;
    });

    // Contar votos de TODOS los reportes
    let total = 0;
    reports.forEach(report => {
      if (report.votes && typeof report.votes === 'object') {
        Object.entries(report.votes).forEach(([candId, count]) => {
          if (typeof count === 'number' && voteCounters[candId] !== undefined) {
            voteCounters[candId] += count;
            total += count;
          }
        });
      }
    });

    // Crear lista con votos y ordenar
    const candidatesWithVotes = candidates.map(cand => ({
      ...cand,
      votes: voteCounters[cand.id] || 0
    })).sort((a, b) => b.votes - a.votes);

    return { totalVotes: total, candidatesWithVotes };
  }, [candidates, reports]);

  // ===== ESTADO DE CARGA =====
  const isLoading = loadingCandidates || loadingReports;
  const hasData = candidates.length > 0 && reports.length > 0;

  // ===== UI DE CARGA CON DIAGNÓSTICO =====
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-500 mb-8"></div>
        <p className="text-4xl text-white font-bold mb-4">Conectando con Firebase...</p>
        <div className="bg-gray-800 border border-blue-500 rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between mb-3">
            <span className="text-blue-300">Candidatos:</span>
            <span className={loadingCandidates ? "text-yellow-400" : "text-green-400"}>
              {loadingCandidates ? "⏳ Cargando..." : `✅ ${candidates.length}`}
            </span>
          </div>
          <div className="flex justify-between mb-3">
            <span className="text-blue-300">Reportes:</span>
            <span className={loadingReports ? "text-yellow-400" : "text-green-400"}>
              {loadingReports ? "⏳ Cargando..." : `✅ ${reports.length}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-300">Estado:</span>
            <span className="text-blue-400 font-mono">
              {loadingCandidates || loadingReports ? "ESPERANDO DATOS" : "LISTO"}
            </span>
          </div>
        </div>
        <p className="text-xl text-gray-400 mt-6 text-center max-w-2xl">
          Si la carga demora más de 10 segundos:<br />
          1. Verifica tu conexión a internet<br />
          2. Abre la Consola (F12) y revisa los errores<br />
          3. Confirma que las reglas de Firestore permitan lectura pública
        </p>
      </div>
    );
  }

  // ===== UI PRINCIPAL =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white p-6">
      {/* Header */}
      <div className="text-center mb-8 py-4 border-b border-blue-500">
        <h1 className="text-6xl md:text-8xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
          RESULTADOS ELECCIONES 2026
        </h1>
        <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-4">
          <div className="bg-blue-600 px-8 py-3 rounded-full text-3xl font-bold shadow-lg">
            TOTAL VOTOS: {totalVotes.toLocaleString('es-CO')}
          </div>
          <div className="text-2xl text-blue-300 bg-black/30 px-6 py-2 rounded-full">
            Última actualización: {lastUpdate.toLocaleTimeString('es-CO', { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit',
              hour12: false 
            })}
          </div>
        </div>
      </div>

      {/* Mensaje de diagnóstico (SOLO SI NO HAY DATOS) */}
      {!hasData && (
        <div className="bg-red-900 border-l-4 border-red-500 p-6 rounded-lg mb-8 max-w-3xl mx-auto">
          <div className="flex items-start">
            <svg className="w-8 h-8 text-red-400 mr-3 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-2xl font-bold text-red-300 mb-2">⚠️ SIN DATOS DISPONIBLES</h3>
              <p className="text-red-200 mb-3">
                {candidates.length === 0 && reports.length === 0 && "No se han cargado candidatos ni reportes desde Firebase."}
                {candidates.length === 0 && reports.length > 0 && "Hay reportes pero NO hay candidatos registrados en Firestore."}
                {candidates.length > 0 && reports.length === 0 && "Hay candidatos pero NO hay reportes de votos en Firestore."}
              </p>
              <div className="mt-4 p-4 bg-black/30 rounded">
                <p className="font-bold text-yellow-300 mb-2">Pasos para solucionar:</p>
                <ol className="list-decimal list-inside text-red-100 space-y-1 text-left">
                  <li>Ve al Dashboard y agrega al menos 1 candidato</li>
                  <li>Abre el formulario de votos (/manizales) y envía 1 reporte de prueba</li>
                  <li>Verifica en Firebase Console que existan documentos en:</li>
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li className="text-blue-300">Colección <code className="bg-blue-900 px-1 rounded">candidates</code></li>
                    <li className="text-blue-300">Colección <code className="bg-blue-900 px-1 rounded">reports</code></li>
                  </ul>
                  <li>Confirma que las reglas de Firestore permitan lectura pública</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid de candidatos */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {candidatesWithVotes.map((candidate) => {
            const percentage = totalVotes > 0 ? Math.round((candidate.votes / totalVotes) * 100) : 0;
            return (
              <div 
                key={candidate.id} 
                className="bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border-4 transform transition-all duration-500 hover:scale-[1.02] border-blue-500/30"
              >
                {/* Foto del candidato */}
                <div className="h-80 bg-gray-700 flex items-center justify-center p-4">
                  {candidate.imageUrl ? (
                    <img 
                      src={candidate.imageUrl} 
                      alt={candidate.name} 
                      className="max-h-72 max-w-full rounded-xl object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name)}&background=${candidate.color?.replace('#', '') || '3b82f6'}&color=fff&size=256`;
                      }}
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center text-white text-8xl font-bold rounded-xl"
                      style={{ backgroundColor: (candidate.color || '#3b82f6') + 'cc' }}
                    >
                      {candidate.name.charAt(0)}
                    </div>
                  )}
                </div>
                
                {/* Información del candidato */}
                <div className="p-6">
                  <div className="text-center mb-4">
                    <span className="inline-block bg-blue-600 text-white text-4xl font-bold px-6 py-2 rounded-full shadow-lg">
                      #{candidate.ballotNumber || '?'}
                    </span>
                  </div>
                  
                  <h2 className="text-4xl font-bold text-center mb-2">{candidate.name}</h2>
                  <p className="text-2xl text-blue-300 text-center mb-4">{candidate.party}</p>
                  <div className="text-center mb-6">
                    <span className="inline-block bg-purple-900 text-purple-300 px-4 py-1 rounded-full text-xl">
                      {candidate.position}
                    </span>
                  </div>
                  
                  <div className="text-center mb-6">
                    <div className="text-8xl md:text-9xl font-bold mb-2" style={{ color: candidate.color || '#3b82f6' }}>
                      {candidate.votes.toLocaleString('es-CO')}
                    </div>
                    <p className="text-3xl text-gray-300">VOTOS</p>
                  </div>
                  
                  {totalVotes > 0 && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xl mb-2">
                        <span>Participación:</span>
                        <span className="font-bold text-blue-400">{percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-8 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: candidate.color || '#3b82f6',
                            boxShadow: `0 0 15px ${candidate.color || '#3b82f6'}`
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mensaje inicial si no hay datos */}
      {!hasData && (
        <div className="text-center py-24 max-w-4xl mx-auto">
          <div className="text-9xl mb-8 animate-bounce">🗳️</div>
          <h2 className="text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-yellow-500">
            SIN RESULTADOS AÚN
          </h2>
          <p className="text-4xl text-gray-300 mb-8">
            Esperando datos de Firebase...
          </p>
          <div className="text-3xl text-blue-400 animate-pulse font-mono">
            {loadingCandidates ? "⏳ Cargando candidatos..." : 
             loadingReports ? "⏳ Cargando reportes..." : 
             "✅ Conectado - Esperando primer reporte"}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-12 pt-6 border-t border-blue-800 text-xl text-blue-300">
        <p>Sistema de Monitoreo Electoral en Tiempo Real • Caldas 2026</p>
        <p className="mt-2 text-lg">Datos actualizados automáticamente desde Firebase • Última verificación: {new Date().toLocaleTimeString('es-CO')}</p>
      </div>
    </div>
  );
}
