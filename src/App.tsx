import React from 'react';
import { BrowserRouter as Router, Routes, Route, useSearchParams } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import WitnessForm from './components/WitnessForm';
import AlertsView from './components/AlertsView';
import ResultsDisplay from './components/ResultsDisplay'; // ✅ ¡NUEVO IMPORT!
import Footer from './components/Footer'; 
import MunicipalAnalysis from './components/MunicipalAnalysis'; 


function Navigation() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get('view') || 'dashboard';

  const handleNavigation = (view: string) => {
    setSearchParams({ view });
  };

  return (
    <nav className="hidden md:block bg-white shadow-md py-3">
      <div className="container mx-auto px-4 flex justify-center space-x-6">
        <button
          onClick={() => handleNavigation('dashboard')}
          className={`px-6 py-2 rounded-xl font-bold text-lg flex items-center transition-all ${
            currentView === 'dashboard'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          Dashboard
        </button>
        <button
          onClick={() => handleNavigation('alerts')}
          className={`px-6 py-2 rounded-xl font-bold text-lg flex items-center transition-all ${
            currentView === 'alerts'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Alertas
        </button>
        <button
          onClick={() => handleNavigation('witness')}
          className={`px-6 py-2 rounded-xl font-bold text-lg flex items-center transition-all ${
            currentView === 'witness'
              ? 'bg-green-600 text-white shadow-md'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Reportar Votos
        </button>
        {/* ✅ ¡NUEVO BOTÓN EN NAVEGACIÓN! */}
        <a
          href="/resultados"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-2 rounded-xl font-bold text-lg flex items-center bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-md"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2-4h10m-6 2a2 2 0 100-4H5a2 2 0 000 4h14a2 2 0 000-4h-6m-2 4h10" />
          </svg>
          Pantalla Pública
        </a>
      </div>
    </nav>
  );
}

function MobileNavigation() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentView = searchParams.get('view') || 'dashboard';

  const handleNavigation = (view: string) => {
    setSearchParams({ view });
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="flex justify-around py-3">
        <button
          onClick={() => handleNavigation('dashboard')}
          className={`flex flex-col items-center p-2 ${
            currentView === 'dashboard' ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <span className="text-xs mt-1 font-medium">Dashboard</span>
        </button>
        <button
          onClick={() => handleNavigation('alerts')}
          className={`flex flex-col items-center p-2 ${
            currentView === 'alerts' ? 'text-red-600' : 'text-gray-500'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-xs mt-1 font-medium">Alertas</span>
        </button>
        <button
          onClick={() => handleNavigation('witness')}
          className={`flex flex-col items-center p-2 ${
            currentView === 'witness' ? 'text-green-600' : 'text-gray-500'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-xs mt-1 font-medium">Reportar</span>
        </button>
        {/* ✅ ¡NUEVO BOTÓN MÓVIL! */}
        <a
          href="/resultados"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center p-2 text-purple-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2-4h10m-6 2a2 2 0 100-4H5a2 2 0 000 4h14a2 2 0 000-4h-6m-2 4h10" />
          </svg>
          <span className="text-xs mt-1 font-medium">Resultados</span>
        </a>
      </div>
    </nav>
  );
}

function AppContent() {
  const [searchParams] = useSearchParams();
  const currentView = searchParams.get('view') || 'dashboard';
  const municipio = searchParams.get('municipio');

  // Si hay parámetro de municipio, mostrar formulario directamente
  if (municipio) {
    return <WitnessForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="bg-white/20 p-2 rounded-lg mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold">VOTA CALDAS</h1>
              <p className="text-blue-100 text-sm">Seguimiento Electoral en Tiempo Real</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium">Elecciones 2026</p>
            <p className="text-sm text-blue-100">Actualizado hace 2 min</p>
          </div>
        </div>
      </header>

      <Navigation />
      <MobileNavigation />

      {/* Contenido principal */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {currentView === 'dashboard' ? (
          <Dashboard />
        ) : currentView === 'alerts' ? (
          <AlertsView />
        ) : (
          <WitnessForm />
        )}
      </main>

       {/* Footer - Appyempresa S.A.S */}
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
     <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/analisis-territorial" element={<MunicipalAnalysis />} /> {/* ← ¡NUEVA RUTA! */}
        <Route path="/resultados" element={<ResultsDisplay />} />
        <Route path="/:municipioId" element={<WitnessForm />} />
      </Routes>
    </Router>
  );
}

export default App;
