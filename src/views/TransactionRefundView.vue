<template>
  <v-app>
    <v-container>
      <h2 class="mb-4">
        Transaction Refund
      </h2>
      <v-overlay :value="dataLoading">
        <v-progress-circular indeterminate size="56" color="primary" />
      </v-overlay>
      <div v-if="!dataLoading">
        <PaymentDetails
          :payment-data="paymentData"
          class="mb-12"
        />
        <TransactionDetails
          :transaction-data="transactionData"
          class="mb-12"
        />
        <RefundRequestForm v-show="refundFormStage === RefundRequestStage.REQUEST_FORM"
          class="mb-12"
          :total-transaction-amount="paymentData.totalTransactionAmount"
          :refund-line-items="refundLineItems"
          :refund-methods="refundMethods"
          :previous-refunded-amount="previousRefundedAmount"
          :is-partial-refund-allowed="isPartialRefundAllowed"
          :invoice-payment-method="invoicePaymentMethod"
          @onCancel="onCancel"
          @onProceedToReview="onProceedToReview"
        />
        <RefundReviewForm v-show="refundFormStage === RefundRequestStage.DATA_VALIDATED"
          class="mb-12"
          :refund-form-data="refundFormData"
          :refund-methods="refundMethods"
          :is-processing="isProcessing"
          :message="message"
          @onProceedToConfirm="onProceedToConfirm"
          @onProceedToRequestForm="onProceedToRequestForm"
        />
      </div>
    </v-container>
  </v-app>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, toRefs, computed } from '@vue/composition-api'
import PaymentDetails from '@/components/TransactionRefund/PaymentDetails.vue'
import TransactionDetails from '@/components/TransactionRefund/TransactionDetails.vue'
import RefundRequestForm from '@/components/TransactionRefund/RefundRequestForm.vue'
import RefundReviewForm from '@/components/TransactionRefund/RefundReviewForm.vue'
import { PaymentData, RefundFormData, RefundType, TransactionData, RefundRequestStage, RefundLineItem } from '@/models/transaction-refund'
import { Invoice, LineItem } from '@/models/Invoice'
import { useOrgStore } from '@/store/org'
import { getProductDisplayName } from '@/util/product-display'
import CommonUtils from '@/util/common-util'
import type { Message } from '@/models/message'
import { RefundRequest, RefundRevenueType } from '@/models/refund'

/* eslint-disable no-unused-vars */
enum RefundLineTypes {
  BASE_FEES = 'BASE_FEES',
  FUTURE_EFFECTIVE_FEES = 'FUTURE_EFFECTIVE_FEES',
  PRIORITY_FEES = 'PRIORITY_FEES',
  SERVICE_FEES = 'SERVICE_FEES'
}
/* eslint-enable no-unused-vars */

