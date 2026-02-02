import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MUNICIPALITIES } from '../config/municipalities';

// Tipos de elección
const ELECTION_TYPES = [
  { id: 'presidencia', label: 'Presidencia' },
  { id: 'gobernacion', label: 'Gobernación' },
  { id: 'alcaldia', label: 'Alcaldía' },
  { id: 'senado', label: 'Senado' },
  { id: 'camara', label: 'Cámara' },
  { id: 'asamblea', label: 'Asamblea' },
  { id: 'concejo', label: 'Concejo' }
];

export default function Dashboard() {
  // Estado para datos de Firestore
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado calculado
  const [stats, setStats] = useState({
    reportedTables: 0,
    totalTables: MUNICIPALITIES.reduce((sum, m) => sum + m.tables, 0),
    totalVotes: 0,
    activeAlerts: 0
  });
  
  const [votesChartData, setVotesChartData] = useState<any[]>([]);
  const [candidateList, setCandidateList] = useState<any[]>([]);

  // Estado para selección de municipio
  const [selectedMunicipio, setSelectedMunicipio] = useState('manizales');

  // Estado para gestión de candidatos (¡AGREGADO ballotNumber!)
  const [candidateForm, setCandidateForm] = useState({
    name: '',
    party: '',
    color: '#3b82f6',
    imageUrl: '',
    position: 'gobernacion',
    ballotNumber: '' // ← ¡NUEVO CAMPO OBLIGATORIO!
  });
  const [candidates, setCandidates] = useState<any[]>([]);
  const [showCandidateForm, setShowCandidateForm] = useState(false);
  const [isSubmittingCandidate, setIsSubmittingCandidate] = useState(false);
  
  // Estado para carga de imagen
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calcular estadísticas (¡CORREGIDO CON useCallback!)
  const calculateStats = useCallback((reportsData: any[]) => {
    let totalVotes = 0;
    const candidateTotals: { [key: string]: number } = {};
    
    // Inicializar contadores con candidatos reales
    candidates.forEach(cand => {
      candidateTotals[cand.id] = 0;
    });

    reportsData.forEach(report => {
      if (report.votes && typeof report.votes === 'object') {
        Object.entries(report.votes).forEach(([candId, voteCount]) => {
          if (typeof voteCount === 'number' && candidateTotals[candId] !== undefined) {
            candidateTotals[candId] += voteCount;
            totalVotes += voteCount;
          }
        });
      }
    });

    setStats({
      reportedTables: reportsData.length,
      totalTables: MUNICIPALITIES.reduce((sum, m) => sum + m.tables, 0),
      totalVotes,
      activeAlerts: reportsData.filter(r => r.hasIrregularity && !r.resolved).length
    });

    const chartData = candidates.map(cand => ({
      name: cand.name.split(' ')[0],
      votes: candidateTotals[cand.id] || 0,
      color: cand.color || '#3b82f6'
    }));
    setVotesChartData(chartData);

    const candidateData = candidates.map(cand => ({
      ...cand,
      votes: candidateTotals[cand.id] || 0
    }));
    setCandidateList(candidateData);
  }, [candidates]); // ← Dependencia explícita

  // Conectar con Firestore para reports (¡CORREGIDO SIN ESLINT ERROR!)
  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        try {
          const reportsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          calculateStats(reportsData);
          setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error processing reports:', err);
          setError('Error al procesar los datos');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error fetching reports from Firestore:', err);
        setError('Error de conexión con la base de datos');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [calculateStats]); // ← calculateStats estable gracias a useCallback

  // Conectar con Firestore para candidates
  useEffect(() => {
    const candidatesQuery = query(collection(db, 'candidates'), orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(candidatesQuery, 
      (snapshot) => {
        try {
          const candidatesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setCandidates(candidatesData);
        } catch (err) {
          console.error('Error fetching candidates:', err);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Formateador seguro para números
  const formatNumber = (value: number | string | undefined): string => {
    if (typeof value === 'number') {
      return value.toLocaleString('es-CO');
    }
    return String(value || 0);
  };

  // Compartir por WhatsApp (¡CORREGIDO: espacios eliminados!)
  const shareByWhatsApp = () => {
    const url = `${window.location.origin}/${selectedMunicipio}`;
    const message = `Accede aquí para reportar votos en ${getMunicipioName(selectedMunicipio)}: ${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`; // ✅ SIN ESPACIOS
    window.open(whatsappUrl, '_blank');
  };

  // Obtener nombre del municipio
  const getMunicipioName = (id: string): string => {
    const municipio = MUNICIPALITIES.find(m => m.id === id);
    return municipio ? municipio.name : id;
  };

  // Manejar cambios en el formulario de candidatos
  const handleCandidateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCandidateForm(prev => ({ ...prev, [name]: value }));
  };

  // Manejar carga de imagen desde dispositivo
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('⚠️ Por favor selecciona un archivo de imagen válido (JPG, PNG, GIF)');
      return;
    }

    // Validar tamaño (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('⚠️ La imagen es demasiado grande. Máximo 2MB permitido.');
      return;
    }

    setIsUploadingImage(true);
    
    try {
      // Leer archivo como base64
      const base64String = await readFileAsBase64(file);
      
      // Actualizar estado con preview y URL base64
      setImagePreview(base64String);
      setCandidateForm(prev => ({ ...prev, imageUrl: base64String }));
      
    } catch (error) {
      console.error('Error al procesar la imagen:', error);
      alert('❌ Error al cargar la imagen. Intente con otra imagen.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Función auxiliar para leer archivo como base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target?.result as string;
        resolve(result);
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      reader.readAsDataURL(file);
    });
  };

  // Limpiar imagen seleccionada
  const clearImage = () => {
    setImagePreview(null);
    setCandidateForm(prev => ({ ...prev, imageUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Enviar formulario de candidato
  const handleCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!candidateForm.name || !candidateForm.party || !candidateForm.ballotNumber) {
      alert('⚠️ Por favor complete el nombre, partido y número de tarjetón del candidato');
      return;
    }

    setIsSubmittingCandidate(true);
    
    try {
      const candidateData = {
        ...candidateForm,
        timestamp: serverTimestamp(),
        active: true
      };

      await addDoc(collection(db, 'candidates'), candidateData);
      
      // Reset form y preview (¡INCLUYE ballotNumber!)
      setCandidateForm({
        name: '',
        party: '',
        color: '#3b82f6',
        imageUrl: '',
        position: 'gobernacion',
        ballotNumber: '' // ← ¡RESET CORRECTO!
      });
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setShowCandidateForm(false);
      alert('✅ Candidato agregado exitosamente');
    } catch (error) {
      console.error('Error adding candidate:', error);
      alert('❌ Error al agregar el candidato. Intente nuevamente.');
    } finally {
      setIsSubmittingCandidate(false);
    }
  };

  // Eliminar candidato
  const handleDeleteCandidate = async (candidateId: string) => {
    if (!window.confirm('¿Está seguro de eliminar este candidato? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'candidates', candidateId));
      alert('✅ Candidato eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting candidate:', error);
      alert('❌ Error al eliminar el candidato');
    }
  };

  // UI de carga
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos en tiempo real...</p>
        </div>
      </div>
    );
  }

  // UI de error
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
        <div className="flex">
          <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Título */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard Electoral - Caldas</h1>
        <p className="text-gray-600 mt-2">Resultados en tiempo real desde Firestore</p>
        <p className="text-sm text-green-600 mt-1 flex items-center justify-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Conectado a Firebase • Última actualización: {new Date().toLocaleTimeString('es-CO')}
        </p>
      </div>

      {/* Selector de Municipio y Compartir */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Generar Enlace para Testigos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="municipioSelect" className="block text-sm font-medium text-gray-700 mb-1">
              Seleccionar Municipio
            </label>
            <select
              id="municipioSelect"
              value={selectedMunicipio}
              onChange={(e) => setSelectedMunicipio(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {MUNICIPALITIES.map(municipio => (
                <option key={municipio.id} value={municipio.id}>
                  {municipio.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col justify-end">
            <button
              onClick={shareByWhatsApp}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center shadow-md"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Compartir por WhatsApp
            </button>
            <p className="text-xs text-gray-500 mt-1 text-center">
              Enviar enlace a testigos de {getMunicipioName(selectedMunicipio)}
            </p>
          </div>
        </div>
        
        {/* URL generada */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">URL para reportar votos:</p>
          <div className="flex items-center">
            <code className="flex-1 bg-white p-2 rounded border text-sm font-mono truncate">
              {window.location.origin}/{selectedMunicipio}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/${selectedMunicipio}`)}
              className="ml-2 bg-gray-200 hover:bg-gray-300 p-2 rounded-lg transition-colors"
              title="Copiar enlace"
            >
              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Los testigos pueden acceder directamente a esta URL para reportar votos en {getMunicipioName(selectedMunicipio)}
          </p>
        </div>
      </div>


      {/* Enlace para Pantalla de Resultados Públicos */}
      <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
        <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
          <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2-4h10m-6 2a2 2 0 100-4H5a2 2 0 000 4h14a2 2 0 000-4h-6m-2 4h10" />
          </svg>
          Pantalla Pública de Resultados
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          URL para proyectar resultados en tiempo real en pantallas grandes (TV, proyectores, etc.)
        </p>
        <div className="flex items-center">
          <code className="flex-1 bg-white p-3 rounded border text-sm font-mono truncate">
            {window.location.origin}/resultados
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/resultados`)}
            className="ml-3 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-lg transition-colors"
            title="Copiar enlace"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-purple-600 mt-2">
          ✅ Vista optimizada para pantallas grandes • Actualización en tiempo real • Sin controles (solo lectura)
        </p>
      </div>

      {/* Gestión de Candidatos */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Administrar Candidatos</h2>
          <button
            onClick={() => {
              setShowCandidateForm(!showCandidateForm);
              // Limpiar formulario al cerrar (¡INCLUYE ballotNumber!)
              if (showCandidateForm) {
                setCandidateForm({
                  name: '',
                  party: '',
                  color: '#3b82f6',
                  imageUrl: '',
                  position: 'gobernacion',
                  ballotNumber: '' // ← ¡RESET AL CERRAR!
                });
                setImagePreview(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {showCandidateForm ? 'Ocultar Formulario' : 'Agregar Candidato'}
          </button>
        </div>

        {/* Formulario de Candidato (colapsable) */}
        {showCandidateForm && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Nuevo Candidato</h3>
            <form onSubmit={handleCandidateSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombre y Partido */}
              <div className="md:col-span-2">
                <label htmlFor="candidateName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo del Candidato <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="candidateName"
                  name="name"
                  value={candidateForm.name}
                  onChange={handleCandidateChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Carlos Eduardo Gómez Pérez"
                />
              </div>
              
              <div>
                <label htmlFor="candidateParty" className="block text-sm font-medium text-gray-700 mb-1">
                  Partido Político <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="candidateParty"
                  name="party"
                  value={candidateForm.party}
                  onChange={handleCandidateChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Partido Verde"
                />
              </div>
              
              {/* ¡NUEVO CAMPO: Número de Tarjetón! */}
              <div>
                <label htmlFor="candidateBallotNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Tarjetón <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="candidateBallotNumber"
                  name="ballotNumber"
                  value={candidateForm.ballotNumber}
                  onChange={handleCandidateChange}
                  required
                  min="1"
                  max="999"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: 1"
                />
                <p className="text-xs text-gray-500 mt-1">Número único en la boleta electoral</p>
              </div>
              
              <div>
                <label htmlFor="candidatePosition" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Elección <span className="text-red-500">*</span>
                </label>
                <select
                  id="candidatePosition"
                  name="position"
                  value={candidateForm.position}
                  onChange={handleCandidateChange}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {ELECTION_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color del Candidato <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      id="candidateColor"
                      name="color"
                      value={candidateForm.color}
                      onChange={handleCandidateChange}
                      className="w-12 h-10 rounded border cursor-pointer"
                      title="Seleccionar color"
                    />
                    <input
                      type="text"
                      value={candidateForm.color}
                      onChange={handleCandidateChange}
                      name="color"
                      className="w-24 px-2 py-1.5 border border-gray-300 rounded text-xs font-mono"
                      placeholder="#3b82f6"
                      maxLength={7}
                    />
                  </div>
                  <div 
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: candidateForm.color }}
                    title={`Color actual: ${candidateForm.color}`}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Selecciona un color para gráficos y tarjetas</p>
              </div>
              
              {/* Carga de imagen DESDE DISPOSITIVO */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Foto del Candidato <span className="text-gray-500">(opcional)</span>
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      id="candidateImage"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploadingImage}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-3 file:py-2 file:px-4 file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Sube una foto desde tu dispositivo (JPG, PNG, GIF - máximo 2MB)
                    </p>
                  </div>
                  
                  {imagePreview && (
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Vista previa" 
                          className="w-20 h-20 object-cover rounded-full border-2 border-blue-200"
                        />
                        {isUploadingImage && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={clearImage}
                        className="text-red-600 hover:text-red-800 font-medium text-sm flex items-center"
                        title="Eliminar foto"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="md:col-span-2 flex space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingCandidate}
                  className={`flex-1 font-bold py-2.5 px-4 rounded-lg transition-colors ${
                    isSubmittingCandidate
                      ? 'bg-blue-400 cursor-wait'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isSubmittingCandidate ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Guardando...
                    </span>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Guardar Candidato
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCandidateForm({
                      name: '',
                      party: '',
                      color: '#3b82f6',
                      imageUrl: '',
                      position: 'gobernacion',
                      ballotNumber: '' // ← ¡RESET EN CANCELAR!
                    });
                    setImagePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    setShowCandidateForm(false);
                  }}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Candidatos */}
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Candidatos Registrados ({candidates.length})
          </h3>
          
          {candidates.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-4xl mb-3">🗳️</div>
              <p className="text-gray-600 font-medium">No hay candidatos registrados</p>
              <p className="text-gray-500 mt-1">
                Agrega candidatos desde el Dashboard principal usando el formulario "Administrar Candidatos"
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidates.map((candidate) => (
                <div 
                  key={candidate.id} 
                  className="border-2 rounded-xl p-4 hover:shadow-md transition-all duration-200 relative group"
                  style={{ borderColor: candidate.color || '#3b82f6' }}
                >
                  {/* BOTÓN DE ELIMINAR */}
                  <button
                    onClick={() => handleDeleteCandidate(candidate.id)}
                    className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 hover:text-red-800 transition-colors shadow-sm z-10"
                    title="Eliminar candidato"
                    aria-label={`Eliminar candidato ${candidate.name}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  
                  <div className="mt-4 flex items-start">
                    <div className="flex-shrink-0">
                      {candidate.imageUrl ? (
                        <img 
                          src={candidate.imageUrl} 
                          alt={candidate.name} 
                          className="w-14 h-14 rounded-full object-cover border-2" 
                          style={{ borderColor: candidate.color || '#3b82f6' }}
                          onError={(e) => {
                            // Fallback si la imagen no carga (¡CORREGIDO SIN ESPACIOS!)
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name)}&background=${candidate.color?.replace('#', '') || '3b82f6'}&color=fff`;
                          }}
                        />
                      ) : (
                        <div 
                          className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold border-2"
                          style={{ 
                            backgroundColor: (candidate.color || '#3b82f6') + 'cc',
                            borderColor: candidate.color || '#3b82f6'
                          }}
                        >
                          {candidate.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 truncate" title={candidate.name}>
                        {candidate.name}
                      </h4>
                      <p className="text-sm text-gray-600 truncate" title={candidate.party}>
                        {candidate.party}
                      </p>
                      <div 
                        className="mt-2 inline-block px-2 py-0.5 rounded text-xs font-medium"
                        style={{ 
                          backgroundColor: (candidate.color || '#3b82f6') + '15',
                          color: candidate.color || '#3b82f6'
                        }}
                      >
                        {ELECTION_TYPES.find(t => t.id === candidate.position)?.label || candidate.position}
                      </div>
                      {/* ¡MOSTRAR NÚMERO DE TARJETÓN! */}
                      <div className="mt-1 text-xs font-bold text-blue-600">
                        Tarjetón #{candidate.ballotNumber || '?'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Vista previa del color */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Color:</span>
                    <div 
                      className="w-6 h-6 rounded-full border border-gray-300"
                      style={{ backgroundColor: candidate.color || '#3b82f6' }}
                      title={`Color: ${candidate.color}`}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <h3 className="text-gray-500 text-sm font-medium">Mesas Reportadas</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.reportedTables.toLocaleString('es-CO')}</p>
          <p className="text-green-600 mt-1">
            {Math.round((stats.reportedTables / stats.totalTables) * 100)}% del total
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <h3 className="text-gray-500 text-sm font-medium">Votos Totales</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{formatNumber(stats.totalVotes)}</p>
          <p className="text-blue-600 mt-1">+{formatNumber(stats.totalVotes)} hoy</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
          <h3 className="text-gray-500 text-sm font-medium">Alertas Activas</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.activeAlerts}</p>
          <p className="text-red-600 mt-1">{stats.activeAlerts > 0 ? 'Requieren atención' : 'Todo normal'}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
          <h3 className="text-gray-500 text-sm font-medium">Municipios</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">27/27</p>
          <p className="text-purple-600 mt-1">100% cubiertos</p>
        </div>
      </div>


            {/* Widget: Enlace a Análisis Territorial */}
      <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-indigo-500">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="mb-3 md:mb-0">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Análisis Territorial de Caldas
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Monitoreo en tiempo real de los 27 municipios • 
              <span className="font-bold text-indigo-600 ml-1">{stats.reportedTables} mesas reportadas</span>
            </p>
          </div>
          <a 
            href="/analisis-territorial" 
            className="w-full md:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium flex items-center justify-center shadow"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Ver Análisis Completo
          </a>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-indigo-50 p-3 rounded-lg text-center border border-indigo-100">
            <div className="text-2xl font-bold text-indigo-600">{MUNICIPALITIES.length}</div>
            <div className="text-xs text-indigo-700 font-medium">Municipios</div>
          </div>
          <div className="bg-indigo-50 p-3 rounded-lg text-center border border-indigo-100">
            <div className="text-2xl font-bold text-indigo-600">
              {Math.round((stats.reportedTables / stats.totalTables) * 100)}%
            </div>
            <div className="text-xs text-indigo-700 font-medium">Avance General</div>
          </div>
        </div>
        
        <p className="text-xs text-indigo-600 mt-3 bg-indigo-50 p-2 rounded">
          💡 <strong>Tip:</strong> En el análisis territorial encontrarás mapa interactivo, 
          tabla detallada con filtros, ordenamiento y exportación a CSV para tu equipo de campaña.
        </p>
      </div>


      {/* Gráfico de votos */}
      {candidates.length > 0 ? (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Votos por Candidato (Todos los municipios)</h2>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={votesChartData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                barSize={40}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                  height={70}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  padding={{ left: 20, right: 20 }}
                />
                <YAxis 
                  stroke="#6b7280"
                  tickFormatter={formatNumber}
                  width={90}
                />
                <Tooltip 
                  formatter={(value: number | [number, number] | undefined) => {
                    if (Array.isArray(value)) {
                      return [`${value[0].toLocaleString('es-CO')} - ${value[1].toLocaleString('es-CO')}`, 'Rango'];
                    }
                    return [formatNumber(value), 'Votos'];
                  }}
                  labelFormatter={(label) => `Candidato: ${label}`}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    padding: '10px'
                  }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey="votes" 
                  radius={[6, 6, 0, 0]}
                  background={{ fill: '#f3f4f6' }}
                >
                  {votesChartData.map((entry, index) => (
                    <rect key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md p-6 text-center py-12">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Sin datos para mostrar</h2>
          <p className="text-gray-600">
            Agrega candidatos desde la sección "Administrar Candidatos" para ver los resultados en el gráfico
          </p>
        </div>
      )}

      {/* Lista de candidatos con votos */}
      {candidates.length > 0 ? (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Candidatos</h2>
          <div className="space-y-4">
            {candidateList.map((candidate) => (
              <div 
                key={candidate.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center mr-4"
                    style={{ backgroundColor: (candidate.color || '#3b82f6') + '20' }}
                  >
                    <span className="text-xl font-bold" style={{ color: candidate.color || '#3b82f6' }}>
                      {candidate.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{candidate.name}</h3>
                    <p className="text-sm text-gray-500">{candidate.party} • {candidate.position}</p>
                    {/* ¡MOSTRAR NÚMERO DE TARJETÓN! */}
                    <p className="text-xs font-bold text-blue-600 mt-1">Tarjetón #{candidate.ballotNumber || '?'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ color: candidate.color || '#3b82f6' }}>
                    {formatNumber(candidate.votes)}
                  </p>
                  <p className="text-sm text-gray-500">votos</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md p-6 text-center py-12">
          <div className="text-5xl mb-4">👥</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Sin candidatos registrados</h2>
          <p className="text-gray-600">
            Usa el formulario "Administrar Candidatos" para agregar los primeros candidatos
          </p>
        </div>
      )}
    </div>
  );
}
