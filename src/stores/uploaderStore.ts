import { User } from "../../src-electron/util/uploads/apiUtils";
import { defineStore } from "pinia";

export const useUploaderStore = defineStore("uploader", {
  state: () => {
    return {
      user: undefined as User | undefined,
      token: undefined as string | undefined,
      loggingIn: false,
    }
  },

  getters: {
    isLoggedIn(state) {
      return state.token && state.user
    },

    isLoggingIn(state) {
      return state.loggingIn
    },

    getUser(state) {
      return state.user
    },

    getToken(state) {
      return state.token
    },
  },

  actions: {
    setLoggingIn(loggingIn: boolean) {
      this.loggingIn = loggingIn
    },

    setUser(user: User) {
      this.user = user
    },

    setToken(token: string) {
      this.token = token
    },

    logout() {
      this.user = undefined
      this.token = undefined
    }
  }
});
