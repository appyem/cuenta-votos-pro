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
  const candidateCount = candidatesWithVotes.length;

  // ===== CALCULAR CLASES DE GRID DINÁMICAS SEGÚN CANTIDAD DE CANDIDATOS =====
  const getGridStyles = () => {
    if (candidateCount <= 2) {
      return {
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gridAutoRows: '1fr',
        gap: '1.5rem'
      };
    } else if (candidateCount <= 4) {
      return {
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gridAutoRows: '1fr',
        gap: '1.25rem'
      };
    } else if (candidateCount <= 6) {
      return {
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gridAutoRows: '1fr',
        gap: '1rem'
      };
    } else if (candidateCount <= 9) {
      return {
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gridAutoRows: '1fr',
        gap: '0.875rem'
      };
    } else if (candidateCount <= 12) {
      return {
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gridAutoRows: '1fr',
        gap: '0.75rem'
      };
    } else {
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
            RESULTADOS ELECCIONES CALDAS 2026
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
          
          {/* ===== BANNER DE UMBRAL (APARECE CUANDO SE ALCANZA) ===== */}
          {hasReachedThreshold && (
            <div className="mt-4 bg-gradient-to-r from-yellow-400 to-amber-600 text-black font-bold text-xl md:text-2xl py-3 rounded-lg shadow-2xl border-4 border-yellow-300 animate-pulse">
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl">🎉</span>
                <span>¡UMBRAL ALCANZADO! EL GANADOR ES:</span>
                <span className="text-3xl bg-amber-900 text-yellow-300 px-4 py-1 rounded-full shadow-lg">
                  {winner?.name.toUpperCase()}
                </span>
                <span className="text-4xl">🏆</span>
              </div>
              <p className="text-lg mt-1 font-medium text-amber-900">
                Proyección de ganador según ley electoral de Caldas (Art. 107)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Contenido Principal - OCUPA TODO EL ESPACIO DISPONIBLE */}
      <div className="flex-grow flex flex-col p-2 md:p-4 overflow-hidden">
        {/* ===== PROGRESO HACIA UMBRAL (ANTES DE ALCANZAR) ===== */}
        {!hasReachedThreshold && (
          <div className="mb-4 bg-blue-900/50 border border-blue-500 rounded-lg p-3 md:p-4 text-center animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-lg md:text-xl font-bold mb-1">
                  <span className="text-yellow-400">{remainingVotes.toLocaleString('es-CO')}</span> votos para alcanzar el umbral de <span className="text-yellow-400">{CALDAS_THRESHOLD.toLocaleString('es-CO')}</span>
                </p>
                <p className="text-sm md:text-base text-blue-200">
                  ¡Cada voto cuenta! Sigue reportando mesas para alcanzar la proyección de ganador
                </p>
              </div>
              <div className="flex-1 max-w-md mx-auto md:mx-0">
                <div className="w-full bg-gray-700 rounded-full h-3 md:h-4 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((totalVotes / CALDAS_THRESHOLD) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs mt-1 text-gray-400">
                  <span>0</span>
                  <span>{CALDAS_THRESHOLD.toLocaleString('es-CO')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

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
              const isWinner = hasReachedThreshold && candidate.id === winner?.id;
              
              return (
                <div 
                  key={candidate.id} 
                  className={`bg-gray-800 rounded-xl shadow-lg border-2 flex flex-col overflow-hidden relative ${
                    isWinner ? 'border-yellow-400 animate-pulse-slow' : ''
                  }`}
                  style={{ 
                    borderColor: isWinner ? '#FFD700' : (candidate.color || '#3b82f6'),
                    boxShadow: isWinner 
                      ? '0 0 25px #FFD700, 0 0 50px #FFA500' 
                      : `0 4px 6px ${candidate.color}33`,
                    transform: isWinner ? 'scale(1.02)' : 'none',
                    transition: 'all 0.5s ease-in-out',
                    zIndex: isWinner ? 10 : 1
                  }}
                >
                  {/* ===== BADGE DE GANADOR (SOLO CUANDO SE ALCANZA UMBRAL) ===== */}
                  {isWinner && (
                    <>
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-red-600 to-amber-500 text-white font-bold text-lg px-4 py-1 rounded-full shadow-2xl flex items-center z-20 border-2 border-yellow-300 animate-bounce">
                        <span className="text-2xl mr-1">🏆</span> ¡GANADOR!
                      </div>
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-amber-900 font-bold text-xl px-4 py-1 rounded-full shadow-lg z-20 animate-bounce-slow">
                        🎉🎊🥳
                      </div>
                    </>
                  )}
                  
                  {/* ===== SECCIÓN SUPERIOR: DATOS BÁSICOS ===== */}
                  <div className={`p-2 border-b flex-shrink-0 ${isWinner ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-900 font-bold' : 'bg-gray-900 border-gray-700'}`} style={{ minHeight: '45px' }}>
                    <div className="text-center mb-1">
                      <span className={`inline-block font-bold px-2 py-0.5 rounded ${
                        isWinner 
                          ? 'bg-amber-900 text-yellow-300 text-sm md:text-base' 
                          : 'bg-blue-600 text-white text-xs md:text-sm'
                      }`}>
                        #{candidate.ballotNumber || '?'}
                      </span>
                    </div>
                    <h2 className={`text-xs md:text-sm font-bold text-center truncate px-1 leading-tight ${
                      isWinner ? 'text-amber-900 text-lg md:text-xl' : 'text-white'
                    }`}>
                      {candidate.name}
                    </h2>
                    <p className={`text-[0.6rem] md:text-xs text-center truncate px-1 mt-0.5 ${
                      isWinner ? 'text-amber-900 font-medium' : 'text-blue-300'
                    }`}>
                      {candidate.party}
                    </p>
                  </div>
                  
                  {/* ===== SECCIÓN CENTRAL: FOTO ===== */}
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
                  
                  {/* ===== SECCIÓN INFERIOR: RESULTADOS ===== */}
                  <div className={`p-1.5 flex-shrink-0 ${isWinner ? 'bg-gradient-to-r from-amber-500 to-yellow-400 border-t border-amber-300' : 'bg-gray-850 border-t border-gray-700'}`} style={{ minHeight: '65px' }}>
                    <div className="text-center py-0.5">
                      <div 
                        className={`font-bold ${
                          isWinner 
                            ? 'text-2xl md:text-3xl text-amber-900 animate-pulse' 
                            : 'text-lg md:text-xl'
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
                      <div className="mt-1">
                        <div className="flex justify-between text-[0.6rem] md:text-xs mb-0.5">
                          <span className={`truncate max-w-[50%] ${
                            isWinner ? 'font-bold text-amber-900' : 'text-gray-400'
                          }`}>
                            {isWinner ? '¡PROYECCIÓN GANADOR!' : 'Participación:'}
                          </span>
                          <span className={`font-bold flex-shrink-0 ${
                            isWinner ? 'text-amber-900 text-lg' : ''
                          }`}>
                            {percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: isWinner ? '#8B4513' : (candidate.color || '#3b82f6'),
                              boxShadow: isWinner ? '0 0 10px #FFD700' : 'none'
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {/* ===== MENSAJE DE FELICITACIÓN (SOLO GANADOR) ===== */}
                    {isWinner && (
                      <div className="mt-2 p-2 bg-amber-900/30 border-2 border-amber-400 rounded-lg text-center">
                        <div className="text-lg font-bold text-yellow-300 animate-pulse">¡FELICITACIONES!</div>
                        <p className="text-[0.65rem] md:text-xs text-amber-200 mt-1">
                          Has alcanzado el umbral de {CALDAS_THRESHOLD.toLocaleString('es-CO')} votos
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

      <Footer />
    </div>
  );
}
