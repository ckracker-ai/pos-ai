import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class Branch extends Model {
  public id!: string;
  public empresaId!: string;
  public name!: string;
  public address?: string;
  public comunaId?: string | null;
  public codigoPostal?: string | null;
  public phone?: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Branch.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    empresaId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'empresa_id',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    comunaId: {
      type: DataTypes.STRING(8),
      allowNull: true,
      field: 'comuna_id',
    },
    codigoPostal: {
      type: DataTypes.STRING(7),
      allowNull: true,
      field: 'codigo_postal',
    },
    phone: {
      type: DataTypes.STRING(50),
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
    tableName: 'branches',
  }
);

export default Branch;
