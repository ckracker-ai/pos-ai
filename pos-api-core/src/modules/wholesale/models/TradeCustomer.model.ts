import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class TradeCustomer extends Model {
  public id!: string;
  public empresaId!: string;
  public name!: string;
  public rut?: string | null;
  public creditLimit!: number;
  public creditUsed!: number;
  public isOverdue!: boolean;
  public isActive!: boolean;
  public notes?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

TradeCustomer.init(
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
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    rut: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    creditLimit: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'credit_limit',
    },
    creditUsed: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'credit_used',
    },
    isOverdue: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_overdue',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    notes: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'trade_customers',
  }
);

export default TradeCustomer;
