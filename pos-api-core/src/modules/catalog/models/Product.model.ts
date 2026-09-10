import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class Product extends Model {
  public id!: string;
  public empresaId!: string;
  public name!: string;
  public sku!: string;
  public barcode?: string | null;
  public price!: number;
  public categoryId!: string;
  public supplierId!: string;
  public parentProductId?: string | null;
  public description?: string;
  public unit!: string;
  public variantSize?: string | null;
  public variantColor?: string | null;
  public packQty!: number;
  public sizeMm?: number | null;
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
    barcode: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    parentProductId: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      field: 'parent_product_id',
    },
    variantSize: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'variant_size',
    },
    variantColor: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'variant_color',
    },
    packQty: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      defaultValue: 1,
      field: 'pack_qty',
    },
    sizeMm: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: true,
      field: 'size_mm',
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
