import { createLocalVue, shallowMount } from '@vue/test-utils'
import Vuetify from 'vuetify'

import RefundReviewForm from '@/components/TransactionRefund/RefundReviewForm.vue'
import CommonUtils from '@/util/common-util'

describe('RefundReviewForm.vue', () => {
  const localVue = createLocalVue()
  const vuetify = new Vuetify({})

  const baseData = {
    refundType: 'Full Refund',
    totalRefundAmount: 250,
    refundMethod: 'credit-card',
    notificationEmail: 'user@example.com',
    reasonsForRefund: 'Reason',
    staffComment: 'Comment',
    requestedBy: 'Jane',
    requestedTime: new Date('2025-01-02T03:04:05Z')
  }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('renders component', () => {
    vi.spyOn(CommonUtils, 'formatUtcToPacificDate').mockReturnValue('Jan 02, 2025 3:04:05 AM')

    const wrapper = shallowMount(RefundReviewForm, {
      localVue,
      vuetify,
      propsData: {
        refundFormData: baseData,
        refundMethods: [{ text: 'Credit Card', value: 'credit-card' }]
      },
      directives: { can () { } }
    })

    expect(wrapper.findComponent(RefundReviewForm).exists()).toBe(true)
    expect(wrapper.text()).toContain('Refund Request')
    expect(wrapper.text()).toContain(baseData.refundType)
    expect(wrapper.text()).toContain('$250.00')
    expect(wrapper.text()).toContain('Credit Card')
    expect(wrapper.text()).toContain('user@example.com')
    expect(wrapper.text()).toContain('Reason')
    expect(wrapper.text()).toContain('Comment')
    expect(wrapper.text()).toContain('Jane')
    expect(wrapper.text()).toContain('Jan 02, 2025 3:04:05 AM')
  })

  it('matches snapshot', () => {
    vi.spyOn(CommonUtils, 'formatUtcToPacificDate').mockReturnValue('Jan 02, 2025 3:04:05 AM')

    const wrapper = shallowMount(RefundReviewForm, {
      localVue,
      vuetify,
      propsData: {
        refundFormData: baseData,
        refundMethods: [
          { text: 'Credit Card', value: 'credit-card' }
        ]
      },
      directives: { can () { } }
    })
    expect(wrapper.html()).toMatchSnapshot()
  })
})
