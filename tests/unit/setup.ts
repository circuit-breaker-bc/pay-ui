import Vue from 'vue'
import VueRouter from 'vue-router'
import VueSanitize from 'vue-sanitize-directive'
import VueTheMask from 'vue-the-mask'
import VueI18n from 'vue-i18n'
import can from '@/directives/can'
import VueCompositionApi from '@vue/composition-api'
import Vuetify from 'vuetify'
import { config } from '@vue/test-utils'
import { vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

Vue.use(VueCompositionApi)
Vue.use(VueTheMask)
Vue.use(Vuetify)
Vue.use(VueRouter)
Vue.use(VueI18n)
Vue.use(VueSanitize)
Vue.directive('can', can)

setActivePinia(createPinia())

config.mocks.$t = () => {}

(global as any).IntersectionObserver = class IntersectionObserver {
  private observe () {
    return vi.fn()
  }

  private disconnect () {
    return vi.fn()
  }

  private unobserve () {
    return vi.fn()
  }
}
