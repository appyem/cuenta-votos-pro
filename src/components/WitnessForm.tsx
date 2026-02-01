import React, { useState, useEffect, useRef } from 'react';
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
  const [candidatesLoaded, setCandidatesLoaded] = useState(false);

  // Estado para irregularidades
  const [hasIrregularity, setHasIrregularity] = useState(false);
  const [irregularityType, setIrregularityType] = useState('');
  const [observation, setObservation] = useState('');
  
  // Estado para imágenes de irregularidades (OPCIONAL - máximo 3)
  const [irregularityImages, setIrregularityImages] = useState<string[]>([]);
  const [irregularityPreviews, setIrregularityPreviews] = useState<string[]>([]);
  const [isUploadingIrregularity, setIsUploadingIrregularity] = useState(false);

  // Estado para foto del E-14 (OBLIGATORIO)
  const [e14Image, setE14Image] = useState<string | null>(null);
  const [e14Preview, setE14Preview] = useState<string | null>(null);
  const [isUploadingE14, setIsUploadingE14] = useState(false);
  const e14FileInputRef = useRef<HTMLInputElement>(null);

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
    setVotes(prev => ({
      ...prev,
      [candidateId]: numValue
    }));
  };

  // Calcular total de votos
  const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);

  // Manejar carga de foto del E-14 (OBLIGATORIO)
  const handleE14Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('⚠️ Por favor selecciona una imagen válida (JPG, PNG, GIF)');
      return;
    }

    // Validar tamaño (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('⚠️ La imagen es demasiado grande. Máximo 2MB permitido.');
      return;
    }

    setIsUploadingE14(true);
    
    try {
      const base64String = await readFileAsBase64(file);
      setE14Image(base64String);
      setE14Preview(URL.createObjectURL(file));
    } catch (error) {
      console.error('Error al procesar la imagen del E-14:', error);
      alert('❌ Error al cargar la foto del E-14. Intente con otra imagen.');
    } finally {
      setIsUploadingE14(false);
    }
  };

  // Manejar carga de imágenes de irregularidades (OPCIONAL - máximo 3)
  const handleIrregularityImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('⚠️ Por favor selecciona una imagen válida (JPG, PNG, GIF)');
      return;
    }

    // Validar tamaño (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('⚠️ La imagen es demasiado grande. Máximo 2MB permitido.');
      return;
    }

    // Validar máximo 3 imágenes
    if (irregularityImages.length >= 3) {
      alert('⚠️ Máximo 3 fotos de evidencia permitidas.');
      return;
    }

    setIsUploadingIrregularity(true);
    
    try {
      const base64String = await readFileAsBase64(file);
      setIrregularityImages(prev => [...prev, base64String]);
      setIrregularityPreviews(prev => [...prev, URL.createObjectURL(file)]);
    } catch (error) {
      console.error('Error al procesar la imagen de irregularidad:', error);
      alert('❌ Error al cargar la foto. Intente con otra imagen.');
    } finally {
      setIsUploadingIrregularity(false);
      if (e.target) e.target.value = '';
    }
  };

  // Eliminar imagen de irregularidad
  const removeIrregularityImage = (index: number) => {
    setIrregularityImages(prev => prev.filter((_, i) => i !== index));
    setIrregularityPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Limpiar foto del E-14
  const clearE14Image = () => {
    setE14Image(null);
    setE14Preview(null);
    if (e14FileInputRef.current) {
      e14FileInputRef.current.value = '';
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

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación: debe haber al menos un candidato
    if (candidates.length === 0) {
      setSubmitError('⚠️ No hay candidatos registrados. Por favor, agregue candidatos desde el Dashboard primero.');
      return;
    }
    
    // Validación: debe haber al menos un voto O irregularidad
    if (!hasIrregularity && totalVotes === 0) {
      setSubmitError('⚠️ Debe ingresar al menos un voto O marcar una irregularidad para enviar el reporte.');
      return;
    }
    
    // Validación: foto del E-14 es OBLIGATORIA
    if (!e14Image) {
      setSubmitError('❌ ¡Foto del formulario E-14 es obligatoria! Tome una foto del acta física para enviar el reporte.');
      e14FileInputRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    
    // Validar campos obligatorios del testigo
    if (!formData.name || !formData.id || !formData.phone) {
      setSubmitError('⚠️ Por favor complete los datos del testigo (nombre, cédula y teléfono).');
      return;
    }

    // Validar irregularidad (si está marcada)
    if (hasIrregularity) {
      if (!irregularityType) {
        setSubmitError('⚠️ Seleccione el tipo de irregularidad.');
        return;
      }
      if (!observation.trim()) {
        setSubmitError('⚠️ Describa la irregularidad observada.');
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Preparar datos para Firestore
      const reportData = {
        ...formData,
        votes: hasIrregularity && totalVotes === 0 ? {} : { ...votes },
        totalVotes: hasIrregularity && totalVotes === 0 ? 0 : totalVotes,
        hasIrregularity,
        irregularityType: hasIrregularity ? irregularityType : '',
        observation: hasIrregularity ? observation.trim() : '',
        irregularityImages: irregularityImages, // Array de base64 (opcional)
        e14Image: e14Image, // Base64 string (obligatorio)
        municipio: municipioData?.name || municipioParam,
        municipioId: municipioParam,
        timestamp: serverTimestamp(),
        status: hasIrregularity ? 'alert' : 'pending'
      };

      // Enviar a Firestore
      const docRef = await addDoc(collection(db, 'reports'), reportData);
      
      console.log('Reporte enviado con ID:', docRef.id);
      setSubmitSuccess(true);
      
      // Limpiar formulario después de 2 segundos, PERO MANTENER DATOS DEL TESTIGO
      setTimeout(() => {
        // Mantener nombre, cédula y teléfono del testigo
        const { name, id, phone } = formData;
        
        // Resetear SOLO los datos de la mesa, votos, imágenes e irregularidades
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
        
        // Resetear imágenes
        setE14Image(null);
        setE14Preview(null);
        setIrregularityImages([]);
        setIrregularityPreviews([]);
        
        // Resetear irregularidades
        setHasIrregularity(false);
        setIrregularityType('');
        setObservation('');
        
        setSubmitSuccess(false);
        
        // Limpiar input de E-14
        if (e14FileInputRef.current) {
          e14FileInputRef.current.value = '';
        }
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

        {/* Sección 1: Información del Testigo */}
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

        {/* Sección 2: Ubicación de la Mesa */}
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

        {/* Sección 3: Resultados de la Mesa */}
        <div className="pt-4 border-t border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Resultados de la Mesa
          </h2>
          
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {candidates.map((candidate) => (
                  <div key={candidate.id} className="text-center">
                    <div className="bg-blue-600 text-white font-bold text-xs px-2 py-1 rounded mb-1 inline-block shadow">
                      #{candidate.ballotNumber || '?'}
                    </div>
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

        {/* Sección 4: Foto del Formulario E-14 (OBLIGATORIO) */}
        <div className="pt-4 border-t border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Foto del Formulario E-14 <span className="text-red-500 ml-1">*</span>
          </h2>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-medium mb-2">
              ⚠️ <strong>¡OBLIGATORIO!</strong> Tome una foto clara del formulario físico E-14 (acta de escrutinio) al finalizar el conteo.
            </p>
            <p className="text-xs text-red-700 mb-3">
              Esta foto es requerida para validar el reporte y garantizar la transparencia del proceso electoral.
            </p>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <input
                  type="file"
                  id="e14Image"
                  ref={e14FileInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleE14Upload}
                  disabled={isUploadingE14}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-3 file:py-2 file:px-4 file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  📸 Use la cámara de su celular o seleccione desde la galería (JPG, PNG, GIF - máximo 2MB)
                </p>
              </div>
              
              {e14Preview && (
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img 
                      src={e14Preview} 
                      alt="Vista previa E-14" 
                      className="w-24 h-24 object-cover rounded-lg border-2 border-blue-200"
                    />
                    {isUploadingE14 && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={clearE14Image}
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
        </div>

        {/* Sección 5: Irregularidades (con fotos opcionales) */}
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
                  setIrregularityImages([]);
                  setIrregularityPreviews([]);
                }
              }}
              className="mt-1 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="irregularity" className="ml-2 block text-sm font-medium text-gray-700">
              ¿Reportar irregularidad en esta mesa? <span className="text-red-500">(Opcional)</span>
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
              
              {/* Fotos de evidencia (OPCIONAL) */}
              <div className="pt-3 border-t border-red-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fotos de Evidencia <span className="text-gray-500">(Opcional - máximo 3)</span>
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      id="irregularityImage"
                      accept="image/*"
                      capture="environment"
                      onChange={handleIrregularityImageUpload}
                      disabled={isUploadingIrregularity || irregularityImages.length >= 3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-3 file:py-2 file:px-4 file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      📸 Adjunte fotos como evidencia (JPG, PNG, GIF - máximo 2MB por foto)
                    </p>
                  </div>
                  
                  {irregularityPreviews.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      {irregularityPreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img 
                            src={preview} 
                            alt={`Evidencia ${index + 1}`} 
                            className="w-20 h-20 object-cover rounded border-2 border-blue-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeIrregularityImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 text-xs"
                            title="Eliminar foto"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <p className="mt-3 text-xs text-blue-600 bg-blue-50 p-2 rounded-lg border border-blue-200">
            💡 <strong>Importante:</strong> Las fotos de irregularidades son <strong>opcionales</strong>, pero la foto del formulario E-14 es <strong>obligatoria</strong> para enviar cualquier reporte.
          </p>
        </div>

        {/* Botón de envío */}
        <div className="pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSubmitting || (!hasIrregularity && totalVotes === 0 && candidates.length > 0) || !e14Image}
            className={`w-full font-bold py-3.5 px-6 rounded-xl text-lg shadow-md transition-all transform focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isSubmitting
                ? 'bg-blue-400 cursor-wait'
                : (!hasIrregularity && totalVotes === 0 && candidates.length > 0) || !e14Image
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
            ) : (!hasIrregularity && totalVotes === 0 && candidates.length > 0) || !e14Image ? (
              !e14Image ? '📸 ¡Foto del E-14 es obligatoria!' : 'Ingrese votos o marque una irregularidad'
            ) : (
              <>
                <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                {hasIrregularity 
                  ? (totalVotes > 0 
                    ? 'Enviar Reporte con Votos + Alerta' 
                    : 'Enviar Solo Alerta de Irregularidad')
                  : 'Enviar Reporte de Votos'}
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            * Campos obligatorios. Los datos se envían directamente a Firebase.
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
            <br /><br />
            <span className="font-medium text-red-600">📸 NUEVO:</span> Ahora debes <strong>tomar una foto del formulario E-14 físico</strong> al finalizar el conteo. 
            Esta foto es <strong>obligatoria</strong> para validar tu reporte. También puedes adjuntar fotos de irregularidades como evidencia (opcional).
          </p>
        </div>
      </div>
    </div>
  );
}
