<template>
  <div>
    <v-card flat>
      <v-card-title class="card-title">
        <v-icon
          class="pr-3"
          color="link"
        >
          mdi-file-document
        </v-icon>
        Refund Request
      </v-card-title>
      <v-card-text
        class="mt-5"
      >
        <v-row no-gutters>
          <v-col class="col-12 col-sm-12 ">
            <v-row>
              <v-col class="col-6 col-sm-3 font-weight-bold">
                Refund Type
              </v-col>
              <v-col class="col-6 col-sm-9">
                {{ refundFormData.refundType }}
              </v-col>
            </v-row>
            <v-row v-if="refundFormData.refundType == RefundType.PARTIAL_REFUND">
              <v-col class="col-6 col-sm-3 font-weight-bold">
                Refund Details
              </v-col>
              <v-col class="col-6 col-sm-9">
                  <ol>
                    <li v-for="(lineItem, index) in refundFormData.refundLineItems" :key="index" class="pb-4">
                      <div>
                        {{ lineItem.description }} ({{ formatAmount(Number(lineItem.total)) }})
                      </div>
                      <div v-if="lineItem.refundEntireItemRequested" class="pt-3">
                        Entire Item: {{ formatAmount(Number(lineItem.total)) }}
                      </div>
                      <div v-else>
                        <div
                          v-for="fee in [
                            { label: 'Filing Fees', value: Number(lineItem.filingFeesRequested) || 0 },
                            { label: 'Service Fees', value: Number(lineItem.serviceFeesRequested) || 0 },
                            { label: 'Priority Fees', value: Number(lineItem.priorityFeesRequested) || 0 },
                            { label: 'Future Effective Fees', value: Number(lineItem.futureEffectiveFeesRequested) || 0 }
                          ].filter(f => f.value > 0)"
                          :key="fee.label"
                          class="pt-3"
                        >
                          {{ fee.label }}: {{ formatAmount(fee.value) }}
                        </div>
                      </div>
                    </li>
                  </ol>
              </v-col>
            </v-row>
            <v-row>
              <v-col class="col-6 col-sm-3 font-weight-bold">
                Total Refund Amount
              </v-col>
              <v-col class="col-6 col-sm-9">
                {{ formatAmount(Number(refundFormData.totalRefundAmount)) }}
              </v-col>
            </v-row>
            <v-row>
              <v-col class="col-6 col-sm-3 font-weight-bold">
                Refund Method
              </v-col>
              <v-col class="col-6 col-sm-9">
                {{ getRefundMethodText(refundMethods, refundFormData.refundMethod) }}
              </v-col>
            </v-row>
            <v-divider class="my-6"></v-divider>
            <v-row>
              <v-col class="col-6 col-sm-3 font-weight-bold">
                Notification Email
              </v-col>
              <v-col class="col-6 col-sm-9">
                {{ refundFormData.notificationEmail }}
              </v-col>
            </v-row>
            <v-row>
              <v-col class="col-6 col-sm-3 font-weight-bold">
                Reason for Refund
              </v-col>
              <v-col class="col-6 col-sm-9">
                {{ refundFormData.reasonsForRefund }}
              </v-col>
            </v-row>
            <v-row>
              <v-col class="col-6 col-sm-3 font-weight-bold">
                Staff Comment
              </v-col>
              <v-col class="col-6 col-sm-9">
                {{ refundFormData.staffComment }}
              </v-col>
            </v-row>
            <v-row>
              <v-col class="col-6 col-sm-3 font-weight-bold">
                Requested By
              </v-col>
              <v-col class="col-6 col-sm-9">
                {{ refundFormData.requestedBy }}, {{ formatUtcToPacificDate(refundFormData.requestedTime, 'MMMM DD, YYYY h:mm A') }}
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
    <v-alert v-if="message?.show"
        class="mt-4"
        border="left"
        dense
        outlined
        prominent
        shaped
        text
        :type="message?.type"
      >
        {{ message?.text }}
    </v-alert>
    <div class="d-flex justify-space-between flex-wrap">
      <v-btn
        large
        outlined
        color="primary"
        class="mt-10"
      >
        <span>Cancel</span>
      </v-btn>
      <v-btn
        large
        @click="onConfirmBtnClick()"
        color="primary"
        class="mt-10"
      >
        <span>Submit Refund Request</span>
      </v-btn>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from '@vue/composition-api'
import CommonUtils from '@/util/common-util'
import { RefundType } from '@/models/transaction-refund'
import type { RefundFormData } from '@/models/transaction-refund'
import type { Message } from '@/models/message'

export default defineComponent({
  name: 'RefundConfirmForm',
  props: {
    refundFormData: {
      type: Object as PropType<RefundFormData>,
      required: true
    },
    refundMethods: {
      type: Array as PropType<{ text: string; value: string }[]>,
      required: true,
      default: () => []
    },
    message: {
      type: Object as PropType<Message | null>,
      required: false,
      default: null
    }
  },
  setup (props, { emit }) {
    function onConfirmBtnClick () {
      emit('onProceedToConfirm')
    }

    return {
      formatAmount: CommonUtils.formatAmount,
      formatUtcToPacificDate: CommonUtils.formatUtcToPacificDate,
      onConfirmBtnClick,
      getRefundMethodText: CommonUtils.getRefundMethodText,
      RefundType
    }
  }
})
</script>

<style lang="scss" scoped>
@import '$assets/scss/theme.scss';
@import '$assets/scss/actions.scss';

.card-title {
  background-color: $app-lt-blue;
  justify-content: left;
  height: 75px;
  font-weight: bold;
  font-size: 1.125rem;
}
ol {
  padding-left: 18px !important;
}

::v-deep {
  .v-sheet--shaped .v-alert__border--left {
    border-width: 0 !important;
  }
}

</style>
