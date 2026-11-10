import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

/**
 * Lee las filas de una tabla y da funciones para añadir, editar y borrar.
 * Es el "puente" entre React y la base de datos: cada componente lo usa
 * en lugar de escribir las consultas a mano.
 *
 *   const blocks = useRows('blocks', { match: { user_id } })
 *   blocks.rows          → las filas
 *   blocks.add({...})    → INSERT
 *   blocks.update(id, {...}) → UPDATE
 *   blocks.remove(id)    → DELETE
 */
export function useRows(table, { match = {}, order = 'created_at', ascending = true } = {}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const matchKey = JSON.stringify(match)

  const load = useCallback(async () => {
    let query = supabase.from(table).select('*').match(JSON.parse(matchKey))
    if (order) query = query.order(order, { ascending })
    const { data, error } = await query
    if (error) setError(error.message)
    else setRows(data)
    setLoading(false)
  }, [table, matchKey, order, ascending])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const add = async (row) => {
    const { data, error } = await supabase.from(table).insert(row).select()
    if (error) throw error
    setRows((r) => [...r, ...data])
    return data
  }

  const update = async (id, patch) => {
    const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single()
    if (error) throw error
    setRows((r) => r.map((x) => (x.id === id ? data : x)))
    return data
  }

  const remove = async (id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    setRows((r) => r.filter((x) => x.id !== id))
  }

  return { rows, loading, error, add, update, remove, reload: load }
}

/**
 * Para tablas con una sola fila por usuario (nutrition, finance).
 * save() hace un UPSERT: crea la fila si no existe o la actualiza.
 */
export function useSingle(table, userId) {
  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return
        setRow(data)
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [table, userId])

  const save = async (patch) => {
    const next = { ...(row || {}), ...patch, user_id: userId, updated_at: new Date().toISOString() }
    const { data, error } = await supabase.from(table).upsert(next).select().single()
    if (error) throw error
    setRow(data)
    return data
  }

  return { row, loading, save }
}
