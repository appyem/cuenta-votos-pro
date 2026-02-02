import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-blue-900 py-4 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center justify-center">
            <img 
              src="https://raw.githubusercontent.com/appyem/imagenesappy/refs/heads/main/logo%20actualizad%20appy.png" 
              alt="Appyempresa S.A.S" 
              className="h-10 w-auto mr-3"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden">
              <div className="text-xl font-bold text-white">Appyempresa S.A.S</div>
              <div className="text-blue-400">www.appyempresa.digital</div>
            </div>
            <div className="text-left">
              <div className="text-xl font-bold text-white">Appyempresa S.A.S</div>
              <div className="text-blue-400 text-sm">www.appyempresa.digital</div>
            </div>
          </div>
          
          <div className="flex items-center justify-center text-xs text-gray-400">
            <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>© {new Date().getFullYear()} Todos los derechos reservados • Plataforma Electoral Certificada</span>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-blue-800 text-xs text-gray-500">
          <p>Sistema desarrollado por Appyempresa S.A.S para el monitoreo electoral transparente de Caldas 2026</p>
          <p className="mt-1 text-blue-300 font-medium">Soporte Técnico: gerenteappyempresa@gmail.com • +57 310 652 44 53</p>
        </div>
      </div>
    </footer>
  );
}