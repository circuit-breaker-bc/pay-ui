<template>
  <v-app>
    <v-container>
      <h2 class="mb-4">
        Transactions
      </h2>
      <Transactions v-show="!appStore.loading"
        class="mt-5 pa-0 pr-2"
        :extended="true"
        :showCredit="false"
        :showExport="false"
      />
    </v-container>
  </v-app>
</template>

<script lang="ts">
import Transactions from '@/components/Transaction/Transactions.vue'
import { useAppStore } from '@/store/app'
import { defineComponent } from '@vue/composition-api'

export default defineComponent({
  name: 'ViewTransactions',
  components: { Transactions },
  setup () {
    const appStore = useAppStore()
    return {
      appStore
    }
  }
})
</script>
