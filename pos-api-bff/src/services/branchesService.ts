import { err } from '../utils/result.js';


export class BranchesService {
  async listBranches(_token: string) {
    // TODO: completar cuando api-core provea endpoints reales de sucursales.
    return err('Branches CRUD not implemented: missing api-core contract for branches endpoints', 501);
  }

  async createBranch(_input: { name: string; address?: string }, _token: string) {
    // TODO: completar cuando api-core provea endpoints reales de sucursales.
    return err('Branches CRUD not implemented: missing api-core contract for branches endpoints', 501);
  }

  async updateBranch(_id: string, _input: { name: string; address?: string }, _token: string) {
    // TODO: completar cuando api-core provea endpoints reales de sucursales.
    return err('Branches CRUD not implemented: missing api-core contract for branches endpoints', 501);
  }

  async deleteBranch(_id: string, _token: string) {
    // TODO: completar cuando api-core provea endpoints reales de sucursales.
    return err('Branches CRUD not implemented: missing api-core contract for branches endpoints', 501);
  }
}

