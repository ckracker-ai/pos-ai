import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class Sale extends Model {
  public id!: string;
  public empresaId!: string;
  public branchId!: string;
  public sellerId!: string;
  public total!: number;
  public discount!: number;
  public status!: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  public requiresDelivery!: boolean;
  public deliveryCustomerName?: string | null;
  public deliveryPhone?: string | null;
  public deliveryAddress?: string | null;
  public deliveryAmount!: number;
  public deliveryStatus?: string | null;
  public assignedDriverId?: string | null;
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
    empresaId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'empresa_id',
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
    requiresDelivery: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'requires_delivery',
    },
    deliveryCustomerName: {
      type: DataTypes.STRING(160),
      allowNull: true,
      field: 'delivery_customer_name',
    },
    deliveryPhone: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'delivery_phone',
    },
    deliveryAddress: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'delivery_address',
    },
    deliveryAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'delivery_amount',
    },
    deliveryStatus: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'delivery_status',
    },
    assignedDriverId: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      field: 'assigned_driver_id',
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
