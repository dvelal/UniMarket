'use client'
/* importamos createAuthClient que es una instancia
    osea un objeto que se encarga de conectar
    el servidor (donde se aloja el codigo) y el navegador del usuario*/
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient()

/*este authClient contiene las funciones signIn, signUp etc... 
  las estamos exportando para poder usar en auth.ts donde ocurrira la verdadera autenticacion*/
export const { signIn, signUp, signOut, useSession } = authClient
