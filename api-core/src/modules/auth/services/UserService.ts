import User from '../models/User.model';

export interface CreateUserData {
  id?: string;
  fullName: string;
  email: string;
  password: string;
  roleId: string;
  branchId: string;
  isActive: boolean;
}


class UserService {
  async findByEmailWithPassword(email: string) {
    
    return User.unscoped().findOne({ where: { email } }) ;
  }

  async findById(id: string) {
    return User.findByPk(id);
  }

  async createUser(data: CreateUserData) {
    return User.create(data as any);
  }

  async deactivateUser(user: User) {
    return user.update({ isActive: false });
  }
}

export default new UserService();
