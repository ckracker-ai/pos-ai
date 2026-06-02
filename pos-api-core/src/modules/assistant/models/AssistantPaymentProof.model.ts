import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

export type PaymentProofStatus = 'RECEIVED' | 'NOTIFIED_ADMIN' | 'ADMIN_CONFIRMED' | 'REJECTED';

class AssistantPaymentProof extends Model {
  public id!: string;
  public empresaId!: string;
  public saleId!: string;
  public clientPhone!: string;
  public expectedTotal!: number;
  public detectedAmount?: number | null;
  public aiMatch!: boolean;
  public visionSummary?: string | null;
  public proofImageMime?: string | null;
  public proofImageData?: string | null;
  public status!: PaymentProofStatus;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AssistantPaymentProof.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      primaryKey: true,
    },
    empresaId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'empresa_id',
    },
    saleId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'sale_id',
    },
    clientPhone: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: 'client_phone',
    },
    expectedTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'expected_total',
    },
    detectedAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'detected_amount',
    },
    aiMatch: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'ai_match',
    },
    visionSummary: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'vision_summary',
    },
    proofImageMime: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'proof_image_mime',
    },
    proofImageData: {
      type: DataTypes.TEXT('medium'),
      allowNull: true,
      field: 'proof_image_data',
    },
    status: {
      type: DataTypes.ENUM('RECEIVED', 'NOTIFIED_ADMIN', 'ADMIN_CONFIRMED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'RECEIVED',
    },
  },
  {
    sequelize,
    tableName: 'assistant_payment_proofs',
  }
);

export default AssistantPaymentProof;
