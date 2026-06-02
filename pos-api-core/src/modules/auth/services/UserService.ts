import User from '../models/User.model';

export interface CreateUserData {
  id?: string;
  empresaId: string;
  fullName: string;
  email: string;
  password: string;
  roleId: string;
  branchId: string;
  isActive: boolean;
  whatsappPhone?: string | null;
}

class UserService {
  async findByEmailWithPassword(email: string) {
    return User.unscoped().findOne({ where: { email } });
  }

  async findByEmailInEmpresa(email: string, empresaId: string) {
    return User.unscoped().findOne({ where: { email, empresaId } });
  }

  async findById(id: string) {
    return User.findByPk(id);
  }

  async findByIdInEmpresa(id: string, empresaId: string) {
    return User.findOne({ where: { id, empresaId } });
  }

  async createUser(data: CreateUserData) {
    return User.create(data as never);
  }

  async deactivateUser(user: User) {
    return user.update({ isActive: false });
  }
}

export default new UserService();
