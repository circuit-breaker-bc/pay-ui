<template>
  <v-container class="transaction-container">
    <v-fade-transition>
      <div
        v-if="isLoading"
        class="loading-container"
      >
        <v-progress-circular
          size="50"
          width="5"
          color="primary"
          :indeterminate="isLoading"
        />
      </div>
    </v-fade-transition>
    <header
      v-if="title"
      class="view-header align-center mb-5 ml-2"
    >
      <h2 class="view-header__title">
        {{ title }}
      </h2>
    </header>
    <section>
      <v-row
        justify="end"
        no-gutters
      >
        <v-col v-if="showExport">
          <v-btn
            large
            color="primary"
            class="font-weight-bold ml-4"
            :loading="isLoading"
            :disabled="isLoading"
            data-test="btn-export-csv"
            @click="exportCSV()"
          >
            Export CSV
          </v-btn>
        </v-col>
        <v-col
          align-self="end"
          cols="auto"
        >
          <v-select
            v-model="headersSelected"
            class="column-selections"
            dense
            filled
            hide-details
            item-text="value"
            :items="headerSelections"
            :menu-props="{
              bottom: true,
              minWidth: '200px',
              maxHeight: 'none',
              offsetY: true
            }"
            multiple
            return-object
            style="width: 200px;"
          >
            <template #selection="{ index }">
              <span
                v-if="index === 0"
                class="columns-to-show"
              >Columns to show</span>
            </template>
          </v-select>
        </v-col>
      </v-row>
      <TransactionsDataTable
        class="mt-4"
        :extended="extended"
        :headers="sortedHeaders"
        @isDownloadingReceipt="isLoading = $event"
      />
    </section>
    <!-- export csv error -->
    <ModalDialog
      ref="csvErrorDialog"
      dialog-class="notify-dialog"
      title="Unable to export CSV"
      :text="csvErrorDialogText"
      max-width="640"
    >
      <template #icon>
        <v-icon
          large
          color="primary"
        >
          mdi-alert-circle-outline
        </v-icon>
      </template>
      <template #actions>
        <v-btn
          large
          color="primary"
          @click="csvErrorDialog.close()"
        >
          OK
        </v-btn>
      </template>
    </ModalDialog>
  </v-container>
</template>

<script lang="ts">
import { Ref, defineComponent, onBeforeUnmount, onMounted, reactive, ref, toRefs, watch } from '@vue/composition-api'
import { useTransactions } from '@/composables/Transaction/transactions-factory'
import { useAccountChangeHandler } from '@/composables/Transaction/account-change-factory'
import { BaseTableHeaderI } from '@/components/datatable/interfaces'
import CommonUtils from '@/util/common-util'
import ModalDialog from '@/components/common/ModalDialog.vue'
import TransactionsDataTable from './TransactionsDataTable.vue'
import { getTransactionTableHeaders } from '@/resources/table-headers/transactions-table'
import moment from 'moment'
import { paymentTypeDisplay } from '@/resources/display-mappers/payment-type-display'

