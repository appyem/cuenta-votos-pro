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
  const candidateCount = candidatesWithVotes.length;

  // ===== CALCULAR CLASES DE GRID DINÁMICAS SEGÚN CANTIDAD DE CANDIDATOS =====
  const getGridStyles = () => {
    // Ajustar columnas según cantidad de candidatos PARA MEJOR DISTRIBUCIÓN
    if (candidateCount <= 2) {
      // 1-2 candidatos: máximo 2 columnas, cards muy grandes
      return {
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gridAutoRows: '1fr',
        gap: '1.5rem'
      };
    } else if (candidateCount <= 4) {
      // 3-4 candidatos: máximo 3 columnas, cards grandes
      return {
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gridAutoRows: '1fr',
        gap: '1.25rem'
      };
    } else if (candidateCount <= 6) {
      // 5-6 candidatos: máximo 4 columnas, cards medianos
      return {
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gridAutoRows: '1fr',
        gap: '1rem'
      };
    } else if (candidateCount <= 9) {
      // 7-9 candidatos: máximo 5 columnas
      return {
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gridAutoRows: '1fr',
        gap: '0.875rem'
      };
    } else if (candidateCount <= 12) {
      // 10-12 candidatos: máximo 6 columnas
      return {
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gridAutoRows: '1fr',
        gap: '0.75rem'
      };
    } else {
      // 13+ candidatos: máximo 7 columnas, cards compactos pero legibles
      return {
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gridAutoRows: '1fr',
        gap: '0.625rem'
      };
    }
  };

  // ===== DISEÑO ADAPTATIVO (SIN SCROLL, SIN ESPACIOS VACÍOS) =====
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
      <div className="flex-grow flex flex-col p-2 md:p-4 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
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
          <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto p-6">
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
          // GRID ADAPTATIVO - ¡CLAVE! Se ajusta según cantidad de candidatos
          <div 
            className="grid w-full h-full"
            style={getGridStyles()}
          >
            {candidatesWithVotes.map((candidate) => {
              const percentage = totalVotes > 0 ? Math.round((candidate.votes / totalVotes) * 100) : 0;
              return (
                <div 
                  key={candidate.id} 
                  className="bg-gray-800 rounded-xl shadow-lg border-2 flex flex-col overflow-hidden"
                  style={{ 
                    borderColor: candidate.color || '#3b82f6',
                    boxShadow: `0 4px 6px ${candidate.color}33`
                  }}
                >
                  {/* ===== SECCIÓN SUPERIOR: DATOS BÁSICOS ===== */}
                  <div className="p-2 bg-gray-900 border-b border-gray-700 flex-shrink-0" style={{ minHeight: '45px' }}>
                    <div className="text-center mb-1">
                      <span className="inline-block bg-blue-600 text-white text-xs md:text-sm font-bold px-2 py-0.5 rounded">
                        #{candidate.ballotNumber || '?'}
                      </span>
                    </div>
                    <h2 className="text-xs md:text-sm font-bold text-center truncate px-1 leading-tight">
                      {candidate.name}
                    </h2>
                    <p className="text-[0.6rem] md:text-xs text-blue-300 text-center truncate px-1 mt-0.5">
                      {candidate.party}
                    </p>
                  </div>
                  
                  {/* ===== SECCIÓN CENTRAL: FOTO (ADAPTABLE AL ESPACIO DISPONIBLE) ===== */}
                  <div className="bg-gray-700 p-2 flex-grow min-h-0 overflow-hidden">
                    {candidate.imageUrl ? (
                      <img 
                        src={candidate.imageUrl} 
                        alt={candidate.name} 
                        className="w-full h-full object-contain rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name)}&background=${candidate.color?.replace('#', '') || '3b82f6'}&color=fff&size=128`;
                        }}
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center text-white text-3xl md:text-4xl font-bold rounded"
                        style={{ backgroundColor: (candidate.color || '#3b82f6') + 'cc' }}
                      >
                        {candidate.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  
                  {/* ===== SECCIÓN INFERIOR: RESULTADOS (SIEMPRE VISIBLES) ===== */}
                  <div className="p-1.5 bg-gray-850 border-t border-gray-700 flex-shrink-0" style={{ minHeight: '65px' }}>
                    <div className="text-center py-0.5">
                      <div 
                        className="text-lg md:text-xl lg:text-2xl font-bold"
                        style={{ color: candidate.color || '#3b82f6' }}
                      >
                        {candidate.votes.toLocaleString('es-CO')}
                      </div>
                      <p className="text-[0.6rem] md:text-xs text-gray-300 mt-0.5">VOTOS</p>
                    </div>
                    
                    {totalVotes > 0 && (
                      <div className="mt-1">
                        <div className="flex justify-between text-[0.6rem] md:text-xs mb-0.5">
                          <span className="truncate max-w-[50%]">Participación:</span>
                          <span className="font-bold flex-shrink-0">{percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
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
      <div className="shrink-0 py-1.5 border-t border-blue-800 text-center text-[0.65rem] md:text-xs">
        <p>Sistema de Monitoreo Electoral en Tiempo Real • Caldas 2026</p>
        <p>Datos actualizados automáticamente desde Firebase</p>
      </div>
    </div>
  );
}

