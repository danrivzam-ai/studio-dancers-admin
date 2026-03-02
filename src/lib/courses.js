// classDays: 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado

// Adultas — category: 'regular'
export const COURSES = [
  { id: 'ballet-adultos-semana',  code: 'ballet-adultos-semana',  name: 'Ballet Adultos Principiantes | M - J',    ageMin: 18, ageMax: 99, schedule: 'Martes y Jueves 7:00 - 8:30 PM',  price: 40, priceType: 'mes',      classDays: [2, 4], classesPerCycle: 8 },
  { id: 'ballet-adultos-sabados', code: 'ballet-adultos-sabados', name: 'Ballet Adultos Intensivo | Sábados',       ageMin: 18, ageMax: 99, schedule: 'Sábados 5:30 - 7:30 PM',          price: 40, priceType: 'mes',      classDays: [6],    classesPerCycle: 4 },
]

// Niñas — category: 'ninas'
export const NINAS = [
  { id: 'program-1771900890659', code: 'program-1771900890659', name: 'Sábados - Baby Ballet',                      ageMin: 3, ageMax: 6,  schedule: 'Sábados',                          price: 40, priceType: 'mes',      classDays: [6],    classesPerCycle: 4 },
  { id: 'sabados-avanzado',      code: 'sabados-avanzado',      name: 'Sábados Intensivos - Dance Crew (8 - 15)', ageMin: 8, ageMax: 15, schedule: 'Sábados 3:00 - 5:30 PM (2.5 h)',  price: 99, priceType: 'mes',      classDays: [6],    classesPerCycle: 4 },
]

// Dance Camp 2026 — category: 'especial'
export const DANCE_CAMP = [
  { id: 'camp-baby',  code: 'camp-baby',  name: 'Dance Camp 2026 - Baby Ballet',  ageMin: 3,  ageMax: 5,  schedule: 'Lun, Mar y Mié 3:00 - 4:00 PM',   price: 99, priceType: 'programa' },
  { id: 'camp-kids',  code: 'camp-kids',  name: 'Dance Camp 2026 - Grupo KIDS',   ageMin: 6,  ageMax: 9,  schedule: 'Lun, Mar y Mié 4:00 - 5:30 PM',   price: 99, priceType: 'programa' },
  { id: 'camp-teens', code: 'camp-teens', name: 'Dance Camp 2026 - Grupo TEENS',  ageMin: 10, ageMax: 16, schedule: 'Lun, Mar y Mié 5:30 - 7:00 PM',   price: 99, priceType: 'programa' },
]

export const ALL_COURSES = [...COURSES, ...NINAS, ...DANCE_CAMP]

// Dynamic courses registry - updated by useItems hook
let _dynamicCourses = []
export const setDynamicCourses = (courses) => { _dynamicCourses = courses }
export const getDynamicCourses = () => _dynamicCourses

// Artículos a la venta
export const PRODUCTS = [
  { id: 'camiseta', name: 'Camiseta', price: 10 },
  { id: 'zapatillas', name: 'Zapatillas Ballet Media Punta', price: 14 },
]

// Bancos disponibles para transferencias
export const BANKS = [
  { id: 'bolivariano', name: 'Banco Bolivariano' },
  { id: 'austro', name: 'Banco del Austro' },
  { id: 'pacifico', name: 'Banco del Pacífico' },
  { id: 'guayaquil', name: 'Banco de Guayaquil' },
  { id: 'solidario', name: 'Banco Solidario' },
  { id: 'internacional', name: 'Banco Internacional' },
  { id: 'pichincha', name: 'Banco Pichincha' },
  { id: 'jardin-azuayo', name: 'Cooperativa Jardín Azuayo' },
  { id: 'jep', name: 'Cooperativa JEP' },
  { id: 'produbanco', name: 'Produbanco' },
]

// Obtener curso por ID (busca en dinámicos primero, luego en hardcodeados)
export const getCourseById = (courseId) => {
  if (!courseId) return null
  return _dynamicCourses.find(c => c.id === courseId || c.code === courseId)
    || ALL_COURSES.find(c => c.id === courseId)
}

// Obtener cursos sugeridos por edad
export const getSuggestedCourses = (age) => {
  const all = _dynamicCourses.length > 0 ? _dynamicCourses : ALL_COURSES
  return all.filter(c => age >= (c.ageMin || c.age_min || 3) && age <= (c.ageMax || c.age_max || 99))
}

// Obtener producto por ID
export const getProductById = (productId) => {
  return PRODUCTS.find(p => p.id === productId)
}

// Obtener banco por ID
export const getBankById = (bankId) => {
  return BANKS.find(b => b.id === bankId)
}
