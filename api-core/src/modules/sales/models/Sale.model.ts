import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class Sale extends Model {
  public id!: string;
  public branchId!: string;
  public sellerId!: string;
  public total!: number;
  public discount!: number;
  public status!: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  public notes?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Sale.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    branchId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'branch_id',
    },
    sellerId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'seller_id',
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'COMPLETED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'COMPLETED',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'sales',
    timestamps: true,
  }
);

export default Sale;
