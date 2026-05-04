import { writable } from 'svelte/store'

function createAuthStore() {
  const { subscribe, set, update } = writable({
    isAuthenticated: false,
    user: null,
    token: null
  })

  const storedToken = localStorage.getItem('auth_token')
  if (storedToken) {
    set({
      isAuthenticated: true,
      user: JSON.parse(localStorage.getItem('user') || 'null'),
      token: storedToken
    })
  }

  return {
    subscribe,
    login: (token, user) => {
      localStorage.setItem('auth_token', token)
      localStorage.setItem('user', JSON.stringify(user))
      set({
        isAuthenticated: true,
        user,
        token
      })
    },
    logout: () => {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')
      set({
        isAuthenticated: false,
        user: null,
        token: null
      })
    },
    updateUser: (user) => {
      localStorage.setItem('user', JSON.stringify(user))
      update(state => ({ ...state, user }))
    }
  }
}

export const auth = createAuthStore()
