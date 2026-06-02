import { ApiCoreBaseService } from './apiCoreBaseService.js';

export class ApiCoreServicePaymentProof extends ApiCoreBaseService {
  async listProofs(token: string, internalKey: string, branchId: string, status: string) {
    const response = await this.client.get('/payment-proofs', {
      headers: this.authHeaders(token, internalKey, branchId),
      params: { status },
    });
    return response.data;
  }

  async consolidateDuplicates(token: string, internalKey: string, branchId: string) {
    const response = await this.client.post(
      '/payment-proofs/consolidate-duplicates',
      {},
      { headers: this.authHeaders(token, internalKey, branchId) }
    );
    return response.data;
  }

  async confirmProof(proofId: string, token: string, internalKey: string, branchId: string) {
    const response = await this.client.post(
      `/payment-proofs/${proofId}/confirm`,
      {},
      { headers: this.authHeaders(token, internalKey, branchId) }
    );
    return response.data;
  }

  async getProofImage(proofId: string, token: string, internalKey: string, branchId: string) {
    const response = await this.client.get(`/payment-proofs/${proofId}/image`, {
      headers: this.authHeaders(token, internalKey, branchId),
    });
    return response.data;
  }

  async rejectProof(
    proofId: string,
    note: string | undefined,
    token: string,
    internalKey: string,
    branchId: string
  ) {
    const response = await this.client.post(
      `/payment-proofs/${proofId}/reject`,
      { note: note ?? null },
      { headers: this.authHeaders(token, internalKey, branchId) }
    );
    return response.data;
  }
}
