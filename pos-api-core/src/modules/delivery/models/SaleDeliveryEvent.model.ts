import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class SaleDeliveryEvent extends Model {
  public id!: string;
  public saleId!: string;
  public empresaId!: string;
  public branchId!: string;
  public status!: string;
  public note?: string | null;
  public createdBy?: string | null;
  public readonly createdAt!: Date;
}

SaleDeliveryEvent.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    saleId: { type: DataTypes.CHAR(36), allowNull: false, field: 'sale_id' },
    empresaId: { type: DataTypes.CHAR(36), allowNull: false, field: 'empresa_id' },
    branchId: { type: DataTypes.CHAR(36), allowNull: false, field: 'branch_id' },
    status: { type: DataTypes.STRING(20), allowNull: false },
    note: { type: DataTypes.STRING(255), allowNull: true },
    createdBy: { type: DataTypes.CHAR(36), allowNull: true, field: 'created_by' },
    createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
  },
  {
    sequelize,
    tableName: 'sale_delivery_events',
    updatedAt: false,
  }
);

export default SaleDeliveryEvent;
