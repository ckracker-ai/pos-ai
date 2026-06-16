import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

export type PaymentSessionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

class PaymentSession extends Model {
  public id!: string;
  public provider!: string;
  public externalId!: string;
  public kind!: string;
  public status!: PaymentSessionStatus;
  public amount!: number;
  public currency!: string;
  public empresaId!: string;
  public saleId?: string | null;
  public tbkToken?: string | null;
  public stockReserved!: boolean;
  public expiresAt!: Date;
  public committedAt?: Date | null;
  public resultJson?: Record<string, unknown> | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PaymentSession.init(
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
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'),
      allowNull: false,
    },
    amount: { type: DataTypes.INTEGER, allowNull: false },
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
    tbkToken: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'tbk_token',
    },
    stockReserved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'stock_reserved',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    committedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'committed_at',
    },
    resultJson: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'result_json',
    },
  },
  {
    sequelize,
    tableName: 'payment_sessions',
    indexes: [
      {
        unique: true,
        name: 'uq_payment_sessions_provider_external',
        fields: ['provider', 'external_id'],
      },
    ],
  }
);

export default PaymentSession;
