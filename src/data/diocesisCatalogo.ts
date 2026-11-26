// Catálogo Canónico y Oficial de la Diócesis de Chiclayo
// Estructura: Zonas Arciprestales territoriales + Movimientos + Pastoral Universitaria

export const ZONAS_DIOCESANAS = [
  'Centro-Este',
  'Centro-Oeste',
  'Norte',
  'Litoral',
  'Este',
  'Sierra',
  'Movimientos',
  'Pastoral Universitaria',
] as const;

export type ZonaDiocesana = typeof ZONAS_DIOCESANAS[number];

export interface ParroquiaItem {
  id: string;
  nombre: string;
  zona: ZonaDiocesana;
  localidad?: string;
}

export interface OpcionComunidad {
  id: string;
  nombre: string;
  categoria: 'Pastoral Parroquial' | 'Movimiento' | 'Pastoral Universitaria' | 'Comisión Diocesana';
  zona: ZonaDiocesana;
  parroquiaNombre?: string;
}

// 1. Directorio Oficial de Parroquias por Zona Territorial
export const PARROQUIAS_DIOCESANAS: ParroquiaItem[] = [
  // --- ZONA CENTRO-ESTE ---
  { id: 'par-catedral', nombre: 'Santa María - Catedral', zona: 'Centro-Este', localidad: 'Chiclayo' },
  { id: 'par-campodonico', nombre: 'Señor de los Milagros - Campodónico', zona: 'Centro-Este', localidad: 'Chiclayo' },
  { id: 'par-valle', nombre: 'Santa María del Valle - Fanny Abanto', zona: 'Centro-Este', localidad: 'Chiclayo' },
  { id: 'par-sagrada-familia', nombre: 'Sagrada Familia', zona: 'Centro-Este', localidad: 'Chiclayo' },
  { id: 'par-vicente-paul', nombre: 'San Vicente de Paúl', zona: 'Centro-Este', localidad: 'Chiclayo' },
  { id: 'par-santa-rosa-jlo', nombre: 'Santa Rosa de Lima - J.L.O.', zona: 'Centro-Este', localidad: 'José Leonardo Ortiz' },
  { id: 'par-inmaculada-urrunaga', nombre: 'La Inmaculada - Urrunaga', zona: 'Centro-Este', localidad: 'Urrunaga / J.L.O.' },
  { id: 'par-juan-apostol-jlo', nombre: 'San Juan Apóstol - J.L.O.', zona: 'Centro-Este', localidad: 'José Leonardo Ortiz' },
  { id: 'par-sagrado-corazon-barsallo', nombre: 'Sagrado Corazón de Jesús - Barsallo', zona: 'Centro-Este', localidad: 'Chiclayo' },

  // --- ZONA CENTRO-OESTE ---
  { id: 'par-vianney', nombre: 'San Juan María Vianney', zona: 'Centro-Oeste', localidad: 'Chiclayo' },
  { id: 'par-consolacion', nombre: 'Nuestra Señora de la Consolación', zona: 'Centro-Oeste', localidad: 'Chiclayo' },
  { id: 'par-juan-xxiii', nombre: 'San Juan XXIII', zona: 'Centro-Oeste', localidad: 'Chiclayo' },
  { id: 'par-martin-porres', nombre: 'San Martín de Porres', zona: 'Centro-Oeste', localidad: 'Chiclayo' },
  { id: 'par-jose-obrero', nombre: 'San José Obrero', zona: 'Centro-Oeste', localidad: 'Chiclayo' },
  { id: 'par-san-agustin', nombre: 'San Agustín', zona: 'Centro-Oeste', localidad: 'Chiclayo' },
  { id: 'par-maria-camino', nombre: 'Santa María del Camino', zona: 'Centro-Oeste', localidad: 'Chiclayo' },
  { id: 'par-juan-pablo-ii', nombre: 'San Juan Pablo II', zona: 'Centro-Oeste', localidad: 'Chiclayo' },

  // --- ZONA NORTE ---
  { id: 'par-pedro-lambayeque', nombre: 'San Pedro - Lambayeque', zona: 'Norte', localidad: 'Lambayeque' },
  { id: 'par-inmaculada-mochumi', nombre: 'Inmaculada Concepción - Mochumí', zona: 'Norte', localidad: 'Mochumí' },
  { id: 'par-pedro-tucume', nombre: 'San Pedro - Túcume', zona: 'Norte', localidad: 'Túcume' },
  { id: 'par-juan-bautista-illimo', nombre: 'San Juan Bautista - Íllimo', zona: 'Norte', localidad: 'Íllimo' },
  { id: 'par-pablo-pacora', nombre: 'San Pablo - Pacora', zona: 'Norte', localidad: 'Pacora' },
  { id: 'par-salvador-jayanca', nombre: 'El Salvador - Jayanca', zona: 'Norte', localidad: 'Jayanca' },
  { id: 'par-julian-motupe', nombre: 'San Julián - Motupe', zona: 'Norte', localidad: 'Motupe' },
  { id: 'par-domingo-olmos', nombre: 'Santo Domingo - Olmos', zona: 'Norte', localidad: 'Olmos' },
  { id: 'par-pedro-morrope', nombre: 'San Pedro - Mórrope', zona: 'Norte', localidad: 'Mórrope' },

  // --- ZONA LITORAL ---
  { id: 'par-distrito-san-jose', nombre: 'San José - Distrito San José', zona: 'Litoral', localidad: 'San José' },
  { id: 'par-carmen-pimentel', nombre: 'Nuestra Señora del Carmen - Pimentel', zona: 'Litoral', localidad: 'Pimentel' },
  { id: 'par-distrito-santa-rosa', nombre: 'Santa Rosa - Distrito Santa Rosa', zona: 'Litoral', localidad: 'Santa Rosa' },
  { id: 'par-martin-reque', nombre: 'San Martín de Tours - Reque', zona: 'Litoral', localidad: 'Reque' },
  { id: 'par-pedro-monsefu', nombre: 'San Pedro - Monsefú', zona: 'Litoral', localidad: 'Monsefú' },
  { id: 'par-magdalena-eten', nombre: 'Santa María Magdalena - Ciudad Eten', zona: 'Litoral', localidad: 'Ciudad Eten' },

  // --- ZONA ESTE ---
  { id: 'par-lucia-ferrenafe', nombre: 'Santa Lucía - Ferreñafe', zona: 'Este', localidad: 'Ferreñafe' },
  { id: 'par-corazon-batangrande', nombre: 'Sagrado Corazón de Jesús - Batangrande', zona: 'Este', localidad: 'Batangrande' },
  { id: 'par-socorro-pomalca', nombre: 'María del Perpetuo Socorro - Pomalca', zona: 'Este', localidad: 'Pomalca' },
  { id: 'par-ana-tuman', nombre: 'Santa Ana - Tumán', zona: 'Este', localidad: 'Tumán' },
  { id: 'par-carmen-patapo', nombre: 'Nuestra Señora del Carmen - Pátapo', zona: 'Este', localidad: 'Pátapo' },
  { id: 'par-miguel-picsi', nombre: 'Arcángel San Miguel - Picsi', zona: 'Este', localidad: 'Picsi' },
  { id: 'par-piedad-pucala', nombre: 'La Piedad - Pucalá', zona: 'Este', localidad: 'Pucalá' },

  // --- ZONA SIERRA ---
  { id: 'par-inmaculada-santa-cruz', nombre: 'La Inmaculada - Santa Cruz', zona: 'Sierra', localidad: 'Santa Cruz' },
];

