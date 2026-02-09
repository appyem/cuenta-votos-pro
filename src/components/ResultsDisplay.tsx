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

  const isLoading = loadingCandidates || loadingReports;
  const hasData = candidates.length > 0 && reports.length > 0;

  // ===== DISEÑO ESPECÍFICO PARA PANTALLAS GRANDES (TVs/PROYECTORES) =====
  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white flex flex-col">
      {/* Header - Fijo y compacto para pantallas grandes */}
      <div className="shrink-0 py-2 md:py-3 border-b border-blue-500 bg-black/60 backdrop-blur-sm z-50">
        <div className="text-center px-2 md:px-4">
          <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight">
            RESULTADOS ELECCIONES CALDAS 2026
          </h1>
          
          {/* Información crítica - Compacta pero legible */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 mt-2 text-xs md:text-base">
            <div className="bg-blue-600 px-4 py-1.5 md:px-6 md:py-2 rounded-full font-bold whitespace-nowrap">
              TOTAL VOTOS: {totalVotes.toLocaleString('es-CO')}
            </div>
            <div className="bg-black/30 px-3 py-1 md:px-4 md:py-1.5 rounded-full whitespace-nowrap">
              Última actualización: {lastUpdate.toLocaleTimeString('es-CO', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
              })}
            </div>
          </div>
          
          {/* ===== BANNER DE UMBRAL (SIEMPRE VISIBLE, SIN OCUPAR ESPACIO EXTRA) ===== */}
          {hasReachedThreshold && (
            <div className="mt-2 md:mt-3 bg-gradient-to-r from-yellow-400 to-amber-600 text-black font-bold text-sm md:text-base py-1.5 md:py-2 rounded-lg shadow-lg border-2 border-yellow-300 max-w-4xl mx-auto">
              <div className="flex items-center justify-center gap-1.5 md:gap-2 flex-wrap px-2">
                <span className="text-xl md:text-2xl">🎉</span>
                <span className="font-black">¡UMBRAL ALCANZADO! GANADOR:</span>
                <span className="text-lg md:text-xl lg:text-2xl font-extrabold bg-amber-900 text-yellow-300 px-2.5 py-0.5 md:px-4 md:py-1 rounded-full shadow-md">
                  {winner?.name.toUpperCase()}
                </span>
                <span className="text-xl md:text-2xl">🏆</span>
              </div>
              <p className="text-[0.65rem] md:text-xs mt-0.5 font-medium text-amber-900 max-w-2xl mx-auto">
                Proyección de ganador según ley electoral de Caldas (Art. 107)
              </p>
            </div>
          )}
          
          {/* ===== BARRA DE PROGRESO COMPACTA (SOLO ANTES DE UMBRAL) ===== */}
          {!hasReachedThreshold && (
            <div className="mt-2 md:mt-3 bg-blue-900/50 border border-blue-500 rounded-lg p-1.5 md:p-2 max-w-3xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 md:gap-2 text-[0.65rem] md:text-xs">
                <div className="font-bold text-center sm:text-left">
                  <span className="text-yellow-300 font-black">{remainingVotes.toLocaleString('es-CO')}</span> para el umbral de <span className="text-yellow-300 font-black">{CALDAS_THRESHOLD.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex-1 max-w-md mx-auto sm:mx-0">
                  <div className="w-full bg-gray-700 rounded-full h-1.5 md:h-2 overflow-hidden">
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

      {/* Contenido Principal - SCROLL SOLO SI ES ABSOLUTAMENTE NECESARIO */}
      <div className="flex-grow overflow-y-auto py-2 md:py-3 px-1 md:px-2 lg:px-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-16 w-16 md:h-24 md:w-24 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <p className="text-xl md:text-2xl font-bold">Conectando con Firebase...</p>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] max-w-3xl mx-auto p-6">
            <div className="text-6xl md:text-8xl mb-6 animate-bounce">🗳️</div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">SIN RESULTADOS AÚN</h2>
            <p className="text-xl md:text-2xl text-gray-300 mb-6">
              Esperando datos de Firebase...
            </p>
          </div>
        ) : (
          // ===== GRID OPTIMIZADO PARA PANTALLAS GRANDES =====
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 md:gap-3 max-w-7xl mx-auto">
            {candidatesWithVotes.map((candidate) => {
              const percentage = totalVotes > 0 ? Math.round((candidate.votes / totalVotes) * 100) : 0;
              const isWinner = hasReachedThreshold && candidate.id === winner?.id;
              
              return (
                <div 
                  key={candidate.id} 
                  className={`bg-gray-800 rounded-xl shadow-xl border-2 flex flex-col overflow-hidden relative transition-all duration-300 ${
                    isWinner 
                      ? 'border-yellow-400 ring-2 ring-yellow-300/50 scale-[1.01] z-10' 
                      : 'border-gray-700 hover:shadow-2xl'
                  }`}
                  style={{ 
                    borderColor: isWinner ? '#FFD700' : (candidate.color || '#3b82f6'),
                    boxShadow: isWinner 
                      ? '0 0 15px #FFD700, 0 0 30px #FFA500' 
                      : `0 4px 10px ${candidate.color}33`,
                    minHeight: '320px' // MÍNIMO ABSOLUTO PARA PANTALLAS GRANDES
                  }}
                >
                  {/* ===== BADGE DE GANADOR (SOLO EN ESTADO UMBRAL) ===== */}
                  {isWinner && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-red-600 to-amber-500 text-white font-bold text-sm md:text-base px-3 py-1 rounded-full shadow-lg z-20 border-2 border-yellow-300 flex items-center">
                      <span className="text-lg md:text-xl mr-1">🏆</span> ¡GANADOR!
                    </div>
                  )}
                  
                  {/* ===== SECCIÓN SUPERIOR: DATOS BÁSICOS ===== */}
                  <div className={`p-2 md:p-3 border-b flex-shrink-0 ${isWinner ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-900 font-bold' : 'bg-gray-900 border-gray-700'}`}>
                    <div className="text-center mb-1">
                      <span className={`inline-block font-bold px-2 py-0.5 md:px-3 md:py-1 rounded text-xs md:text-sm ${
                        isWinner 
                          ? 'bg-amber-900 text-yellow-300' 
                          : 'bg-blue-600 text-white'
                      }`}>
                        #{candidate.ballotNumber || '?'}
                      </span>
                    </div>
                    <h2 className={`text-sm md:text-base font-bold text-center px-1 leading-tight ${
                      isWinner ? 'text-amber-900 text-lg md:text-xl' : 'text-white'
                    }`}>
                      {candidate.name}
                    </h2>
                    <p className={`text-[0.6rem] md:text-xs text-center px-1 mt-0.5 ${
                      isWinner ? 'text-amber-900 font-medium' : 'text-blue-300'
                    }`}>
                      {candidate.party}
                    </p>
                  </div>
                  
                  {/* ===== SECCIÓN CENTRAL: FOTO (TAMAÑO FIJO PARA TVS) ===== */}
                  <div className="bg-gray-700 p-2 md:p-3 flex-grow min-h-[120px] md:min-h-[140px] flex items-center justify-center overflow-hidden">
                    {candidate.imageUrl ? (
                      <img 
                        src={candidate.imageUrl} 
                        alt={candidate.name} 
                        className="max-w-full max-h-full object-contain rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name)}&background=${candidate.color?.replace('#', '') || '3b82f6'}&color=fff&size=256`;
                        }}
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center text-white text-4xl md:text-5xl font-bold rounded"
                        style={{ backgroundColor: (candidate.color || '#3b82f6') + 'cc' }}
                      >
                        {candidate.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  
                  {/* ===== SECCIÓN INFERIOR: RESULTADOS ===== */}
                  <div className={`p-2 md:p-3 flex-shrink-0 ${isWinner ? 'bg-gradient-to-r from-amber-500 to-yellow-400 border-t border-amber-300' : 'bg-gray-850 border-t border-gray-700'}`}>
                    <div className="text-center py-0.5 md:py-1">
                      <div 
                        className={`font-bold ${
                          isWinner 
                            ? 'text-2xl md:text-3xl text-amber-900' 
                            : 'text-xl md:text-2xl'
                        }`}
                        style={{ color: isWinner ? '#8B4513' : (candidate.color || '#3b82f6') }}
                      >
                        {candidate.votes.toLocaleString('es-CO')}
                      </div>
                      <p className={`text-[0.6rem] md:text-xs mt-0.5 ${
                        isWinner ? 'text-amber-900 font-bold' : 'text-gray-300'
                      }`}>
                        VOTOS
                      </p>
                    </div>
                    
                    {totalVotes > 0 && (
                      <div className="mt-1 md:mt-2">
                        <div className="flex justify-between text-[0.6rem] md:text-xs mb-0.5 md:mb-1">
                          <span className={`truncate max-w-[60%] ${
                            isWinner ? 'font-bold text-amber-900' : 'text-gray-400'
                          }`}>
                            {isWinner ? '¡PROYECCIÓN GANADOR!' : 'Participación:'}
                          </span>
                          <span className={`font-bold ${
                            isWinner ? 'text-amber-900 text-base' : ''
                          }`}>
                            {percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5 md:h-2 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: isWinner ? '#8B4513' : (candidate.color || '#3b82f6'),
                              boxShadow: isWinner ? '0 0 6px #FFD700' : 'none'
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {/* ===== MENSAJE DE FELICITACIÓN (SOLO GANADOR) ===== */}
                    {isWinner && (
                      <div className="mt-1 md:mt-2 p-1.5 md:p-2 bg-amber-900/20 border border-amber-400 rounded-lg text-center">
                        <div className="text-base md:text-lg font-bold text-yellow-300">¡FELICITACIONES!</div>
                        <p className="text-[0.6rem] md:text-xs text-amber-200 mt-0.5">
                          Umbral de {CALDAS_THRESHOLD.toLocaleString('es-CO')} votos
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

      {/* Footer - Compacto para pantallas grandes */}
      <div className="shrink-0 py-1 md:py-2 border-t border-blue-800/50">
        <Footer />
      </div>
    </div>
  );
}
