import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class InventoryStock extends Model {
  public id!: string;
  public productId!: string;
  public branchId!: string;
  public quantity!: number;
  public minStock!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

InventoryStock.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'product_id',
    },
    branchId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'branch_id',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    minStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'min_stock',
    },
  },
  {
    sequelize,
    tableName: 'inventory_stock',
  }
);

export default InventoryStock;
