import {
  OrgPaymentDetails
} from '@/models/Organization'

import { AxiosResponse } from 'axios'
import ConfigHelper from '@/util/config-helper'
import { axios } from '@/util/http-util'

export default class OrgService {
  static async getOrgPayments (orgId: number): Promise<AxiosResponse<OrgPaymentDetails>> {
    return axios.get(`${ConfigHelper.getPayAPIURL()}/accounts/${orgId}`)
  }
}
