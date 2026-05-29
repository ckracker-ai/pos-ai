import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class Supplier extends Model {
  public id!: string;
  public name!: string;
  public contactEmail?: string;
  public contactPhone?: string;
  public address?: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Supplier.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    contactEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    contactPhone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'suppliers',
  }
);

export default Supplier;
