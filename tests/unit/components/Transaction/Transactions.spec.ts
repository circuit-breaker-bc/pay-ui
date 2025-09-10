import '../../util/composition-api-setup'
import { mountTransactionsWithStore, restoreSandbox } from '../../vue-test-utils'
import { Account } from '@/util/constants'
import Transactions from '@/components/Transaction/Transactions.vue'
import TransactionsDataTable from '@/components/Transaction/TransactionsDataTable.vue'
import Vue from 'vue'
import { transactionResponse } from '../../test-data/transaction'

// Prevent the warning "[Vuetify] Unable to locate target [data-app]"
document.body.setAttribute('data-app', 'true')

const allowedAccountTypes = [Account.PREMIUM, Account.STAFF, Account.SBC_STAFF]

describe('Transactions account type tests', () => {
  let wrapper: any
  let sandbox: any

  const config = {
    AUTH_API_URL: 'https://localhost:8080/api/v1/app',
    PAY_API_URL: 'https://pay-api.gov.bc.ca/api/v1'
  }
  sessionStorage.AUTH_API_CONFIG = JSON.stringify(config)

  afterEach(() => {
    if (wrapper) wrapper.destroy()
    restoreSandbox(sandbox)
  })

  allowedAccountTypes.forEach((accountType) => {
    it(`renders transactions for account type ${accountType}`, async () => {
      const setup = await mountTransactionsWithStore(transactionResponse)
      wrapper = setup.wrapper
      sandbox = setup.sandbox
      expect(wrapper.findComponent(Transactions).exists()).toBe(true)
      expect(wrapper.findComponent(TransactionsDataTable).exists()).toBe(true)
      expect(wrapper.find('.view-header__title').exists()).toBe(false)
      expect(wrapper.find('.cad-credit').exists()).toBe(false)
      expect(wrapper.find('.credit-details').exists()).toBe(false)
      expect(wrapper.find("[data-test='btn-export-csv']").exists()).toBe(true)
      expect(wrapper.find('.column-selections').exists()).toBe(true)
      // defaults to extended false
      expect(wrapper.vm.extended).toBe(false)
      expect(wrapper.findComponent(TransactionsDataTable).props().extended).toBe(false)
    })

    it('shows title when given', async () => {
      const setup = await mountTransactionsWithStore(transactionResponse)
      wrapper = setup.wrapper
      sandbox = setup.sandbox
      expect(wrapper.find('.view-header__title').exists()).toBe(false)
      const titleText = 'title'
      wrapper.setProps({ title: titleText })
      await Vue.nextTick()
      expect(wrapper.find('.view-header__title').text()).toBe(titleText)
    })

    it('hides export button when needed', async () => {
      const setup = await mountTransactionsWithStore(transactionResponse)
      wrapper = setup.wrapper
      sandbox = setup.sandbox
      expect(wrapper.find("[data-test='btn-export-csv']").exists()).toBe(true)
      wrapper.setProps({ showExport: false })
      await Vue.nextTick()
      expect(wrapper.find("[data-test='btn-export-csv']").exists()).toBe(false)
    })

    it('defaults', async () => {
      const setup = await mountTransactionsWithStore(transactionResponse)
      wrapper = setup.wrapper
      sandbox = setup.sandbox
      expect(wrapper.find("[data-test='btn-export-csv']").exists()).toBe(true)
      wrapper.setProps({ showExport: false })
      await Vue.nextTick()
      expect(wrapper.find("[data-test='btn-export-csv']").exists()).toBe(false)
    })
  })
})
