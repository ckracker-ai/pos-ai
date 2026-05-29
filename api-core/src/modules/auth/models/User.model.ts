import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class User extends Model {
  public id!: string;
  public fullName!: string;
  public email!: string;
  public password!: string;
  public roleId!: string;
  public branchId!: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    fullName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: 'idx_user_email_unique',
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    roleId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    branchId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'users',
    defaultScope: {
      attributes: { exclude: ['password'] },
    },
    scopes: {
      withPassword: {
        attributes: { exclude: [] },
      },
    },
  }
);

export default User;
