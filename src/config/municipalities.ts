// Datos de municipios de Caldas con sus puestos de votación
export interface Municipality {
  id: string;
  name: string;
  tables: number;
  votingPlaces: string[];
}

export const MUNICIPALITIES: Municipality[] = [
  { 
    id: 'manizales', 
    name: 'Manizales', 
    tables: 902,
    votingPlaces: [
      "Las Américas", "Coliseo Mayor", "Gobernación de Caldas", 
      "Universidad de Caldas", "Liceo Departamental", "Escuela Normal", 
      "Centro de Convenciones", "Institución Educativa Boston", 
      "Coliseo Menor", "Escuela Antonio Nariño"
    ]
  },
  { 
    id: 'la-dorada', 
    name: 'La Dorada', 
    tables: 160,
    votingPlaces: [
      "Coliseo Municipal", "Institución Educativa Técnica", 
      "Centro de Convenciones", "Escuela Rural La Dorada", 
      "Coliseo Cubierto", "Casa de la Cultura"
    ]
  },
  { 
    id: 'chinchina', 
    name: 'Chinchiná', 
    tables: 107,
    votingPlaces: [
      "Escuela Normal", "Coliseo Cubierto", "Casa de la Cultura", 
      "Institución Educativa Técnica", "Centro Comunitario"
    ]
  },
  { 
    id: 'riosucio', 
    name: 'Riosucio', 
    tables: 104,
    votingPlaces: [
      "Institución Educativa San José", "Coliseo Municipal", 
      "Casa de la Juventud", "Escuela Rural Riosucio", 
      "Centro Cultural"
    ]
  },
  { 
    id: 'villamaria', 
    name: 'Villamaría', 
    tables: 100,
    votingPlaces: [
      "Coliseo Cubierto", "Escuela Rural", "Centro Comunitario", 
      "Institución Educativa Villamaría", "Casa de la Cultura"
    ]
  },
  { 
    id: 'aguadas', 
    name: 'Aguadas', 
    tables: 60,
    votingPlaces: [
      "Coliseo Municipal", "Escuela Normal", "Casa de la Cultura"
    ]
  },
  { 
    id: 'anserma', 
    name: 'Anserma', 
    tables: 87,
    votingPlaces: [
      "Institución Educativa Anserma", "Coliseo Municipal", 
      "Centro Comunitario"
    ]
  },
  { 
    id: 'aranzazu', 
    name: 'Aranzazu', 
    tables: 37,
    votingPlaces: [
      "Escuela Rural Aranzazu", "Coliseo Municipal"
    ]
  },
  { 
    id: 'belalcazar', 
    name: 'Belalcázar', 
    tables: 32,
    votingPlaces: [
      "Institución Educativa Belalcázar", "Coliseo Municipal"
    ]
  },
  { 
    id: 'filadelfia', 
    name: 'Filadelfia', 
    tables: 30,
    votingPlaces: [
      "Escuela Rural Filadelfia", "Coliseo Municipal"
    ]
  },
  { 
    id: 'la-merced', 
    name: 'La Merced', 
    tables: 19,
    votingPlaces: [
      "Institución Educativa La Merced", "Coliseo Municipal"
    ]
  },
  { 
    id: 'manzanares', 
    name: 'Manzanares', 
    tables: 49,
    votingPlaces: [
      "Escuela Rural Manzanares", "Coliseo Municipal"
    ]
  },
  { 
    id: 'marmato', 
    name: 'Marmato', 
    tables: 21,
    votingPlaces: [
      "Institución Educativa Marmato", "Coliseo Municipal"
    ]
  },
  { 
    id: 'marquetalia', 
    name: 'Marquetalia', 
    tables: 35,
    votingPlaces: [
      "Escuela Rural Marquetalia", "Coliseo Municipal"
    ]
  },
  { 
    id: 'marulanda', 
    name: 'Marulanda', 
    tables: 10,
    votingPlaces: [
      "Institución Educativa Marulanda"
    ]
  },
  { 
    id: 'neira', 
    name: 'Neira', 
    tables: 55,
    votingPlaces: [
      "Coliseo Municipal", "Escuela Normal", "Casa de la Cultura"
    ]
  },
  { 
    id: 'norcasia', 
    name: 'Norcasia', 
    tables: 17,
    votingPlaces: [
      "Institución Educativa Norcasia", "Coliseo Municipal"
    ]
  },
  { 
    id: 'pacora', 
    name: 'Pácora', 
    tables: 38,
    votingPlaces: [
      "Escuela Rural Pácora", "Coliseo Municipal"
    ]
  },
  { 
    id: 'palestina', 
    name: 'Palestina', 
    tables: 46,
    votingPlaces: [
      "Institución Educativa Palestina", "Coliseo Municipal"
    ]
  },
  { 
    id: 'pensilvania', 
    name: 'Pensilvania', 
    tables: 54,
    votingPlaces: [
      "Escuela Rural Pensilvania", "Coliseo Municipal", "Casa de la Cultura"
    ]
  },
  { 
    id: 'risaralda', 
    name: 'Risaralda', 
    tables: 33,
    votingPlaces: [
      "Institución Educativa Risaralda", "Coliseo Municipal"
    ]
  },
  { 
    id: 'salamina', 
    name: 'Salamina', 
    tables: 47,
    votingPlaces: [
      "Escuela Rural Salamina", "Coliseo Municipal", "Casa de la Cultura"
    ]
  },
  { 
    id: 'samana', 
    name: 'Samaná', 
    tables: 51,
    votingPlaces: [
      "Institución Educativa Samaná", "Coliseo Municipal"
    ]
  },
  { 
    id: 'san-jose', 
    name: 'San José', 
    tables: 15,
    votingPlaces: [
      "Escuela Rural San José", "Coliseo Municipal"
    ]
  },
  { 
    id: 'supia', 
    name: 'Supía', 
    tables: 61,
    votingPlaces: [
      "Institución Educativa Supía", "Coliseo Municipal", "Casa de la Cultura"
    ]
  },
  { 
    id: 'la-victoria', 
    name: 'La Victoria', 
    tables: 27,
    votingPlaces: [
      "Escuela Rural La Victoria", "Coliseo Municipal"
    ]
  },
  { 
    id: 'viterbo', 
    name: 'Viterbo', 
    tables: 40,
    votingPlaces: [
      "Institución Educativa Viterbo", "Coliseo Municipal"
    ]
  }
];

// Obtener municipio por ID
export const getMunicipalityById = (id: string): Municipality | undefined => {
  return MUNICIPALITIES.find(m => m.id === id);
};

// Obtener todos los IDs de municipios
export const getMunicipalityIds = (): string[] => {
  return MUNICIPALITIES.map(m => m.id);
};