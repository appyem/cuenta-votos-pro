import React, { useState, useEffect } from 'react';
import { addDoc, collection, serverTimestamp, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MUNICIPALITIES, Municipality } from '../config/municipalities';
import { useParams } from 'react-router-dom';

// Tipos de irregularidades
const IRREGULARITY_TYPES = [
  { id: 'documentacion', label: 'Falta de documentación' },
  { id: 'presion', label: 'Presión a electores' },
  { id: 'tecnica', label: 'Falla técnica' },
  { id: 'otra', label: 'Otra' }
];

export default function WitnessForm() {
  // Obtener municipio de la URL
  const { municipioId } = useParams<{ municipioId: string }>();
  const municipioParam = municipioId || 'manizales';
  
  // Obtener datos del municipio
  const municipioData: Municipality | undefined = MUNICIPALITIES.find(m => m.id === municipioParam);
  
  // Estado para los datos del testigo (persistirá después del envío)
  const [formData, setFormData] = useState({
    name: '',
    id: '',
    phone: '',
    votingPlace: '',
    tableNumber: ''
  });

  // Estado para candidatos (se cargarán desde Firestore)
  const [candidates, setCandidates] = useState<any[]>([]);
  const [votes, setVotes] = useState<{ [key: string]: number }>({});
  const [blankVotes, setBlankVotes] = useState(0);
  const [candidatesLoaded, setCandidatesLoaded] = useState(false);

  // Estado para irregularidades
  const [hasIrregularity, setHasIrregularity] = useState(false);
  const [irregularityType, setIrregularityType] = useState('');
  const [observation, setObservation] = useState('');

  // Estado para el envío
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Cargar candidatos desde Firestore al montar el componente
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const candidatesQuery = query(collection(db, 'candidates'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(candidatesQuery);
        const candidatesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setCandidates(candidatesData);
        
        // Inicializar votos con candidatos reales
        const initialVotes: { [key: string]: number } = {};
        candidatesData.forEach((cand: any) => {
          initialVotes[cand.id] = 0;
        });
        setVotes(initialVotes);
        setCandidatesLoaded(true);
      } catch (error) {
        console.error('Error cargando candidatos:', error);
        // Fallback: candidatos vacíos pero marca como cargado
        setCandidates([]);
        setVotes({});
        setCandidatesLoaded(true);
      }
    };
    fetchCandidates();
  }, []);

  // Manejar cambios en los inputs principales
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manejar cambios en los votos
  const handleVoteChange = (candidateId: string, value: string) => {
    const numValue = value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0);
    if (candidateId === 'blank') {
      setBlankVotes(numValue);
    } else {
      setVotes(prev => ({
        ...prev,
        [candidateId]: numValue
      }));
    }
  };

  // Calcular total de votos
  const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0) + blankVotes;

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación: debe haber al menos un candidato
    if (candidates.length === 0) {
      setSubmitError('⚠️ No hay candidatos registrados. Por favor, agregue candidatos desde el Dashboard primero.');
      return;
    }
    
    // Validación básica
    if (totalVotes === 0) {
      setSubmitError('⚠️ Debe ingresar al menos un voto para enviar el reporte.');
      return;
    }
    
    // Validar campos obligatorios
    if (!formData.name || !formData.id || !formData.phone || !formData.votingPlace || !formData.tableNumber) {
      setSubmitError('⚠️ Por favor complete todos los campos obligatorios.');
      return;
    }

    // Validar irregularidad
    if (hasIrregularity && !irregularityType) {
      setSubmitError('⚠️ Seleccione el tipo de irregularidad.');
      return;
    }

    if (hasIrregularity && !observation.trim()) {
      setSubmitError('⚠️ Describa la irregularidad observada.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Preparar datos para Firestore
      const reportData = {
        ...formData,
        votes: {
          ...votes,
          blank: blankVotes
        },
        totalVotes,
        hasIrregularity,
        irregularityType: hasIrregularity ? irregularityType : '',
        observation: hasIrregularity ? observation.trim() : '',
        municipio: municipioData?.name || municipioParam,
        municipioId: municipioParam,
        timestamp: serverTimestamp(),
        status: 'pending'
      };

      // Enviar a Firestore
      const docRef = await addDoc(collection(db, 'reports'), reportData);
      
      console.log('Reporte enviado con ID:', docRef.id);
      setSubmitSuccess(true);
      
      // Limpiar formulario después de 2 segundos, PERO MANTENER DATOS DEL TESTIGO
      setTimeout(() => {
        // Mantener nombre, cédula y teléfono del testigo
        const { name, id, phone } = formData;
        
        // Resetear SOLO los datos de la mesa y votos
        setFormData({
          name,
          id,
          phone,
          votingPlace: '',
          tableNumber: ''
        });
        
        // Resetear votos a cero para todos los candidatos
        const resetVotes: { [key: string]: number } = {};
        candidates.forEach(cand => {
          resetVotes[cand.id] = 0;
        });
        setVotes(resetVotes);
        setBlankVotes(0);
        
        // Resetear irregularidades
        setHasIrregularity(false);
        setIrregularityType('');
        setObservation('');
        
        setSubmitSuccess(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error al enviar reporte:', error);
      setSubmitError('❌ Error al enviar el reporte. Verifique su conexión a internet e intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Si el municipio no existe, mostrar mensaje de error
  if (!municipioData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="text-2xl text-red-600 mb-4">⚠️ Municipio no válido</div>
          <p className="text-gray-600 mb-4">La URL del municipio no es correcta.</p>
          <a 
            href="/manizales" 
            className="text-blue-600 hover:underline font-medium"
          >
            Volver a Manizales
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header del formulario */}
      <div className="text-center mb-8">
        <div className="inline-block bg-blue-100 text-blue-700 rounded-full px-4 py-1 mb-3">
          <svg className="w-6 h-6 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Reporte Electoral
        </div>
        <h1 className="text-3xl font-bold text-gray-800">Reporte de Testigo</h1>
        <p className="text-gray-600 mt-2">
          Municipio: <span className="font-semibold text-blue-600">{municipioData.name}</span>
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Mesas totales: {municipioData.tables.toLocaleString('es-CO')}
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-6">
        {/* Mensajes de estado */}
        {submitError && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg">
            {submitError}
          </div>
        )}
        
        {submitSuccess && (
          <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-r-lg flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>✅ ¡Reporte enviado exitosamente a Firebase!</span>
          </div>
        )}

        {/* Sección 1: Información del Testigo (DATOS QUE PERSISTEN) */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Información del Testigo
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Juan Carlos Pérez López"
              />
            </div>
            
            <div>
              <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-1">
                Número de Cédula <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="id"
                name="id"
                value={formData.id}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: 1025874563"
              />
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono de Contacto <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: 3104567890"
              />
              <p className="text-xs text-gray-500 mt-1">
                <strong>💡 Este dato se mantendrá para tus próximos reportes</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Sección 2: Ubicación de la Mesa (SE RESETEA) */}
        <div className="pt-4 border-t border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Ubicación de la Mesa
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="votingPlace" className="block text-sm font-medium text-gray-700 mb-1">
                Puesto de Votación <span className="text-red-500">*</span>
              </label>
              <select
                id="votingPlace"
                name="votingPlace"
                value={formData.votingPlace}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
              >
                <option value="">Seleccione un puesto</option>
                {municipioData.votingPlaces.map((place) => (
                  <option key={place} value={place}>{place}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Puestos disponibles en {municipioData.name}
              </p>
            </div>
            
            <div>
              <label htmlFor="tableNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Número de Mesa <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="tableNumber"
                name="tableNumber"
                value={formData.tableNumber}
                onChange={handleChange}
                required
                min="1"
                max={municipioData.tables}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Ej: 1 - ${municipioData.tables}`}
              />
              <p className="text-xs text-gray-500 mt-1">
                Rango: 1 - {municipioData.tables.toLocaleString('es-CO')}
              </p>
            </div>
          </div>
        </div>

        {/* Sección 3: Resultados de la Mesa (SE RESETEA) */}
        <div className="pt-4 border-t border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Resultados de la Mesa
          </h2>
          
          {/* Mensaje si no hay candidatos */}
          {!candidatesLoaded ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando candidatos...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg mb-6">
              <div className="flex">
                <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-yellow-700 font-medium">
                    ⚠️ No hay candidatos registrados
                  </p>
                  <p className="text-yellow-600 mt-1">
                    El equipo de campaña debe agregar candidatos desde el Dashboard antes de poder reportar votos.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {candidates.map((candidate) => (
                  <div key={candidate.id} className="text-center">
                    <div className="font-medium text-sm mb-1 truncate" title={candidate.name}>
                      {candidate.name.split(' ')[0]}
                    </div>
                    <div className="text-xs text-gray-500 mb-1">{candidate.party}</div>
                    <input
                      type="number"
                      value={votes[candidate.id] || 0}
                      onChange={(e) => handleVoteChange(candidate.id, e.target.value)}
                      min="0"
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-bold"
                      placeholder="0"
                    />
                  </div>
                ))}
                
                <div className="text-center">
                  <div className="font-medium text-sm mb-1">Votos en Blanco</div>
                  <input
                    type="number"
                    value={blankVotes}
                    onChange={(e) => handleVoteChange('blank', e.target.value)}
                    min="0"
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-bold text-gray-500"
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-700">Total de Votos:</span>
                  <span className="text-2xl font-bold text-blue-600">{totalVotes.toLocaleString('es-CO')}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sección 4: Irregularidades (SE RESETEA) */}
        <div className="pt-4 border-t border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Observaciones e Irregularidades
          </h2>
          
          <div className="flex items-start">
            <input
              type="checkbox"
              id="irregularity"
              checked={hasIrregularity}
              onChange={(e) => {
                setHasIrregularity(e.target.checked);
                if (!e.target.checked) {
                  setIrregularityType('');
                  setObservation('');
                }
              }}
              className="mt-1 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="irregularity" className="ml-2 block text-sm font-medium text-gray-700">
              ¿Reportar irregularidad en esta mesa?
            </label>
          </div>
          
          {hasIrregularity && (
            <div className="mt-4 space-y-4 bg-red-50 p-4 rounded-lg border border-red-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Irregularidad <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {IRREGULARITY_TYPES.map((type) => (
                    <label 
                      key={type.id}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                        irregularityType === type.id
                          ? 'border-red-500 bg-red-100'
                          : 'border-gray-300 hover:border-red-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="irregularityType"
                        value={type.id}
                        checked={irregularityType === type.id}
                        onChange={(e) => setIrregularityType(e.target.value)}
                        className="hidden"
                      />
                      <span className="text-sm font-medium text-gray-800">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label htmlFor="observation" className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción de la Irregularidad <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="observation"
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Describa detalladamente lo observado..."
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">
                  Sea específico: ¿qué ocurrió?, ¿quiénes estaban involucrados?, ¿a qué hora sucedió?
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Botón de envío */}
        <div className="pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSubmitting || totalVotes === 0 || candidates.length === 0 || !candidatesLoaded}
            className={`w-full font-bold py-3.5 px-6 rounded-xl text-lg shadow-md transition-all transform focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isSubmitting
                ? 'bg-blue-400 cursor-wait'
                : totalVotes === 0 || candidates.length === 0 || !candidatesLoaded
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-lg hover:-translate-y-0.5 focus:ring-green-500'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enviando reporte...
              </span>
            ) : candidates.length === 0 ? (
              'Esperando candidatos del Dashboard'
            ) : totalVotes === 0 ? (
              'Ingrese votos para enviar'
            ) : (
              <>
                <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                {hasIrregularity ? 'Enviar Reporte con Alerta' : 'Enviar Reporte a Firebase'}
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            * Campos obligatorios. Total mínimo: 1 voto. Los datos se envían directamente a Firebase.
          </p>
          <p className="text-xs text-blue-600 mt-2 text-center font-medium">
            💡 Tu nombre, cédula y teléfono se mantendrán para tus próximos reportes
          </p>
        </div>
      </form>

      {/* Instrucciones */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-800">
            <strong>Importante:</strong> Esta es la URL oficial para testigos de {municipioData.name}. 
            Comparta este enlace solo con testigos acreditados de este municipio.
          </p>
        </div>
      </div>
    </div>
  );
}
