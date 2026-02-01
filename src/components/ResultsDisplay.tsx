import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function ResultsDisplay() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);

  // ===== CONEXIÓN DIRECTA A FIRESTORE =====
  useEffect(() => {
    const unsubscribeCandidates = onSnapshot(
      collection(db, 'candidates'),
      (snapshot) => {
        const candidatesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          votes: 0
        }));
        setCandidates(candidatesData);
        setLoadingCandidates(false);
      },
      (error) => {
        console.error('Error en candidatos:', error);
        setLoadingCandidates(false);
      }
    );

    const unsubscribeReports = onSnapshot(
      collection(db, 'reports'),
      (snapshot) => {
        const reportsData = snapshot.docs.map(doc => doc.data());
        setReports(reportsData);
        setLastUpdate(new Date());
        setLoadingReports(false);
      },
      (error) => {
        console.error('Error en reportes:', error);
        setLoadingReports(false);
      }
    );

    return () => {
      unsubscribeCandidates();
      unsubscribeReports();
    };
  }, []);

  // ===== CÁLCULO EN TIEMPO REAL =====
  const { totalVotes, candidatesWithVotes } = useMemo(() => {
    if (candidates.length === 0 || reports.length === 0) {
      return { totalVotes: 0, candidatesWithVotes: candidates };
    }

    const voteCounters: { [key: string]: number } = {};
    candidates.forEach(cand => {
      voteCounters[cand.id] = 0;
    });

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

    const candidatesWithVotes = candidates.map(cand => ({
      ...cand,
      votes: voteCounters[cand.id] || 0
    })).sort((a, b) => b.votes - a.votes);

    return { totalVotes: total, candidatesWithVotes };
  }, [candidates, reports]);

  const isLoading = loadingCandidates || loadingReports;
  const hasData = candidates.length > 0 && reports.length > 0;

  // ===== DISEÑO SIN SCROLL (PANTALLA COMPLETA) =====
  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-900 to-blue-900 text-white flex flex-col">
      {/* Header - Fijo */}
      <div className="shrink-0 py-3 border-b border-blue-500 bg-black/30">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold">
            RESULTADOS ELECCIONES 2026
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 mt-2 px-4">
            <div className="bg-blue-600 px-6 py-2 rounded-full text-xl md:text-2xl font-bold">
              TOTAL VOTOS: {totalVotes.toLocaleString('es-CO')}
            </div>
            <div className="text-lg md:text-xl bg-black/20 px-4 py-1 rounded-full">
              Última actualización: {lastUpdate.toLocaleTimeString('es-CO', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit',
                hour12: false 
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal - OCUPA TODO EL ESPACIO DISPONIBLE */}
      <div className="flex-grow flex items-center justify-center p-2 md:p-4">
        {isLoading ? (
          // Pantalla de carga SIN scroll
          <div className="text-center">
            <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <p className="text-2xl md:text-3xl font-bold">Conectando con Firebase...</p>
            <div className="mt-4 grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="text-left">
                <span className="text-blue-300">Candidatos:</span>
                <span className={loadingCandidates ? "text-yellow-400 ml-2" : "text-green-400 ml-2"}>
                  {loadingCandidates ? "⏳" : `✅ ${candidates.length}`}
                </span>
              </div>
              <div className="text-left">
                <span className="text-blue-300">Reportes:</span>
                <span className={loadingReports ? "text-yellow-400 ml-2" : "text-green-400 ml-2"}>
                  {loadingReports ? "⏳" : `✅ ${reports.length}`}
                </span>
              </div>
            </div>
          </div>
        ) : !hasData ? (
          // Mensaje sin datos SIN scroll
          <div className="text-center max-w-3xl mx-auto p-6">
            <div className="text-8xl mb-6 animate-bounce">🗳️</div>
            <h2 className="text-5xl md:text-6xl font-bold mb-4">SIN RESULTADOS AÚN</h2>
            <p className="text-2xl md:text-3xl text-gray-300 mb-6">
              Esperando datos de Firebase...
            </p>
            <div className="text-xl md:text-2xl text-blue-400 animate-pulse">
              {loadingCandidates ? "⏳ Cargando candidatos..." : 
               loadingReports ? "⏳ Cargando reportes..." : 
               "✅ Conectado - Esperando primer reporte"}
            </div>
          </div>
        ) : (
          // GRID DE CANDIDATOS - AJUSTADO A PANTALLA COMPLETA SIN SCROLL
          <div 
            className="w-full h-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3 p-1"
            style={{ 
              gridTemplateRows: 'repeat(auto-fill, minmax(0, 1fr))',
              maxHeight: '100%'
            }}
          >
            {candidatesWithVotes.map((candidate) => {
              const percentage = totalVotes > 0 ? Math.round((candidate.votes / totalVotes) * 100) : 0;
              return (
                <div 
                  key={candidate.id} 
                  className="bg-gray-800 rounded-2xl shadow-xl border-2 flex flex-col"
                  style={{ 
                    borderColor: candidate.color || '#3b82f6',
                    boxShadow: `0 10px 15px -3px ${candidate.color}33`
                  }}
                >
                  {/* Foto del candidato - PROPORCIONAL */}
                  <div className="h-36 md:h-44 bg-gray-700 flex items-center justify-center p-2">
                    {candidate.imageUrl ? (
                      <img 
                        src={candidate.imageUrl} 
                        alt={candidate.name} 
                        className="max-h-full max-w-full rounded-lg object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name)}&background=${candidate.color?.replace('#', '') || '3b82f6'}&color=fff&size=256`;
                        }}
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center text-white text-5xl md:text-6xl font-bold rounded-lg"
                        style={{ backgroundColor: (candidate.color || '#3b82f6') + 'cc' }}
                      >
                        {candidate.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  
                  {/* Información compacta */}
                  <div className="p-2 md:p-3 flex flex-col flex-grow">
                    <div className="text-center mb-1">
                      <span className="inline-block bg-blue-600 text-white text-lg md:text-xl font-bold px-3 py-1 rounded-full">
                        #{candidate.ballotNumber || '?'}
                      </span>
                    </div>
                    
                    <h2 className="text-xl md:text-2xl font-bold text-center truncate">{candidate.name}</h2>
                    <p className="text-xs md:text-sm text-blue-300 text-center mb-1 truncate">{candidate.party}</p>
                    
                    <div className="text-center my-1">
                      <span className="inline-block bg-purple-900/70 text-purple-300 px-2 py-0.5 rounded text-xs">
                        {candidate.position}
                      </span>
                    </div>
                    
                    {/* Contador de votos - AJUSTADO */}
                    <div className="text-center my-1 flex-grow flex flex-col justify-center">
                      <div 
                        className="text-4xl md:text-5xl lg:text-6xl font-bold"
                        style={{ color: candidate.color || '#3b82f6' }}
                      >
                        {candidate.votes.toLocaleString('es-CO')}
                      </div>
                      <p className="text-xs md:text-sm text-gray-300 mt-0.5">VOTOS</p>
                    </div>
                    
                    {/* Barra de progreso compacta */}
                    {totalVotes > 0 && (
                      <div className="mt-1">
                        <div className="flex justify-between text-[0.65rem] md:text-xs mb-0.5">
                          <span>Participación:</span>
                          <span className="font-bold">{percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: candidate.color || '#3b82f6'
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
      </div>

      {/* Footer - Fijo */}
      <div className="shrink-0 py-2 border-t border-blue-800 text-center text-xs md:text-sm">
        <p>Sistema de Monitoreo Electoral en Tiempo Real • Caldas 2026</p>
        <p className="mt-1">Datos actualizados automáticamente desde Firebase</p>
      </div>
    </div>
  );
}
