import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function ResultsDisplay() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchar candidatos
    const candidatesQuery = query(collection(db, 'candidates'), orderBy('ballotNumber', 'asc'));
    const unsubscribeCandidates = onSnapshot(candidatesQuery, (snapshot) => {
      const candidatesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCandidates(candidatesData);
    });

    // Escuchar reportes para calcular votos
    const reportsQuery = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
    const unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => doc.data());
      
      // Calcular votos por candidato
      let total = 0;
      const candidateVotes: { [key: string]: number } = {};
      
      // Inicializar contadores
      candidates.forEach(cand => {
        candidateVotes[cand.id] = 0;
      });

      // Sumar votos de todos los reportes
      reportsData.forEach(report => {
        if (report.votes && typeof report.votes === 'object') {
          Object.entries(report.votes).forEach(([candId, voteCount]) => {
            if (typeof voteCount === 'number' && candidateVotes[candId] !== undefined) {
              candidateVotes[candId] += voteCount;
              total += voteCount;
            }
          });
        }
      });

      setTotalVotes(total);
      setLastUpdate(new Date());
      
      // Actualizar candidatos con votos
      const updatedCandidates = candidates.map(cand => ({
        ...cand,
        votes: candidateVotes[cand.id] || 0
      })).sort((a, b) => b.votes - a.votes); // Ordenar por votos descendente

      setCandidates(updatedCandidates);
      setLoading(false);
    });

    return () => {
      unsubscribeCandidates();
      unsubscribeReports();
    };
  }, [candidates]);

  // Calcular porcentaje de votos
  const calculatePercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-500 mx-auto mb-6"></div>
          <p className="text-4xl text-white font-bold">Cargando resultados electorales...</p>
          <p className="text-xl text-gray-400 mt-4">Conectando con Firebase en tiempo real</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white p-6">
      {/* Header - Fijo en la parte superior */}
      <div className="text-center mb-8 py-4 border-b border-blue-500">
        <h1 className="text-6xl md:text-8xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
          RESULTADOS ELECCIONES 2026
        </h1>
        <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-4">
          <div className="bg-blue-600 px-8 py-3 rounded-full text-3xl font-bold shadow-lg">
            TOTAL VOTOS: {totalVotes.toLocaleString('es-CO')}
          </div>
          <div className="text-2xl text-blue-300">
            Última actualización: {lastUpdate.toLocaleTimeString('es-CO', { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit',
              hour12: false 
            })}
          </div>
        </div>
      </div>

      {/* Grid de candidatos - Responsive para pantallas grandes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {candidates.map((candidate) => {
          const percentage = calculatePercentage(candidate.votes);
          return (
            <div 
              key={candidate.id} 
              className="bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border-4 transform transition-all duration-500 hover:scale-[1.02]"
              style={{ 
                borderColor: candidate.color || '#3b82f6',
                boxShadow: `0 20px 25px -5px ${candidate.color}33, 0 10px 10px -5px ${candidate.color}1a`
              }}
            >
              {/* Foto del candidato - Grande y destacada */}
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
                {/* Número de tarjetón grande */}
                <div className="text-center mb-4">
                  <span className="inline-block bg-blue-600 text-white text-4xl font-bold px-6 py-2 rounded-full shadow-lg">
                    #{candidate.ballotNumber || '?'}
                  </span>
                </div>
                
                {/* Nombre y partido */}
                <h2 className="text-4xl font-bold text-center mb-2">{candidate.name}</h2>
                <p className="text-2xl text-blue-300 text-center mb-4">{candidate.party}</p>
                <div className="text-center mb-6">
                  <span className="inline-block bg-purple-900 text-purple-300 px-4 py-1 rounded-full text-xl">
                    {candidate.position}
                  </span>
                </div>
                
                {/* Contador de votos - EXTRA GRANDE */}
                <div className="text-center mb-6">
                  <div 
                    className="text-8xl md:text-9xl font-bold mb-2"
                    style={{ color: candidate.color || '#3b82f6' }}
                  >
                    {candidate.votes.toLocaleString('es-CO')}
                  </div>
                  <p className="text-3xl text-gray-300">VOTOS</p>
                </div>
                
                {/* Barra de progreso */}
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

      {/* Mensaje si no hay candidatos */}
      {candidates.length === 0 && (
        <div className="text-center py-24 max-w-4xl mx-auto">
          <div className="text-9xl mb-8">🗳️</div>
          <h2 className="text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-yellow-500">
            SIN RESULTADOS AÚN
          </h2>
          <p className="text-4xl text-gray-300 mb-8">
            Esperando reportes de votos en tiempo real...
          </p>
          <div className="text-3xl text-blue-400 animate-pulse">
            Conectado a Firebase • Actualizando cada segundo
          </div>
        </div>
      )}

      {/* Footer - Fijo en la parte inferior */}
      <div className="text-center mt-12 pt-6 border-t border-blue-800 text-xl text-blue-300">
        <p>Sistema de Monitoreo Electoral en Tiempo Real • Caldas 2026</p>
        <p className="mt-2 text-lg">Datos actualizados automáticamente desde reportes de testigos electorales</p>
      </div>
    </div>
  );
}