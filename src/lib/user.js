import { createContext, useContext } from 'react'

// Contexto con el usuario conectado y su perfil, para no tener que
// pasarlos como props de componente en componente.
export const UserContext = createContext(null)
export const useUser = () => useContext(UserContext)