// 2. Lista Unificada de Opciones para el Registro (Comunidades, Movimientos y Pastorales)
export const COMUNIDADES_SELECT_OPTIONS: OpcionComunidad[] = [
  // Comisión Diocesana / Coordinación General
  {
    id: 'general',
    nombre: '✝️ Coordinación General / Comisión Diocesana de Juventud',
    categoria: 'Comisión Diocesana',
    zona: 'Centro-Este',
  },

  // Movimientos Eclesiales Diocesanos
  { id: 'mov-jufra-pomalca', nombre: 'Juventud Franciscana Pomalca (JUFRA)', categoria: 'Movimiento', zona: 'Movimientos' },
  { id: 'mov-juan-xxiii', nombre: 'Movimiento Juan XXIII', categoria: 'Movimiento', zona: 'Movimientos' },
  { id: 'mov-mjd-dic', nombre: 'MJD DIC (Dominicos)', categoria: 'Movimiento', zona: 'Movimientos' },
  { id: 'mov-mjd-jdc', nombre: 'MJD JDC (Dominicos)', categoria: 'Movimiento', zona: 'Movimientos' },
  { id: 'mov-mjd-jhd', nombre: 'MJD JHD (Dominicos)', categoria: 'Movimiento', zona: 'Movimientos' },
  { id: 'mov-red-esejoven', nombre: 'RED ESEJOVEN (Jesuitas)', categoria: 'Movimiento', zona: 'Movimientos' },
  { id: 'mov-tomis-stack', nombre: 'Comunidad Juan Tomis Stack', categoria: 'Movimiento', zona: 'Movimientos' },
  { id: 'mov-salesianos', nombre: 'Movimiento Juvenil Salesiano (Salesianos)', categoria: 'Movimiento', zona: 'Movimientos' },
  { id: 'mov-ruta-joven', nombre: 'RUTA JOVEN', categoria: 'Movimiento', zona: 'Movimientos' },
  { id: 'mov-militantes', nombre: 'Militantes de Santa María', categoria: 'Movimiento', zona: 'Movimientos' },
  { id: 'mov-bodas-cana', nombre: 'Movimiento Jóvenes Bodas de Caná', categoria: 'Movimiento', zona: 'Movimientos' },

  // Pastorales Universitarias
  { id: 'uni-misiones-usat', nombre: 'Misiones USAT (Univ. Santo Toribio de Mogrovejo)', categoria: 'Pastoral Universitaria', zona: 'Pastoral Universitaria' },
  { id: 'uni-unprg', nombre: 'Pastoral Universitaria UNPRG (Univ. Pedro Ruiz Gallo)', categoria: 'Pastoral Universitaria', zona: 'Pastoral Universitaria' },
  { id: 'uni-sagrada', nombre: 'Pastoral Universitaria Sagrado Corazón de Jesús (Sagradina)', categoria: 'Pastoral Universitaria', zona: 'Pastoral Universitaria' },

  // Pastorales Parroquiales Territoriales
  ...PARROQUIAS_DIOCESANAS.map((p) => ({
    id: `pas-${p.id}`,
    nombre: `Pastoral Juvenil ${p.nombre}`,
    categoria: 'Pastoral Parroquial' as const,
    zona: p.zona,
    parroquiaNombre: p.nombre,
  })),
];
