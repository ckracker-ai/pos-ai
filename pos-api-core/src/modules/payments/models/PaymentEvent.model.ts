import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class PaymentEvent extends Model {
  public id!: string;
  public provider!: string;
  public externalId!: string;
  public kind!: string;
  public status!: string;
  public amount!: number;
  public currency!: string;
  public empresaId!: string;
  public saleId?: string | null;
  public resultCode?: string | null;
  public resultJson?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PaymentEvent.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    provider: { type: DataTypes.STRING(40), allowNull: false },
    externalId: {
      type: DataTypes.STRING(120),
      allowNull: false,
      field: 'external_id',
    },
    kind: { type: DataTypes.STRING(20), allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false },
    amount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'CLP' },
    empresaId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'empresa_id',
    },
    saleId: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      field: 'sale_id',
    },
    resultCode: {
      type: DataTypes.STRING(40),
      allowNull: true,
      field: 'result_code',
    },
    resultJson: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'result_json',
    },
  },
  {
    sequelize,
    tableName: 'payment_events',
    indexes: [
      {
        unique: true,
        name: 'uq_payment_events_provider_external',
        fields: ['provider', 'external_id'],
      },
    ],
  }
);

export default PaymentEvent;
