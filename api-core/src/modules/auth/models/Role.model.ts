import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class Role extends Model {
  public id!: string;
  public name!: string;
  public description?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Role.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: DataTypes.ENUM('ADMIN', 'AUDITOR', 'SELLER', 'COMANDA'),
      allowNull: false,
      unique: 'uq_role_name',
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'roles',
  }
);

export default Role;
