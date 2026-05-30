import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class Product extends Model {
  public id!: string;
  public empresaId!: string;
  public name!: string;
  public sku!: string;
  public price!: number;
  public categoryId!: string;
  public supplierId!: string;
  public description?: string;
  public unit!: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Product.init(
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
    sku: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    unit: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'unit',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    categoryId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    empresaId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'empresa_id',
    },
    supplierId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'products',
    indexes: [
      {
        unique: true,
        name: 'uq_products_empresa_sku',
        fields: ['empresa_id', 'sku'],
      },
    ],
  }
);

export default Product;