export default defineComponent({
  name: 'Transactions',
  components: { ModalDialog, TransactionsDataTable },
  props: {
    extended: { default: false },
    showCredit: { default: true },
    showExport: { default: true },
    title: { default: '' }
  },
  setup (props) {
    const csvErrorDialog: Ref<InstanceType<typeof ModalDialog>> = ref(null)
    const csvErrorTextBasic = 'We were unable to process your CSV export. Please try again later.'
    const csvErrorTextMaxExceeded = 'You have exceeded the maximum of 100,000 records for your CSV export. Please refine your search and try again.'
    const csvErrorDialogText = ref(csvErrorTextBasic)

    const { setAccountChangedHandler, beforeDestroy } = useAccountChangeHandler()
    const { clearAllFilters, getTransactionReport, loadTransactionList, setViewAll, defaultSearchToOneYear } = useTransactions()

    const state = reactive({
      isLoading: false
    })

    // FUTURE: vue3 we can set this fn explicitly in the resource instead of doing it here
    const headers = getTransactionTableHeaders(props.extended)
    headers.forEach((header) => {
      if (header.hasFilter) {
        header.customFilter.filterApiFn = (val: any) => loadTransactionList(header.col, val || '', props.extended)
      }
    })

    // dynamic header selection stuff
    let preSelectedHeaders = ['createdOn', 'total', 'paymentMethod', 'statusCode', 'downloads', 'actions']
    if (props.extended) preSelectedHeaders = ['accountName', 'appType', 'lineItems', 'downloads', ...preSelectedHeaders]
    else preSelectedHeaders = ['lineItemsAndDetails', ...preSelectedHeaders]

    const headerSelections: BaseTableHeaderI[] = [] // what the user sees in the dropdown
    const headersSelected: Ref<BaseTableHeaderI[]> = ref([]) // headers shown in the table
    headers.forEach((header) => {
      // don't push actions to selection options (want it to be invisible to user)
      if (header.col !== 'actions') headerSelections.push(header)
      if (preSelectedHeaders.includes(header.col)) {
        headersSelected.value.push(header)
      }
    })
    // NB: keeps headers in order after selecting/unselecting columns
    const sortedHeaders: Ref<BaseTableHeaderI[]> = ref([...headersSelected.value])
    watch(() => headersSelected.value, (val: BaseTableHeaderI[]) => {
      // sort headers
      sortedHeaders.value = []
      headers.forEach((header) => {
        if (val.find((selectedHeader) => selectedHeader.col === header.col)) sortedHeaders.value.push(header)
      })
    })

    const initialize = () => {
      setAccountChangedHandler(initialize)
      setViewAll(props.extended)
      clearAllFilters(true)
      defaultSearchToOneYear()
      loadTransactionList()
    }

    const exportCSV = async () => {
      state.isLoading = true
      // grab from composable**
      const downloadData = await getTransactionReport()
      if (!downloadData || downloadData.error) {
        if (downloadData?.error?.response?.status === 400) {
          csvErrorDialogText.value = csvErrorTextMaxExceeded
        }
        csvErrorDialog.value?.open()
      } else {
        CommonUtils.fileDownload(downloadData, `bcregistry-transactions-${moment().format('MM-DD-YYYY')}.csv`, 'text/csv')
      }
      state.isLoading = false
    }

    onMounted(() => {
      initialize()
    })
    onBeforeUnmount(() => { beforeDestroy() })

    return {
      ...toRefs(state),
      csvErrorDialog,
      csvErrorDialogText,
      headers,
      headerSelections,
      headersSelected,
      sortedHeaders,
      exportCSV,
      paymentTypeDisplay
    }
  }
})
</script>

<style lang="scss" scoped>
  .columns-to-show {
    color: $gray7;
    font-size: 0.825rem;
  }

  .view-header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .transaction-container {
    overflow: hidden;
  }

  .folio-number-field {
    border-top-right-radius: 0px;
    border-bottom-right-radius: 0px;
    max-width: 180px;
  }

  .folio-number-apply-btn {
    border-top-left-radius: 0px;
    border-bottom-left-radius: 0px;
  }

  .date-filter-container {
    .date-range-list {
      border-right: 1px solid #999;
      padding-right: 0;
    }
  }

  .date-range-options {
    width: 15rem;
    border-radius: 0 !important;
    border-right: 1px solid var(--v-grey-lighten1);
  }

  .date-range-label {
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--v-grey-lighten1);
  }

  .v-picker.v-card {
    box-shadow: none !important;
  }

  .filter-results {
    opacity: 0;
    overflow: hidden;
    max-height: 0;
    transition: all ease-out 0.25s;
  }

  .filter-results.active {
    opacity: 1;
    max-height: 4rem;
  }

  .filter-results-label {
    font-weight: 700;
  }

  .v-chip {
    height: 36px;
  }

  ::v-deep {
    .v-text-field--outlined.v-input--dense .v-label {
      top: 14px !important;
    }

    .v-progress-linear {
      margin-top: -2px !important
    }
  }
  .cad-credit {
    font-size: 14px;
    color: $gray6;
  }
  .credit-details {
    color: $gray7;
  }

  .loading-container {
    background: rgba(255,255,255, 0.8);
  }

  .credit-header-row {
    display: flex;
    align-items: center;
    font-size: 1.15rem;
  }
  .credit-method-amount {
    font-size: 1.15rem;
  }
  .credit-method-name {
    color: $gray7;
  }
</style>
