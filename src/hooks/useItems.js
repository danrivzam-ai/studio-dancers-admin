import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { COURSES, SABADOS_INTENSIVOS, DANCE_CAMP, PRODUCTS } from '../lib/courses'

// Combinar cursos predeterminados como fallback
const DEFAULT_COURSES = [...COURSES, ...SABADOS_INTENSIVOS, ...DANCE_CAMP].map(c => ({
  ...c,
  code: c.id,
  age_min: c.ageMin,
  age_max: c.ageMax,
  price_type: c.priceType,
  allows_installments: c.allowsInstallments || false,
  installment_count: c.installmentCount || 1,
  is_default: true
}))

const DEFAULT_PRODUCTS = PRODUCTS.map(p => ({
  ...p,
  code: p.id,
  is_default: true
}))

export function useItems() {
  const [courses, setCourses] = useState(DEFAULT_COURSES)
  const [products, setProducts] = useState(DEFAULT_PRODUCTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [usingSupabase, setUsingSupabase] = useState(false)

  // Cargar cursos desde Supabase
  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('active', true)
        .order('name')

      if (error) {
        // Si la tabla no existe, usar los predeterminados
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log('Tabla courses no existe, usando predeterminados')
          return false
        }
        throw error
      }

      // Si la consulta fue exitosa, la tabla existe - habilitar Supabase
      setUsingSupabase(true)

      if (data && data.length > 0) {
        // Mapear a formato compatible con el frontend
        const mappedCourses = data.map(c => {
          // Buscar datos del curso predeterminado para enriquecer (classDays, classesPerCycle, etc.)
          const defaultCourse = DEFAULT_COURSES.find(dc => dc.code === c.code || dc.id === c.code)
          return {
            id: c.code,
            code: c.code,
            name: c.name,
            description: c.description,
            category: c.category,
            ageMin: c.age_min,
            ageMax: c.age_max,
            age_min: c.age_min,
            age_max: c.age_max,
            schedule: c.schedule,
            price: parseFloat(c.price),
            priceType: c.price_type,
            price_type: c.price_type,
            allowsInstallments: c.allows_installments,
            allows_installments: c.allows_installments,
            installmentCount: c.installment_count,
            installment_count: c.installment_count,
            // Datos de ciclo de clases (desde curso predeterminado)
            classDays: defaultCourse?.classDays || null,
            classesPerCycle: defaultCourse?.classesPerCycle || null,
            classesPerPackage: defaultCourse?.classesPerPackage || null,
            active: c.active,
            is_default: c.is_default,
            supabase_id: c.id
          }
        })
        // Combinar cursos de Supabase con los predeterminados que no estén en Supabase
        const supabaseCodes = mappedCourses.map(c => c.code)
        const missingDefaults = DEFAULT_COURSES.filter(dc => !supabaseCodes.includes(dc.code))
        setCourses([...mappedCourses, ...missingDefaults])
      }
      // Si la tabla está vacía, mantener los cursos predeterminados
      return true
    } catch (err) {
      console.error('Error fetching courses:', err)
      setError(err.message)
      return false
    }
  }

  // Cargar productos desde Supabase
  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('name')

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log('Tabla products no existe, usando predeterminados')
          return false
        }
        throw error
      }

      // Si la consulta fue exitosa, la tabla existe - habilitar Supabase
      setUsingSupabase(true)

      if (data && data.length > 0) {
        const mappedProducts = data.map(p => ({
          id: p.code,
          code: p.code,
          name: p.name,
          description: p.description,
          category: p.category,
          price: parseFloat(p.price),
          stock: p.stock,
          active: p.active,
          is_default: p.is_default,
          supabase_id: p.id
        }))
        // Combinar con los predeterminados que no estén en Supabase
        const supabaseCodes = mappedProducts.map(p => p.code)
        const missingDefaults = DEFAULT_PRODUCTS.filter(dp => !supabaseCodes.includes(dp.code))
        setProducts([...mappedProducts, ...missingDefaults])
      }
      // Si la tabla está vacía, mantener los productos predeterminados
      return true
    } catch (err) {
      console.error('Error fetching products:', err)
      setError(err.message)
      return false
    }
  }

  // Cargar datos al iniciar
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const [coursesLoaded, productsLoaded] = await Promise.all([
        fetchCourses(),
        fetchProducts()
      ])

      // Obtener lista de items predeterminados eliminados
      const deletedCourses = JSON.parse(localStorage.getItem('deleted_default_courses') || '[]')
      const deletedProducts = JSON.parse(localStorage.getItem('deleted_default_products') || '[]')

      // Si no se cargó desde Supabase, intentar localStorage como fallback
      if (!coursesLoaded) {
        try {
          const saved = localStorage.getItem('studio_dancers_courses')
          const customCourses = saved ? JSON.parse(saved) : []
          // Filtrar los predeterminados eliminados
          const filteredDefaults = DEFAULT_COURSES.filter(c => !deletedCourses.includes(c.id) && !deletedCourses.includes(c.code))
          setCourses([...filteredDefaults, ...customCourses])
        } catch (e) {
          console.log('No hay cursos en localStorage')
          const filteredDefaults = DEFAULT_COURSES.filter(c => !deletedCourses.includes(c.id) && !deletedCourses.includes(c.code))
          setCourses(filteredDefaults)
        }
      } else {
        // También filtrar si se cargó de Supabase
        setCourses(prev => prev.filter(c => !deletedCourses.includes(c.id) && !deletedCourses.includes(c.code)))
      }

      if (!productsLoaded) {
        try {
          const saved = localStorage.getItem('studio_dancers_products')
          const customProducts = saved ? JSON.parse(saved) : []
          // Filtrar los predeterminados eliminados
          const filteredDefaults = DEFAULT_PRODUCTS.filter(p => !deletedProducts.includes(p.id) && !deletedProducts.includes(p.code))
          setProducts([...filteredDefaults, ...customProducts])
        } catch (e) {
          console.log('No hay productos en localStorage')
          const filteredDefaults = DEFAULT_PRODUCTS.filter(p => !deletedProducts.includes(p.id) && !deletedProducts.includes(p.code))
          setProducts(filteredDefaults)
        }
      } else {
        // También filtrar si se cargó de Supabase
        setProducts(prev => prev.filter(p => !deletedProducts.includes(p.id) && !deletedProducts.includes(p.code)))
      }

      setLoading(false)
    }
    loadData()
  }, [])

  // Guardar curso (intenta Supabase, fallback a localStorage)
  const saveCourse = async (courseData, isEdit = false) => {
    try {
      const code = courseData.code || courseData.id || `custom-${Date.now()}`

      // Intentar guardar en Supabase
      if (usingSupabase) {
        const dbData = {
          code,
          name: courseData.name,
          description: courseData.description || null,
          category: courseData.category || (courseData.priceType === 'programa' ? 'especial' : 'regular'),
          age_min: courseData.ageMin || courseData.age_min || 3,
          age_max: courseData.ageMax || courseData.age_max || 99,
          schedule: courseData.schedule || null,
          price: parseFloat(courseData.price),
          price_type: courseData.priceType || courseData.price_type || 'mes',
          allows_installments: courseData.allowsInstallments || courseData.allows_installments || false,
          installment_count: courseData.installmentCount || courseData.installment_count || 1,
          active: true,
          is_default: false,
          updated_at: new Date().toISOString()
        }

        let result
        if (isEdit && courseData.supabase_id) {
          result = await supabase
            .from('courses')
            .update(dbData)
            .eq('id', courseData.supabase_id)
            .select()
            .single()
        } else {
          // Verificar si ya existe
          const { data: existing } = await supabase
            .from('courses')
            .select('id')
            .eq('code', code)
            .single()

          if (existing) {
            result = await supabase
              .from('courses')
              .update(dbData)
              .eq('code', code)
              .select()
              .single()
          } else {
            result = await supabase
              .from('courses')
              .insert([dbData])
              .select()
              .single()
          }
        }

        if (result.error) throw result.error
        await fetchCourses()
        return { success: true, data: result.data }
      }

      // Fallback a localStorage
      const newCourse = {
        ...courseData,
        id: code,
        code,
        is_default: false
      }

      const customCourses = courses.filter(c => !c.is_default)
      const updatedCustom = isEdit
        ? customCourses.map(c => c.id === courseData.id ? newCourse : c)
        : [...customCourses, newCourse]

      localStorage.setItem('studio_dancers_courses', JSON.stringify(updatedCustom))
      setCourses([...DEFAULT_COURSES, ...updatedCustom])

      return { success: true }
    } catch (err) {
      console.error('Error saving course:', err)
      return { success: false, error: err.message }
    }
  }

  // Eliminar curso (incluyendo predeterminados)
  const deleteCourse = async (courseId) => {
    try {
      const course = courses.find(c => c.id === courseId || c.code === courseId)

      if (usingSupabase) {
        // Si existe en Supabase, marcarlo como inactivo
        const { error } = await supabase
          .from('courses')
          .update({ active: false })
          .eq('code', courseId)

        if (error && error.code !== 'PGRST116') throw error

        // Si es predeterminado, guardarlo en lista de eliminados
        if (course?.is_default) {
          const deletedDefaults = JSON.parse(localStorage.getItem('deleted_default_courses') || '[]')
          if (!deletedDefaults.includes(courseId)) {
            deletedDefaults.push(courseId)
            localStorage.setItem('deleted_default_courses', JSON.stringify(deletedDefaults))
          }
        }

        // Actualizar lista local
        setCourses(prev => prev.filter(c => c.id !== courseId && c.code !== courseId))
      } else {
        // localStorage - guardar lista de eliminados
        if (course?.is_default) {
          const deletedDefaults = JSON.parse(localStorage.getItem('deleted_default_courses') || '[]')
          if (!deletedDefaults.includes(courseId)) {
            deletedDefaults.push(courseId)
            localStorage.setItem('deleted_default_courses', JSON.stringify(deletedDefaults))
          }
        }
        const customCourses = courses.filter(c => !c.is_default && c.id !== courseId)
        localStorage.setItem('studio_dancers_courses', JSON.stringify(customCourses))
        setCourses(prev => prev.filter(c => c.id !== courseId && c.code !== courseId))
      }

      return { success: true }
    } catch (err) {
      console.error('Error deleting course:', err)
      return { success: false, error: err.message }
    }
  }

  // Guardar producto
  const saveProduct = async (productData, isEdit = false) => {
    try {
      const code = productData.code || productData.id || `prod-${Date.now()}`

      if (usingSupabase) {
        const dbData = {
          code,
          name: productData.name,
          description: productData.description || null,
          category: productData.category || 'accesorios',
          price: parseFloat(productData.price),
          stock: productData.stock != null ? parseInt(productData.stock) : 0,
          active: true,
          is_default: false,
          updated_at: new Date().toISOString()
        }

        let result
        if (isEdit && productData.supabase_id) {
          result = await supabase
            .from('products')
            .update(dbData)
            .eq('id', productData.supabase_id)
            .select()
            .single()
        } else {
          const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('code', code)
            .single()

          if (existing) {
            result = await supabase
              .from('products')
              .update(dbData)
              .eq('code', code)
              .select()
              .single()
          } else {
            result = await supabase
              .from('products')
              .insert([dbData])
              .select()
              .single()
          }
        }

        if (result.error) throw result.error
        await fetchProducts()
        return { success: true, data: result.data }
      }

      // Fallback localStorage
      const newProduct = {
        ...productData,
        id: code,
        code,
        is_default: false
      }

      const customProducts = products.filter(p => !p.is_default)
      const updatedCustom = isEdit
        ? customProducts.map(p => p.id === productData.id ? newProduct : p)
        : [...customProducts, newProduct]

      localStorage.setItem('studio_dancers_products', JSON.stringify(updatedCustom))
      setProducts([...DEFAULT_PRODUCTS, ...updatedCustom])

      return { success: true }
    } catch (err) {
      console.error('Error saving product:', err)
      return { success: false, error: err.message }
    }
  }

  // Eliminar producto (incluyendo predeterminados)
  const deleteProduct = async (productId) => {
    try {
      const product = products.find(p => p.id === productId || p.code === productId)

      if (usingSupabase) {
        const { error } = await supabase
          .from('products')
          .update({ active: false })
          .eq('code', productId)

        if (error && error.code !== 'PGRST116') throw error

        // Si es predeterminado, guardarlo en lista de eliminados
        if (product?.is_default) {
          const deletedDefaults = JSON.parse(localStorage.getItem('deleted_default_products') || '[]')
          if (!deletedDefaults.includes(productId)) {
            deletedDefaults.push(productId)
            localStorage.setItem('deleted_default_products', JSON.stringify(deletedDefaults))
          }
        }

        // Actualizar lista local
        setProducts(prev => prev.filter(p => p.id !== productId && p.code !== productId))
      } else {
        // localStorage - guardar lista de eliminados
        if (product?.is_default) {
          const deletedDefaults = JSON.parse(localStorage.getItem('deleted_default_products') || '[]')
          if (!deletedDefaults.includes(productId)) {
            deletedDefaults.push(productId)
            localStorage.setItem('deleted_default_products', JSON.stringify(deletedDefaults))
          }
        }
        const customProducts = products.filter(p => !p.is_default && p.id !== productId)
        localStorage.setItem('studio_dancers_products', JSON.stringify(customProducts))
        setProducts(prev => prev.filter(p => p.id !== productId && p.code !== productId))
      }

      return { success: true }
    } catch (err) {
      console.error('Error deleting product:', err)
      return { success: false, error: err.message }
    }
  }

  // Obtener curso por ID/código
  const getCourseById = (courseId) => {
    if (!courseId) return null
    return courses.find(c => c.id === courseId || c.code === courseId)
  }

  // Obtener producto por ID/código
  const getProductById = (productId) => {
    if (!productId) return null
    return products.find(p => p.id === productId || p.code === productId)
  }

  // Obtener cursos sugeridos por edad
  const getSuggestedCourses = (age) => {
    if (!age) return []
    return courses.filter(c => age >= (c.ageMin || c.age_min) && age <= (c.ageMax || c.age_max))
  }

  // Agrupar cursos por categoría
  const coursesByCategory = {
    regular: courses.filter(c =>
      c.category === 'regular' ||
      (!c.category && (c.priceType === 'mes' || c.priceType === 'clase'))
    ),
    intensivo: courses.filter(c =>
      c.category === 'intensivo' ||
      c.id?.startsWith('sabados-') ||
      c.code?.startsWith('sabados-')
    ),
    camp: courses.filter(c =>
      c.category === 'camp' ||
      c.id?.startsWith('camp-') ||
      c.code?.startsWith('camp-')
    ),
    especial: courses.filter(c => c.category === 'especial')
  }

  return {
    courses,
    products,
    coursesByCategory,
    loading,
    error,
    usingSupabase,
    fetchCourses,
    fetchProducts,
    saveCourse,
    deleteCourse,
    saveProduct,
    deleteProduct,
    getCourseById,
    getProductById,
    getSuggestedCourses
  }
}
