// Datos de municipios de Caldas con sus puestos de votación oficiales
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
      "I.E LA LINDA",
      "I.E CHIPRE",
      "I.E CHIPRE SEDE B",
      "I.E ADOLFO HOYOS ARANGO",
      "COLEGIO FILIPENSE",
      "I.E MARCO FIDEL SUAREZ ANT. CASD",
      "NUEVO CISCO SAN JOSE",
      "CEN. DE DESARROLLO INFANTIL JOSE MARIA",
      "INSTITUTO MANIZALES",
      "ANTIGUO CISCO SAN JOSE",
      "ANTIGUO TERMINAL DE TRANSPORTE PEOPLE CONTACT",
      "EDIFICIO INDUSTRIA LICORERA DE CALDAS",
      "FACULTAD DE BELLAS ARTES UNIVERSIDAD DE CALDAS",
      "I.E GRAN COLOMBIA",
      "LICEO ARQUIDIOCESANO NUESTRA SEÑORA",
      "I.E ISABEL LA CATOLICA",
      "INSTITUTO UNIVERSITARIO DE CALDAS",
      "INSTITUTO TECNOLOGICO FRANCISCO JOSE DE CALDAS",
      "LICEO ARQUIDIOCESANO NUESTRA SEÑORA FEMENINO",
      "I.E LA ASUNCION SEDE A",
      "INSTITUTO SAN JORGE",
      "FACULTAD CIENCIAS SALUD UNI CALDAS",
      "I.E NORMAL SUPERIOR DE CALDAS",
      "UNIVERSIDAD AUTONOMA",
      "I.E FE Y ALEGRIA LA PZ SEDE PRINCIPAL",
      "I.E BOSQUES DEL NORTE",
      "I.E SAN SEBASTIAN",
      "CISCO BOSQUES DEL NORTE",
      "I.E FE Y ALEGRIA SEDE B",
      "ESC. NACIONAL DE ENFERMERIA SEDE A",
      "I.E LA SULTANA SEDE PRINCIPAL",
      "LICEO INTEGRADO MANIZALES",
      "I.E MARISCAL SUCRE SEDE B",
      "INSTITUTO COLEGIO DE CRISTO",
      "I.E LA SULTANA SEDE A",
      "I.E MARISCAL SUCRE SEDE C KENNEDY",
      "COLEGIO SANTA INES",
      "I.E SAN PIO X",
      "I.E SAN PIO X SEDE B",
      "I.E SAN PIO X SEDE A",
      "I.E MALTERIA",
      "I.E SAN PIO X SEDE C LA CAPILLA",
      "UNIVERSIDAD CATOLICA MANIZALES",
      "FACULTAD CIENCIAS JURIDICAS U. DE CALDAS",
      "INST NACIONAL AUX DE ENFERMERIA SEDE PRINCIPAL",
      "I.E INSTITUTO NORMAL SUPERIOR DE MANIZALES",
      "SEM MENOR NUESTRA SEÑORA DEL ROSARIO",
      "UNI NACIONAL SEDE ARQUITECTURA",
      "CENTRO COMERCIAL SANCANCIO",
      "COLISEO MENOR RAMON MARIN",
      "I.E ATANACIO GIRARDOT",
      "I.E EUGENIO PACELLI SEDE PRINCIPAL",
      "I.E MALABAR SEDE A",
      "I.E ARANJUEZ SEDE A",
      "I.E MALABAR SEDE B",
      "U DE CALDAS SEDE BICENTENARIO MICAELA",
      "I.E ANDRES BELLO",
      "I.E PERPETUO SOCORRO",
      "I.E LEONARDO DAVINCI SEDE A",
      "I.E LEONARDO DAVINCI",
      "I.E LATINOAMERICANO SEDE B",
      "COL MAYOR NUESTRA SEÑORA",
      "I.E LEON DE GREIFF",
      "I.E SIETE DE AGOSTO",
      "I.E EDUCATIVA ESTAMBUL",
      "I.E PABLO VI BARRIOS UNIDOS",
      "CISCO EL CARMEN",
      "I.E SINAI SEDE B",
      "I.E LA ASUNCION SEDE B",
      "I.E LICEO MIXTO SINAI SEDE",
      "C DE DESARROLLO INFANTIL VILLAHERMOSA",
      "CENTRO COMERCIAL MALL PLAZA",
      "UNIVERSIDAD DE CALDAS",
      "CARCEL NACIONAL DE VARONES",
      "RECLUSION MUJERES VILLA JOSEFINA",
      "ESCUELA DE TRABAJO LA LINDA LOS ZAGALES",
      "COLOMBIA",
      "LA CRISTALINA",
      "EL REMANZO",
      "I.E SAN PEREGRINO",
      "AGROTURISTICO EL TABLAZO",
      "EL MANANTIAL",
      "RIO BLANCO",
      "I.E MIGUEL ANTONIO CARO BACHILLERATO",
      "EL DESQUITE",
      "LA VIOLETA",
      "ALTO CORINTO",
      "LA TRINIDAD",
      "ESC RURAL LA AURORA",
      "ESC RURAL EL ARENILLO",
      "I.E RURAL GRANADA SEDE PRINCIPAL"
    ]
  },
  { 
    id: 'la-dorada', 
    name: 'La Dorada', 
    tables: 160,
    votingPlaces: [
      "SEDE ANTONIO JOSE SUCRE",
      "ESCUELA SAN VICENTE",
      "I.E LA DORADA",
      "I.E NUESTRA SEÑORA DEL CARMEN",
      "ESCUELA ANTONIO NARIÑO",
      "ESCUELA LAURELES",
      "ESCUELA POLICARPA SALAVARRIETA",
      "I.E ALFONSO LOPEZ",
      "ESC JUAN PABLO SEGUNDO",
      "I.E MARCO FIDEL SUAREZ",
      "ESC RENAN BARCO",
      "PENITENCIARIA DOÑA JUANA",
      "BUENA VISTA LA HABANA",
      "EL PURNIO",
      "EL JAPON",
      "GUARINOSITO",
      "LA ATARRAYA"
    ]
  },
  { 
    id: 'chinchina', 
    name: 'Chinchiná', 
    tables: 107,
    votingPlaces: [
      "I.E SAN FRANCISCO DE PAULA",
      "COL BRTOLOME MITRE",
      "BIBLIOTECA PUBLICA MUNICIPAL",
      "SANTA JUANA DE ARCO",
      "JARDIN INFANTIL CHINCHINA",
      "I.E SANTO DOMINGO SAVIO",
      "ESCUELA KENNEDY",
      "COLISEO MUNICIPAL",
      "ESCUELA JUAN XXIII",
      "BAJO ESPAÑOL",
      "EL TREBOL",
      "LA FLORESTA"
    ]
  },
  { 
    id: 'riosucio', 
    name: 'Riosucio', 
    tables: 104,
    votingPlaces: [
      "CONC ESCOL SANTANDER",
      "CONC ESCOL ANTONIO NARIÑO",
      "I.E NORMAL SUPERIOR SAGRADO CORAZON",
      "I.E FUNDADORES",
      "COLISEO DE DEPORTES",
      "CARCEL DEL CIRCUITO",
      "BONAFONT",
      "PUEBLO VIEJO",
      "EL ORO",
      "EL SALADO",
      "FLORENCIA",
      "LOS CHANCOS",
      "QUIEBRALOMO",
      "SAN LORENZO",
      "SAN JERONIMO",
      "LA IBERIA",
      "LLANOGRANDE",
      "LAS ESTANCIAS",
      "MEJIAL",
      "SIPIRRA"
    ]
  },
  { 
    id: 'villamaria', 
    name: 'Villamaría', 
    tables: 100,
    votingPlaces: [
      "I.E JAIME DUQUE GRISALES",
      "I.E SANTA LUISA",
      "COL VILLA DEL ROSARIO",
      "TURIN CRC",
      "COL SAN PEDRO CLAVER",
      "I.E GERARDO ARIAS RAMIREZ",
      "COLISEO JAIME DUQUE GRISALES",
      "ESC RAFAEL POMBO",
      "CDI CHIQUITINES",
      "CDI FLORECER",
      "I.E NUESTRA SEÑORA DEL ROSARIO",
      "EL PINDO ESCUELA ANTONIO NARIÑO",
      "I.E COLOMBIA LA GUAYANA",
      "LLANITOS",
      "NUEVO RIO CLARO",
      "MIRAFLORES",
      "VRDA LOS CUERVOS CASTA COMUNAL ALTO DE LA CRUZ",
      "NUEVA PRIMAVERA",
      "GALLINAZO",
      "LAGUNA NEGRA"
    ]
  },
  { 
    id: 'aguadas', 
    name: 'Aguadas', 
    tables: 60,
    votingPlaces: [
      "Coliseo Cubierto Cambumbia",
      "LICEO CLAUDINA MUNERA",
      "ARMA",
      "ENCIMADAS",
      "VIVORAL",
      "LA MERMITA",
      "ALTO LA MONTAÑA",
      "BOCAS",
      "RIO ARRIBA EL EDEN"
    ]
  },
  { 
    id: 'anserma', 
    name: 'Anserma', 
    tables: 87,
    votingPlaces: [
      "BIBLIOTECA MUNICIPAL",
      "ANTIGUA SEDE UNIVALLE",
      "CENTRO VIDA",
      "ESCUELA URBANA ANTONIO JOSE SUCRE",
      "ESCUELA SAN JOSE",
      "ESCUELA SIMON BOLIVAR",
      "CIC",
      "ESCUELA NORMAL SUPERIOR DE ANSERMA",
      "CARCEL",
      "VEREDA CHAPATA",
      "MARAPRA",
      "LA RICA",
      "EL GUAMITO",
      "LAS MARGARITAS",
      "LA INDIA",
      "PALO BLANCO",
      "LA FLORESTA",
      "LA NUBIA",
      "CONCHARI",
      "BELLA VISTA",
      "SAN PEDRO"
    ]
  },
  { 
    id: 'aranzazu', 
    name: 'Aranzazu', 
    tables: 37,
    votingPlaces: [
      "COLEGIO PIO XI",
      "NORMAL SUPERIOR SAGRADO CORAZON",
      "ALEGRIAS",
      "LAS CAMELIAS",
      "BUENOS AIRES LA HONDITA",
      "VARSOVIA",
      "EL ROBLAL"
    ]
  },
  { 
    id: 'belalcazar', 
    name: 'Belalcázar', 
    tables: 32,
    votingPlaces: [
      "PUESTO CABECERA MUNICIPAL",
      "EL MADROÑO",
      "EL AGUILA",
      "LA CASCADA",
      "QUIEBRA DE LA HABANA",
      "SAN ISIDRO",
      "EL CRUCERO"
    ]
  },
  { 
    id: 'filadelfia', 
    name: 'Filadelfia', 
    tables: 30,
    votingPlaces: [
      "CABECERA MUNICIPAL",
      "EL PINTADO",
      "EL VERSO",
      "LA SOLEDAD",
      "LA PALMA",
      "MORRITOS",
      "SAMARIA",
      "SAN LUIS"
    ]
  },
  { 
    id: 'la-merced', 
    name: 'La Merced', 
    tables: 19,
    votingPlaces: [
      "PUESTO CABECERA MUNICIPAL",
      "EL LIMON",
      "EL TAMBOR",
      "LA FELICIA",
      "MACEGAL",
      "PEÑA RICA",
      "SAN JOSE"
    ]
  },
  { 
    id: 'manzanares', 
    name: 'Manzanares', 
    tables: 49,
    votingPlaces: [
      "INST EDUC MANZANARES SD SAN LUIS GONZAGA",
      "AGUA BONITA",
      "LLANADAS",
      "LA CEIBA",
      "LAS MARGARITAS",
      "LOS PLANES",
      "SAN JUAN LA SIRIA",
      "SAN VICENTE"
    ]
  },
  { 
    id: 'marmato', 
    name: 'Marmato', 
    tables: 21,
    votingPlaces: [
      "FONDA ASOCAMAR",
      "CENTRO DE DESARROLLO RURAL CABRAS",
      "ECHANDIA",
      "CENTRO POBLADO EL LLANO",
      "CENTRO DE DESARROLLO RURAL LA MIEL",
      "SAN JUAN",
      "LA CUCHILLA"
    ]
  },
  { 
    id: 'marquetalia', 
    name: 'Marquetalia', 
    tables: 35,
    votingPlaces: [
      "PUESTO CABECERA MUNICIPAL",
      "SANTA ELENA",
      "EL PLACER",
      "VEREDA PATIO BONITO"
    ]
  },
  { 
    id: 'marulanda', 
    name: 'Marulanda', 
    tables: 10,
    votingPlaces: [
      "PUESTO CABECERA MUNICIPAL",
      "MONTEBONITO",
      "EL PARAMO",
      "EL ZANCUDO"
    ]
  },
  { 
    id: 'neira', 
    name: 'Neira', 
    tables: 55,
    votingPlaces: [
      "IE NEIRA",
      "CONCENTRACION ESCOLAR JOSE MARIA CORDOBA",
      "I.E NUESTRA SEÑORA DEL ROSARIO",
      "ESCUELA ABRAHAM MONTOYA",
      "PEBLO RICO",
      "AGUACATAL",
      "JUNTAS",
      "LLANO GRANDE",
      "EL CARDAL"
    ]
  },
  { 
    id: 'norcasia', 
    name: 'Norcasia', 
    tables: 17,
    votingPlaces: [
      "PUESTO CABECERA MUNICIPAL",
      "CENTRO DE INTEGRACION CIUDADANA CIC",
      "QUIEBRA DE ROQUE",
      "MOSCOVITA"
    ]
  },
  { 
    id: 'pacora', 
    name: 'Pácora', 
    tables: 38,
    votingPlaces: [
      "PUESTO CABECERA MUNICIPAL",
      "CARCEL",
      "CASTILLA",
      "BUENOS AIRES",
      "LAS COLES",
      "LOS MORROS",
      "SAN BARTOLOME",
      "LAS PALMAS",
      "SAN LORENZO"
    ]
  },
  { 
    id: 'palestina', 
    name: 'Palestina', 
    tables: 46,
    votingPlaces: [
      "PUESTO CABECERA MUNICIPAL",
      "ZONA URBANA ARAUCA",
      "LA PLATA",
      "SANTAGUEDA"
    ]
  },
  { 
    id: 'pensilvania', 
    name: 'Pensilvania', 
    tables: 54,
    votingPlaces: [
      "PUESTO CABECERA MUNICIPAL",
      "CARCEL ARBOLEDA",
      "AGUA BONITA",
      "LA SOLEDAD",
      "SANTA TERESA",
      "BOLIVIA",
      "HIGUERON",
      "GUACAS",
      "SAN DANIEL",
      "LA RIOJA",
      "PUEBLO NUEVO",
      "SAMARIA",
      "VEREDA LA TORRE"
    ]
  },
  { 
    id: 'risaralda', 
    name: 'Risaralda', 
    tables: 33,
    votingPlaces: [
      "PUESTO CABECERA MUNICIPAL",
      "ALTO AURACA",
      "LA BOHEMIA",
      "LA QUIEBRA DE SANTA BARBARA",
      "EL PALO"
    ]
  },
  { 
    id: 'salamina', 
    name: 'Salamina', 
    tables: 47,
    votingPlaces: [
      "PUESTO CABECERA MUNICIPAL",
      "CARCEL",
      "LA LOMA",
      "EL PERRO",
      "LA UNION",
      "PORTACHUELO",
      "I.E SAN FELIX"
    ]
  },
  { 
    id: 'samana', 
    name: 'Samaná', 
    tables: 51,
    votingPlaces: [
      "PUESTO CABECERA MUNICIPAL",
      "BERLIN",
      "CALIFORNIA",
      "EL CONGAL",
      "YARUMAL",
      "CONFINES",
      "SANTA RITA",
      "FLORENCIA",
      "ENCIMADAS",
      "LOS POMOS",
      "RANCHO LARGO",
      "SAN DIEGO",
      "LA QUINTA",
      "DULCE NOMBRE",
      "CRISTALES"
    ]
  },
  { 
    id: 'san-jose', 
    name: 'San José', 
    tables: 15,
    votingPlaces: [
      "PUESTO CABECERA MUNICIPAL",
      "LA ALBANIA",
      "PRIMAVERA"
    ]
  },
  { 
    id: 'supia', 
    name: 'Supía', 
    tables: 61,
    votingPlaces: [
      "I.E FRANCISCO JOSE DE CALDAS",
      "CENTRO CIVICO CULTURAL",
      "I.E SUPIA",
      "I.E SAN VICTOR",
      "I.E MARISCAL ROBLEDO",
      "I.E POLICARPA SALAVARRIETA",
      "HOJAS ANCHAS",
      "GUAMAL",
      "I.E LA QUINTA",
      "I.E CAÑAMOMO Y LOMA PRIETA"
    ]
  },
  { 
    id: 'la-victoria', 
    name: 'La Victoria', 
    tables: 27,
    votingPlaces: [
      "PUESTO CABECERA MUNICIPAL",
      "ISAZA",
      "EL LLANO",
      "CAÑAVERAL",
      "LA PRADERA"
    ]
  },
  { 
    id: 'viterbo', 
    name: 'Viterbo', 
    tables: 40,
    votingPlaces: [
      "PUESTO CABECERA MUNICIPAL",
      "INSTITUTO EDUCATIVO LA MILAGROSA",
      "CANAAN",
      "LA LINDA",
      "EL PORVENIR",
      "EL SOCORRO",
      "LA MARIA",
      "LA TESALIA"
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