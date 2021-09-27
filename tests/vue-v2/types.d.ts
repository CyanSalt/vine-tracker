import type { createLocalVue } from 'vue-test-utils-v1'
import type { Vue } from 'vue-v2/types/vue'

export type LocalVueClass = typeof Vue & ReturnType<typeof createLocalVue>
export type LocalVue = Vue & InstanceType<ReturnType<typeof createLocalVue>>
