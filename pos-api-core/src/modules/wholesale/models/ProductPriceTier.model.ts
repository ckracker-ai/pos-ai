import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class ProductPriceTier extends Model {
  public id!: string;
  public empresaId!: string;
  public productId!: string;
  public minQty!: number;
  public unitPrice!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ProductPriceTier.init(
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
    productId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'product_id',
    },
    minQty: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      field: 'min_qty',
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'unit_price',
    },
  },
  {
    sequelize,
    tableName: 'product_price_tiers',
  }
);

export default ProductPriceTier;
