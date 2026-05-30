import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class SaleDetail extends Model {
  public id!: string;
  public saleId!: string;
  public productId!: string;
  public quantity!: number;
  public unitPrice!: number;
  public subtotal!: number;
  public readonly createdAt!: Date;
}

SaleDetail.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    saleId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'sale_id',
    },
    productId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'product_id',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'unit_price',
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'sale_details',
    updatedAt: false,
  }
);

export default SaleDetail;
