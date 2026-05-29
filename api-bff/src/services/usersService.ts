import { ApiCoreServiceAuth } from './apiCoreServiceAuth.js';
import { ApiCoreServiceUser } from './apiCoreServiceUser.js';
import { ok, err } from '../utils/result.js';

export class UsersService {
  private authCore = new ApiCoreServiceAuth();
  private userCore = new ApiCoreServiceUser();

  async listUsers(token: string, internalKey: string, branchId: string) {
    try {
      const data = await this.userCore.listUsers(token, internalKey, branchId);
      return ok({ data });
    } catch (error: any) {
      const statusCode = error?.response?.status ?? 502;
      const message = error?.response?.data?.error ?? 'Failed to list users';
      return err(message, statusCode);
    }
  }

  async createUser(
    fullName: string,
    email: string,
    password: string,
    roleId: string,
    branchId: string,
    _token: string,
    _internalKey: string,
    _requestBranchId: string
  ) {
    try {
      const data = await this.authCore.register(fullName, email, password, roleId, branchId);
      return ok({ data });
    } catch (error: any) {
      const statusCode = error?.response?.status ?? 502;
      const message = error?.response?.data?.error ?? 'Failed to create user';
      return err(message, statusCode);
    }
  }

  async updateUser(
    userId: string,
    fullName: string,
    email: string,
    roleId: string,
    token: string,
    internalKey: string,
    branchId: string
  ) {
    try {
      const data = await this.userCore.updateUser(
        userId,
        { fullName, email, roleId },
        token,
        internalKey,
        branchId
      );
      return ok({ data });
    } catch (error: any) {
      const statusCode = error?.response?.status ?? 502;
      const message = error?.response?.data?.error ?? 'Failed to update user';
      return err(message, statusCode);
    }
  }

  async deleteUser(userId: string, token: string, internalKey: string, branchId: string) {
    try {
      const data = await this.userCore.deleteUser(userId, token, internalKey, branchId);
      return ok({ data });
    } catch (error: any) {
      const statusCode = error?.response?.status ?? 502;
      const message = error?.response?.data?.error ?? 'Failed to delete user';
      return err(message, statusCode);
    }
  }
}
