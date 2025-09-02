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
          @onProceedToReview="onProceedToReview"
        />
        <RefundReviewForm v-show="refundFormStage === RefundRequestStage.DATA_VALIDATED"
          class="mb-12"
          :refund-form-data="refundFormData"
          :refund-methods="refundMethods"
          :is-processing="isProcessing"
          :message="message"
          @onProceedToConfirm="onProceedToConfirm"
        />
      </div>
    </v-container>
  </v-app>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, computed } from '@vue/composition-api'
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
  setup (props) {
    const dataLoading = ref<number>(0)
    const paymentData = ref<PaymentData>({
      accountName: null,
      folioNumber: null,
      initiatedBy: null,
      paymentMethod: null,
      paymentStatus: null,
      totalTransactionAmount: 0
    })
    const transactionData = ref<TransactionData>({
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
    })
    const refundFormData = ref<RefundFormData>({
      refundType: null,
      refundLineItems: [],
      totalRefundAmount: 0,
      refundMethod: null,
      notificationEmail: null,
      reasonsForRefund: null,
      staffComment: null,
      requestedBy: null,
      requestedTime: null
    })
    const refundLineItems = ref<RefundLineItem[]>([])
    const refundFormStage = ref<RefundRequestStage>(RefundRequestStage.REQUEST_FORM)
    const refundMethods = ref([
      { value: 'refund-as-account-redits', text: 'Refund as Account Credits' }
    ])
    const previousRefundedAmount = ref<number>(0)
    const isProcessing = ref<boolean>(false)
    const message = ref<Message | null>(null)
    const orgStore = useOrgStore()

    const invoicePaymentMethod = ref<string | null>(null)
    const paymentMethodCodesAllowedPartialRefunds = ['DIRECT_PAY', 'EFT', 'EJV', 'ONLINE_BANKING', 'PAD']
    const isPartialRefundAllowed = computed(() =>
      paymentData.value.paymentMethod &&
      paymentMethodCodesAllowedPartialRefunds.includes(paymentData.value.paymentMethod)
    )

    onMounted(async () => {
      await fetchInvoice(props.invoiceId)
    })

    function setPaymentData (invoice: Invoice) {
      paymentData.value = {
        accountName: invoice.paymentAccount?.accountName,
        folioNumber: invoice.folioNumber,
        initiatedBy: invoice.createdBy,
        paymentMethod: invoice.paymentMethod,
        paymentStatus: invoice.statusCode,
        totalTransactionAmount: invoice.total || 0
      }
    }

    function setTransactionData (invoice: Invoice) {
      transactionData.value = {
        invoiceId: invoice.id,
        transactionDate: invoice.createdOn, // ??is it utc, convert it to pacific, talk to ethan
        invoiceReferenceId: invoice.references?.find(f => f.statusCode === 'COMPLETED')?.invoiceNumber,
        transactionAmount: invoice.total || 0,
        applicationName: getProductDisplayName(invoice.corpTypeCode),
        applicationType: null,
        businessIdentifier: invoice.businessIdentifier,
        applicationDetails: invoice.details,
        invoiceStatusCode: invoice.statusCode,
        invoiceCreatedOn: invoice.createdOn
      }
    }

    function getRefundPayload () {
      const refundRevenues: RefundRevenueType[] = []

      if (refundFormData.value.refundType === RefundType.PARTIAL_REFUND) {
        const refundLineItems = refundFormData.value.refundLineItems
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
        reason: refundFormData.value.reasonsForRefund,
        // staffComment: refundFormData.value.staffComment,
        refundRevenue: refundRevenues
      }
      return refundPayload
    }

    function setRefundLineItems (lineItems: LineItem[]) {
      refundLineItems.value = lineItems.map(lineItem => ({
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
        dataLoading.value += 1
        const invoice: Invoice = await orgStore.getInvoice({ invoiceId: invoiceId })
        setPaymentData(invoice)
        setTransactionData(invoice)
        setRefundLineItems(invoice.lineItems)
        previousRefundedAmount.value = invoice.refund || 0
        invoicePaymentMethod.value = invoice.paymentMethod
      } catch (error: any) {
        console.error('Failed to fetch invoice:', error)
      } finally {
        dataLoading.value -= 1
      }
    }

    function onProceedToReview (formData: RefundFormData) {
      refundFormData.value = formData
      refundFormStage.value = RefundRequestStage.DATA_VALIDATED
    }

    async function onProceedToConfirm () {
      try {
        isProcessing.value = true
        message.value = null
        console.log('Final submitted data: ', refundFormData.value)
        const response = await orgStore.refundInvoice(props.invoiceId, getRefundPayload())
        const formatAmount = CommonUtils.formatAmount(response.refundAmount)
        message.value = {
          text: `Refund successful for the amount of ${formatAmount}.`,
          type: 'success',
          show: true
        }
      } catch (error) {
        message.value = {
          text: 'Refund failed',
          type: 'error',
          show: true
        }
        console.log(`Refund process failed: ${error}`)
      } finally {
        isProcessing.value = false
      }
    }

    return {
      paymentData,
      transactionData,
      refundFormData,
      dataLoading,
      refundFormStage,
      onProceedToReview,
      onProceedToConfirm,
      RefundRequestStage,
      refundLineItems,
      refundMethods,
      getProductDisplayName,
      previousRefundedAmount,
      isPartialRefundAllowed,
      isProcessing,
      message,
      invoicePaymentMethod
    }
  }
})

</script>
