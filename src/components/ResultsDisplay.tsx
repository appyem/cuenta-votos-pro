import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import Footer from '../components/Footer';

// ===== UMBRAL ELECTORAL DE CALDAS =====
const CALDAS_THRESHOLD = 40000; // Umbral para proyección de ganador en Caldas

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

  // ===== CÁLCULO DEL GANADOR Y ESTADO DEL UMBRAL =====
  const hasReachedThreshold = totalVotes >= CALDAS_THRESHOLD;
  const winner = hasReachedThreshold ? candidatesWithVotes[0] : null;
  const remainingVotes = CALDAS_THRESHOLD - totalVotes;
  const candidateCount = candidatesWithVotes.length;

  const isLoading = loadingCandidates || loadingReports;
  const hasData = candidates.length > 0 && reports.length > 0;

  // ===== CALCULAR CLASES DE GRID DINÁMICAS (OPTIMIZADO PARA TVS) =====
  const getGridStyles = () => {
    // Mantener diseño sin scroll para TVs hasta 12 candidatos
    if (candidateCount <= 4) {
      return {
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '1.5rem'
      };
    } else if (candidateCount <= 8) {
      return {
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.25rem'
      };
    } else if (candidateCount <= 12) {
      return {
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem'
      };
    } else {
      // Permitir scroll SOLO cuando hay más de 12 candidatos
      return {
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '0.875rem'
      };
    }
  };

  // ===== DISEÑO OPTIMIZADO PARA TVS + SCROLL INTELIGENTE =====
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white flex flex-col">
      {/* Header - Fijo con información crítica */}
      <div className="shrink-0 py-3 border-b border-blue-500 bg-black/50 backdrop-blur-sm z-10">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
            RESULTADOS ELECCIONES CALDAS 2026
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 mt-2 px-4">
            <div className="bg-blue-600 px-6 py-2 rounded-full text-xl md:text-2xl font-bold shadow-lg">
              TOTAL VOTOS: {totalVotes.toLocaleString('es-CO')}
            </div>
            <div className="text-lg md:text-xl bg-black/30 px-4 py-1 rounded-full">
              Última actualización: {lastUpdate.toLocaleTimeString('es-CO', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit',
                hour12: false 
              })}
            </div>
          </div>
          
          {/* ===== BANNER DE UMBRAL (FIJO EN LA PARTE SUPERIOR) ===== */}
          {hasReachedThreshold && (
            <div className="mt-3 bg-gradient-to-r from-yellow-400 to-amber-600 text-black font-bold text-lg md:text-xl py-2 rounded-lg shadow-xl border-2 border-yellow-300">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="text-3xl">🎉</span>
                <span>¡UMBRAL ALCANZADO! EL GANADOR ES:</span>
                <span className="text-2xl md:text-3xl bg-amber-900 text-yellow-300 px-3 py-1 rounded-full shadow-md">
                  {winner?.name.toUpperCase()}
                </span>
                <span className="text-3xl">🏆</span>
              </div>
              <p className="text-sm md:text-base mt-1 font-medium text-amber-900">
                Proyección de ganador según ley electoral de Caldas (Art. 107)
              </p>
            </div>
          )}
          
          {/* ===== BARRA DE PROGRESO (INTEGRADA EN HEADER) ===== */}
          {!hasReachedThreshold && (
            <div className="mt-3 bg-blue-900/40 border border-blue-500 rounded-lg p-2 max-w-3xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="text-center sm:text-left">
                  <p className="text-sm md:text-base font-bold">
                    <span className="text-yellow-300">{remainingVotes.toLocaleString('es-CO')}</span> votos para el umbral de <span className="text-yellow-300">{CALDAS_THRESHOLD.toLocaleString('es-CO')}</span>
                  </p>
                </div>
                <div className="flex-1 max-w-md mx-auto sm:mx-0">
                  <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((totalVotes / CALDAS_THRESHOLD) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contenido Principal - SCROLL SOLO CUANDO ES NECESARIO */}
      <div className={`flex-grow overflow-y-auto p-2 md:p-4 ${candidateCount > 12 ? 'overflow-y-auto' : 'overflow-y-hidden'}`}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
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
          <div className="flex flex-col items-center justify-center min-h-[400px] max-w-3xl mx-auto p-6">
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
          // GRID OPTIMIZADO PARA TVS - SIN SCROLL HASTA 12 CANDIDATOS
          <div 
            className="grid w-full mx-auto"
            style={getGridStyles()}
          >
            {candidatesWithVotes.map((candidate) => {
              const percentage = totalVotes > 0 ? Math.round((candidate.votes / totalVotes) * 100) : 0;
              const isWinner = hasReachedThreshold && candidate.id === winner?.id;
              
              return (
                <div 
                  key={candidate.id} 
                  className={`bg-gray-800 rounded-xl shadow-xl border-2 flex flex-col overflow-hidden relative transition-all duration-300 ${
                    isWinner ? 'border-yellow-400 scale-[1.02] z-10' : 'hover:shadow-2xl'
                  }`}
                  style={{ 
                    borderColor: isWinner ? '#FFD700' : (candidate.color || '#3b82f6'),
                    boxShadow: isWinner 
                      ? '0 0 20px #FFD700, 0 0 40px #FFA500' 
                      : `0 4px 12px ${candidate.color}44`,
                    minHeight: '380px' // Tamaño mínimo garantizado para TVs
                  }}
                >
                  {/* ===== BADGE DE GANADOR (SOLO CUANDO SE ALCANZA UMBRAL) ===== */}
                  {isWinner && (
                    <>
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-red-600 to-amber-500 text-white font-bold text-base px-3 py-1 rounded-full shadow-lg flex items-center z-20 border-2 border-yellow-300 animate-bounce">
                        <span className="text-xl mr-1">🏆</span> ¡GANADOR!
                      </div>
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-amber-900 font-bold text-lg px-3 py-1 rounded-full shadow-md z-20">
                        🎉🎊🥳
                      </div>
                    </>
                  )}
                  
                  {/* ===== SECCIÓN SUPERIOR: DATOS BÁSICOS ===== */}
                  <div className={`p-3 border-b flex-shrink-0 ${isWinner ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-900 font-bold' : 'bg-gray-900 border-gray-700'}`}>
                    <div className="text-center mb-2">
                      <span className={`inline-block font-bold px-3 py-1 rounded text-base ${
                        isWinner 
                          ? 'bg-amber-900 text-yellow-300' 
                          : 'bg-blue-600 text-white'
                      }`}>
                        #{candidate.ballotNumber || '?'}
                      </span>
                    </div>
                    <h2 className={`text-base md:text-lg font-bold text-center px-1 leading-tight ${
                      isWinner ? 'text-amber-900 text-xl' : 'text-white'
                    }`}>
                      {candidate.name}
                    </h2>
                    <p className={`text-xs md:text-sm text-center px-1 mt-1 ${
                      isWinner ? 'text-amber-900 font-medium' : 'text-blue-300'
                    }`}>
                      {candidate.party}
                    </p>
                  </div>
                  
                  {/* ===== SECCIÓN CENTRAL: FOTO (TAMAÑO FIJO PARA TVS) ===== */}
                  <div className="bg-gray-700 p-3 flex-grow min-h-[160px] flex items-center justify-center overflow-hidden">
                    {candidate.imageUrl ? (
                      <img 
                        src={candidate.imageUrl} 
                        alt={candidate.name} 
                        className="max-w-full max-h-full object-contain rounded-lg"
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
                  
                  {/* ===== SECCIÓN INFERIOR: RESULTADOS ===== */}
                  <div className={`p-3 flex-shrink-0 ${isWinner ? 'bg-gradient-to-r from-amber-500 to-yellow-400 border-t border-amber-300' : 'bg-gray-850 border-t border-gray-700'}`}>
                    <div className="text-center py-1">
                      <div 
                        className={`font-bold ${
                          isWinner 
                            ? 'text-3xl md:text-4xl text-amber-900' 
                            : 'text-2xl md:text-3xl'
                        }`}
                        style={{ color: isWinner ? '#8B4513' : (candidate.color || '#3b82f6') }}
                      >
                        {candidate.votes.toLocaleString('es-CO')}
                      </div>
                      <p className={`text-xs md:text-sm mt-1 ${
                        isWinner ? 'text-amber-900 font-bold' : 'text-gray-300'
                      }`}>
                        VOTOS
                      </p>
                    </div>
                    
                    {totalVotes > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className={`truncate ${
                            isWinner ? 'font-bold text-amber-900' : 'text-gray-400'
                          }`}>
                            {isWinner ? '¡PROYECCIÓN GANADOR!' : 'Participación:'}
                          </span>
                          <span className={`font-bold ${
                            isWinner ? 'text-amber-900 text-lg' : ''
                          }`}>
                            {percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: isWinner ? '#8B4513' : (candidate.color || '#3b82f6'),
                              boxShadow: isWinner ? '0 0 8px #FFD700' : 'none'
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {/* ===== MENSAJE DE FELICITACIÓN (SOLO GANADOR) ===== */}
                    {isWinner && (
                      <div className="mt-2 p-2 bg-amber-900/30 border-2 border-amber-400 rounded-lg text-center">
                        <div className="text-lg font-bold text-yellow-300">¡FELICITACIONES!</div>
                        <p className="text-xs text-amber-200 mt-1">
                          Umbral de {CALDAS_THRESHOLD.toLocaleString('es-CO')} votos alcanzado
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer - Fijo en la parte inferior */}
      <div className="shrink-0">
        <Footer />
      </div>
    </div>
  );
}