export default defineComponent({
  name: 'PaymentRefund',
  components: { PaymentDetails, TransactionDetails, RefundRequestForm, RefundReviewForm },
  props: {
    invoiceId: {
      type: String,
      required: false
    }
  },
  setup (props, { root }) {
    const state = reactive({
      dataLoading: 0,
      paymentData: {
        accountName: null,
        folioNumber: null,
        initiatedBy: null,
        paymentMethod: null,
        paymentStatus: null,
        totalTransactionAmount: 0
      } as PaymentData,
      transactionData: {
        invoiceId: null,
        transactionDate: null,
        invoiceReferenceId: null,
        invoiceStatusCode: null,
        invoiceCreatedOn: null,
        transactionAmount: 0,
        applicationName: null,
        applicationType: null,
        businessIdentifier: null,
        applicationDetails: null
      } as TransactionData,
      refundFormData: {
        refundType: null,
        refundLineItems: [],
        totalRefundAmount: 0,
        refundMethod: null,
        notificationEmail: null,
        reasonsForRefund: null,
        staffComment: null,
        requestedBy: null,
        requestedTime: null
      } as RefundFormData,
      refundLineItems: [] as RefundLineItem[],
      refundFormStage: RefundRequestStage.REQUEST_FORM as RefundRequestStage,
      refundMethods: [
        { value: 'refund-as-account-credits', text: 'Refund as Account Credits' }
      ],
      previousRefundedAmount: 0,
      isProcessing: false,
      message: null as Message | null,
      orgStore: useOrgStore(),
      invoicePaymentMethod: null as string | null
    })

    const paymentMethodCodesAllowedPartialRefunds = ['DIRECT_PAY', 'EFT', 'EJV', 'ONLINE_BANKING', 'PAD']
    const isPartialRefundAllowed = computed(() =>
      state.paymentData.paymentMethod &&
      paymentMethodCodesAllowedPartialRefunds.includes(state.paymentData.paymentMethod)
    )

    onMounted(async () => {
      await fetchInvoice(props.invoiceId)
    })

    function setPaymentData (invoice: Invoice) {
      state.paymentData = {
        accountName: invoice.paymentAccount?.accountName,
        folioNumber: invoice.folioNumber,
        initiatedBy: invoice.createdBy,
        paymentMethod: invoice.paymentMethod,
        paymentStatus: invoice.statusCode,
        totalTransactionAmount: invoice.total || 0
      }
    }

    function setTransactionData (invoice: Invoice) {
      state.transactionData = {
        invoiceId: invoice.id,
        transactionDate: invoice.createdOn, // ??is it utc, convert it to pacific, talk to ethan
        invoiceReferenceId: invoice.references?.find(f => f.statusCode === 'COMPLETED')?.invoiceNumber,
        transactionAmount: invoice.total || 0,
        applicationName: getProductDisplayName(invoice.corpTypeCode),
        applicationType: invoice.lineItems?.[0]?.description,
        businessIdentifier: invoice.businessIdentifier,
        applicationDetails: invoice.details,
        invoiceStatusCode: invoice.statusCode,
        invoiceCreatedOn: invoice.createdOn
      }
    }

    function getRefundPayload () {
      const refundRevenues: RefundRevenueType[] = []

      if (state.refundFormData.refundType === RefundType.PARTIAL_REFUND) {
        const refundLineItems = state.refundFormData.refundLineItems
        refundLineItems?.forEach(refundLineItem => {
          const feeTypes = [
            { key: 'filingFeesRequested', type: RefundLineTypes.BASE_FEES },
            { key: 'priorityFeesRequested', type: RefundLineTypes.PRIORITY_FEES },
            { key: 'futureEffectiveFeesRequested', type: RefundLineTypes.FUTURE_EFFECTIVE_FEES },
            { key: 'serviceFeesRequested', type: RefundLineTypes.SERVICE_FEES }
          ]

          feeTypes.forEach(fee => {
            if (refundLineItem[fee.key] > 0 && fee.type !== RefundLineTypes.SERVICE_FEES) {
              refundRevenues.push({
                paymentLineItemId: refundLineItem.id,
                refundAmount: parseFloat(refundLineItem[fee.key]),
                refundType: fee.type
              })
            }
          })
        })
      }

      const refundPayload: RefundRequest = {
        reason: state.refundFormData.reasonsForRefund,
        // staffComment: refundFormData.value.staffComment,
        refundRevenue: refundRevenues
      }
      return refundPayload
    }

    function setRefundLineItems (lineItems: LineItem[]) {
      state.refundLineItems = lineItems.map(lineItem => ({
        id: lineItem.id,
        description: lineItem.description,
        filingFees: lineItem.filingFees,
        serviceFees: lineItem.serviceFees,
        priorityFees: lineItem.priorityFees,
        futureEffectiveFees: lineItem.futureEffectiveFees,
        total: lineItem.total
      }))
    }

    async function fetchInvoice (invoiceId) {
      try {
        state.dataLoading += 1
        const invoice: Invoice = await state.orgStore.getInvoice({ invoiceId: invoiceId })
        setPaymentData(invoice)
        setTransactionData(invoice)
        setRefundLineItems(invoice.lineItems)
        state.previousRefundedAmount = invoice.refund || 0
        state.invoicePaymentMethod = invoice.paymentMethod
      } catch (error: any) {
        console.error('Failed to fetch invoice:', error)
      } finally {
        state.dataLoading -= 1
      }
    }

    function onProceedToReview (formData: RefundFormData) {
      state.refundFormData = formData
      state.refundFormStage = RefundRequestStage.DATA_VALIDATED
    }

    function onProceedToRequestForm () {
      state.refundFormStage = RefundRequestStage.REQUEST_FORM
      state.message = null
    }

    async function onProceedToConfirm () {
      try {
        state.isProcessing = true
        state.message = null
        const response = await state.orgStore.refundInvoice(props.invoiceId, getRefundPayload())
        const formatAmount = CommonUtils.formatAmount(response.refundAmount)
        state.message = {
          text: `Refund successful for the amount of ${formatAmount}.`,
          type: 'success',
          show: true
        }
      } catch (error) {
        state.message = {
          text: 'Refund failed',
          type: 'error',
          show: true
        }
        console.log(`Refund process failed: ${error}`)
      } finally {
        state.isProcessing = false
      }
    }

    function onCancel() {
      root.$router?.back()
    }

    return {
      ...toRefs(state),
      RefundRequestStage,
      onProceedToReview,
      onProceedToConfirm,
      onProceedToRequestForm,
      getProductDisplayName,
      isPartialRefundAllowed,
      onCancel
    }
  }
})

</script>
