import React, { useState, useEffect, useRef, useCallback } from 'react';
import { addDoc, collection, serverTimestamp, query, orderBy, getDocs, where } from 'firebase/firestore';
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
  
  // Obtener datos del municipio (¡CRÍTICO PARA LOS PUESTOS DE VOTACIÓN!)
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

  // Estado para foto del E-14 (OBLIGATORIO SOLO PARA VOTOS)
  const [e14Image, setE14Image] = useState<string | null>(null);
  const [e14Preview, setE14Preview] = useState<string | null>(null);
  const [isUploadingE14, setIsUploadingE14] = useState(false);
  const e14FileInputRef = useRef<HTMLInputElement>(null);

  // Estado para el envío
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [lastSubmissionType, setLastSubmissionType] = useState<'votes' | 'irregularity' | null>(null);

  // Estado para validación de mesa duplicada
  const [isTableAvailable, setIsTableAvailable] = useState(true);
  const [tableError, setTableError] = useState<string | null>(null);

  // Cargar candidatos desde Firestore al montar el componente (¡NO TOCADO!)
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

  // Manejar cambios en los inputs principales (¡NO TOCADO!)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manejar cambios en los votos (¡NO TOCADO!)
  const handleVoteChange = (candidateId: string, value: string) => {
    const numValue = value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0);
    setVotes(prev => ({
      ...prev,
      [candidateId]: numValue
    }));
  };

  // Calcular total de votos (¡NO TOCADO!)
  const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);

  // ==================== MANEJADOR DE CARGA DE IMAGEN E-14 CON COMPRESIÓN OBLIGATORIA ====================
  const handleE14Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('⚠️ Por favor selecciona una imagen válida (JPG, PNG, GIF)');
      return;
    }

    // Validar tamaño ORIGINAL (antes de comprimir) - permitir hasta 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('⚠️ La imagen es demasiado grande. Máximo 5MB permitido.');
      return;
    }

    setIsUploadingE14(true);
    
    try {
      // COMPRESIÓN OBLIGATORIA antes de convertir a base64
      const compressedBase64 = await compressImage(file, 800, 800, 0.7);
      
      // Validar tamaño FINAL después de compresión (debe ser < 900KB para Firestore)
      const base64SizeKB = Math.round((compressedBase64.length * 3) / 4 / 1024);
      if (base64SizeKB > 900) {
        alert(`⚠️ La imagen comprimida (${base64SizeKB}KB) sigue siendo demasiado grande para Firestore (máx 900KB). 
Intente con una foto más pequeña, mejor iluminación o formato JPG.`);
        return;
      }
      
      setE14Image(compressedBase64);
      setE14Preview(URL.createObjectURL(file));
      console.log(`✅ Imagen E-14 comprimida exitosamente: ${base64SizeKB}KB`);
    } catch (error) {
      console.error('Error crítico al procesar imagen E-14:', error);
      let errorMsg = '❌ Error al procesar la foto. Intente con otra imagen.';
      if (error instanceof Error) {
        errorMsg = `❌ ${error.message}`;
      }
      alert(errorMsg);
    } finally {
      setIsUploadingE14(false);
    }
  };

  const handleIrregularityImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('⚠️ Por favor selecciona una imagen válida (JPG, PNG, GIF)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('⚠️ La imagen es demasiado grande. Máximo 2MB permitido.');
      return;
    }

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

  const removeIrregularityImage = (index: number) => {
    setIrregularityImages(prev => prev.filter((_, i) => i !== index));
    setIrregularityPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const clearE14Image = () => {
    setE14Image(null);
    setE14Preview(null);
    if (e14FileInputRef.current) {
      e14FileInputRef.current.value = '';
    }
  };

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


   // ==================== FUNCIÓN DE COMPRESIÓN OBLIGATORIA PARA IMÁGENES ====================
  const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Error al crear canvas para compresión'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convertir a JPEG con compresión
          let compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          
          // Compresión adaptativa si sigue siendo muy grande
          while (compressedBase64.length > 900 * 1024 && quality > 0.4) {
            quality -= 0.1;
            compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          }
          
          resolve(compressedBase64);
        };
        
        img.onerror = () => reject(new Error('Error al cargar la imagen para compresión'));
      };
      
      reader.onerror = () => reject(new Error('Error al leer el archivo de imagen'));
    });
  };


   // ==================== VALIDAR MESA DUPLICADA ====================
  const checkTableAvailability = useCallback(async (puesto: string, mesa: string) => {
    if (!puesto || !mesa || !municipioParam) {
      setIsTableAvailable(true);
      setTableError(null);
      return;
    }

    try {
      // Consultar si ya existe un reporte con esta clave
      const reportsRef = collection(db, 'reports');
      const q = query(
        reportsRef,
        where('municipioId', '==', municipioParam),
        where('votingPlace', '==', puesto),
        where('tableNumber', '==', mesa)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setIsTableAvailable(false);
        setTableError('⚠️ Esta mesa ya fue reportada. Verifique el número o contacte al coordinador.');
      } else {
        setIsTableAvailable(true);
        setTableError(null);
      }
    } catch (error) {
      console.error('Error validando disponibilidad de mesa:', error);
      // En caso de error, permitir continuar pero mostrar advertencia
      setIsTableAvailable(true);
      setTableError('⚠️ No se pudo verificar la mesa. Verifique conexión a internet.');
    }
  }, [municipioParam]);

  // Validar mesa automáticamente al cambiar puesto o número
  useEffect(() => {
    if (formData.votingPlace && formData.tableNumber) {
      checkTableAvailability(formData.votingPlace, formData.tableNumber);
    } else {
      setIsTableAvailable(true);
      setTableError(null);
    }
  }, [formData.votingPlace, formData.tableNumber, checkTableAvailability]);




    // ==================== ENVIAR SOLO IRREGULARIDAD (NUEVO - SIN E-14 NI VOTOS) ====================
  const handleSubmitIrregularity = async () => {
    // Validaciones específicas para irregularidad
    if (!hasIrregularity) {
      setSubmitError('⚠️ Debe marcar la casilla de "Reportar irregularidad" para enviar este reporte.');
      return;
    }
    
    if (!irregularityType) {
      setSubmitError('⚠️ Seleccione el tipo de irregularidad.');
      return;
    }
    
    if (!observation.trim()) {
      setSubmitError('⚠️ Describa la irregularidad observada.');
      return;
    }
    
    if (!formData.name || !formData.id || !formData.phone || !formData.votingPlace || !formData.tableNumber) {
      setSubmitError('⚠️ Complete todos los datos del testigo y ubicación de la mesa (puesto y número de mesa).');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const reportData = {
        ...formData,
        reportKey: `${municipioParam}_${formData.votingPlace}_${formData.tableNumber}`, // ← ¡CAMPO ÚNICO AGREGADO!
        votes: {},
        totalVotes: 0,
        hasIrregularity: true,
        irregularityType,
        observation: observation.trim(),
        irregularityImages: irregularityImages,
        e14Image: null, // ¡NO SE REQUIERE E-14 PARA IRREGULARIDADES!
        municipio: municipioData?.name || municipioParam,
        municipioId: municipioParam,
        timestamp: serverTimestamp(),
        status: 'alert'
      };

      const docRef = await addDoc(collection(db, 'reports'), reportData);
      console.log('✅ Irregularidad enviada con ID:', docRef.id);
      
      setSubmitSuccess(true);
      setLastSubmissionType('irregularity');
      
      // Reset SOLO de irregularidad (datos del testigo persisten)
      setTimeout(() => {
        setHasIrregularity(false);
        setIrregularityType('');
        setObservation('');
        setIrregularityImages([]);
        setIrregularityPreviews([]);
        setSubmitSuccess(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error al enviar irregularidad:', error);
      setSubmitError('❌ Error al enviar la irregularidad. Verifique su conexión e intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };
// ==================== ENVIAR REPORTE DE VOTOS (NUEVO - CON E-14 OBLIGATORIO) ====================
  const handleSubmitVotes = async () => {
    // Validaciones específicas para votos
    if (totalVotes === 0) {
      setSubmitError('⚠️ Debe ingresar al menos un voto para enviar el reporte de votos.');
      return;
    }
    
    if (!e14Image) {
      setSubmitError('❌ ¡Foto del formulario E-14 es obligatoria para enviar votos! Tome una foto clara del acta física.');
      e14FileInputRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    
    if (!formData.name || !formData.id || !formData.phone || !formData.votingPlace || !formData.tableNumber) {
      setSubmitError('⚠️ Complete todos los datos del testigo y ubicación de la mesa (puesto y número de mesa).');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const reportData = {
        ...formData,
        reportKey: `${municipioParam}_${formData.votingPlace}_${formData.tableNumber}`, // ← ¡CAMPO ÚNICO AGREGADO!
        votes: { ...votes },
        totalVotes,
        hasIrregularity: false, // ¡NO INCLUYE IRREGULARIDAD EN ESTE REPORTE!
        irregularityType: '',
        observation: '',
        irregularityImages: [],
        e14Image: e14Image, // ¡OBLIGATORIO PARA VOTOS!
        municipio: municipioData?.name || municipioParam,
        municipioId: municipioParam,
        timestamp: serverTimestamp(),
        status: 'pending'
      };

      const docRef = await addDoc(collection(db, 'reports'), reportData);
      console.log('✅ Reporte de votos enviado con ID:', docRef.id);
      
      setSubmitSuccess(true);
      setLastSubmissionType('votes');
      
      // Reset de votos y E-14 (datos del testigo persisten)
      setTimeout(() => {
        const resetVotes: { [key: string]: number } = {};
        candidates.forEach(cand => {
          resetVotes[cand.id] = 0;
        });
        setVotes(resetVotes);
        setE14Image(null);
        setE14Preview(null);
        setSubmitSuccess(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error al enviar votos:', error);
      setSubmitError('❌ Error al enviar el reporte. Verifique su conexión e intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Si el municipio no existe, mostrar mensaje de error (¡NO TOCADO!)
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
      {/* Header del formulario (¡NO TOCADO!) */}
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

      {/* Formulario (¡SECCIONES DE DATOS Y VOTACIÓN NO TOCADAS!) */}
      <form className="bg-white rounded-xl shadow-md p-6 space-y-6">
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
            <span>
              {lastSubmissionType === 'votes' 
                ? '✅ ¡Reporte de votos enviado exitosamente!' 
                : '✅ ¡Reporte de irregularidad enviado exitosamente!'}
            </span>
          </div>
        )}

        {/* Sección 1: Información del Testigo (¡NO TOCADO!) */}
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

        {/* Sección 2: Ubicación de la Mesa (¡CRÍTICO - NO TOCADO!) */}
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


         {/* Mensaje de error si mesa duplicada */}
          {tableError && (
            <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
              <div className="flex">
                <svg className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm font-medium">{tableError}</p>
              </div>
            </div>
          )}

        {/* Sección 3: Resultados de la Mesa (¡NO TOCADO!) */}
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
                    disabled={!isTableAvailable}
                    className={`w-full px-2 py-2 border rounded-lg text-center font-bold ${
                      !isTableAvailable 
                        ? 'bg-gray-100 border-gray-300 cursor-not-allowed' 
                        : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    }`}
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

        {/* Sección 4: Foto del Formulario E-14 (¡NO TOCADO!) */}
        <div className="pt-4 border-t border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Foto del Formulario E-14 <span className="text-red-500 ml-1">*</span>
          </h2>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-medium mb-2">
              ⚠️ <strong>¡OBLIGATORIO SOLO PARA ENVIAR VOTOS!</strong> Tome una foto clara del formulario físico E-14 (acta de escrutinio) al finalizar el conteo.
            </p>
            <p className="text-xs text-red-700 mb-3">
              Esta foto es requerida para validar el reporte de votos y garantizar la transparencia del proceso electoral.
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
                  📸 Use la cámara de su celular (JPG, PNG, GIF - máximo 5MB original, se comprimirá automáticamente a menos de 900KB)
                </p>
              
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
        </div>

        {/* Sección 5: Irregularidades (¡NO TOCADO!) */}
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
              ¿Reportar irregularidad en esta mesa? <span className="text-gray-500">(Opcional)</span>
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
            💡 <strong>Importante:</strong> La foto del E-14 es <strong>obligatoria SOLO para enviar votos</strong>. Para reportar irregularidades <strong>NO es necesaria</strong>.
          </p>
        </div>

        {/* DOS BOTONES SEPARADOS (¡NUEVO Y CORREGIDO!) */}
        <div className="pt-4 border-t border-gray-200 space-y-3">
          {/* Botón 1: Enviar SOLO Irregularidad (NO requiere E-14 ni votos) */}
          <button
            type="button"
            onClick={handleSubmitIrregularity}
            disabled={isSubmitting || !isTableAvailable || !hasIrregularity || !irregularityType || !observation.trim() || !formData.name || !formData.id || !formData.phone || !formData.votingPlace || !formData.tableNumber}
            className={`w-full font-bold py-3 px-6 rounded-xl text-lg shadow-md transition-all transform focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isSubmitting && lastSubmissionType === 'irregularity'
                ? 'bg-red-400 cursor-wait'
                : (!hasIrregularity || !irregularityType || !observation.trim() || !formData.name || !formData.id || !formData.phone || !formData.votingPlace || !formData.tableNumber)
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white hover:shadow-lg hover:-translate-y-0.5 focus:ring-red-500'
            }`}
          >
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                {isSubmitting && lastSubmissionType === 'irregularity' 
                  ? 'Enviando...' 
                  : '🚨 Enviar SOLO Irregularidad (Sin votos)'}
              </span>
            </div>
          </button>
          
          {/* Botón 2: Enviar Reporte de Votos (REQUIERE E-14) */}
          <button
            type="button"
            onClick={handleSubmitVotes}
            disabled={isSubmitting || !isTableAvailable || totalVotes === 0 || !e14Image || !formData.name || !formData.id || !formData.phone || !formData.votingPlace || !formData.tableNumber}            className={`w-full font-bold py-3 px-6 rounded-xl text-lg shadow-md transition-all transform focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isSubmitting && lastSubmissionType === 'votes'
                ? 'bg-green-400 cursor-wait'
                : (totalVotes === 0 || !e14Image || !formData.name || !formData.id || !formData.phone || !formData.votingPlace || !formData.tableNumber)
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-lg hover:-translate-y-0.5 focus:ring-green-500'
            }`}
          >
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>
                {isSubmitting && lastSubmissionType === 'votes' 
                  ? 'Enviando...' 
                  : '🗳️ Enviar Reporte de Votos (Requiere foto E-14)'}
              </span>
            </div>
          </button>
          
          <p className="text-xs text-gray-500 mt-2 text-center">
            * Los datos del testigo (nombre, cédula, teléfono) se mantendrán para tus próximos reportes
          </p>
        </div>
      </form>

      {/* Instrucciones (¡NO TOCADO!) */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-800">
            <strong>Guía rápida:</strong>
            <br />• Para <span className="font-bold text-red-600">reportar una irregularidad SIN votos</span>: use el botón rojo "Enviar SOLO Irregularidad" (NO necesita foto del E-14).
            <br />• Para <span className="font-bold text-green-600">enviar votos</span>: use el botón verde "Enviar Reporte de Votos" (¡requiere foto del E-14!).
            <br />• Puede enviar <span className="font-bold">ambos reportes por separado</span> si hay votos Y una irregularidad en la misma mesa.
          </p>
        </div>
      </div>
    </div>
  );
}
