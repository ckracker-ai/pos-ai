import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

export type LegalAcceptanceChannel = 'REGISTRO' | 'CHECKOUT' | 'LOGIN_REAUTH' | 'ADMIN_IMPORT';

class LegalAcceptance extends Model {
  public id!: string;
  public userId!: string | null;
  public empresaId!: string | null;
  public documentId!: string;
  public documentVersion!: string;
  public contentHash!: string;
  public ipAddress!: string | null;
  public userAgent!: string | null;
  public acceptanceChannel!: LegalAcceptanceChannel;
  public acceptedAt!: Date;
}

LegalAcceptance.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true },
    userId: { type: DataTypes.CHAR(36), allowNull: true, field: 'user_id' },
    empresaId: { type: DataTypes.CHAR(36), allowNull: true, field: 'empresa_id' },
    documentId: { type: DataTypes.CHAR(36), allowNull: false, field: 'document_id' },
    documentVersion: { type: DataTypes.STRING(32), allowNull: false, field: 'document_version' },
    contentHash: { type: DataTypes.CHAR(64), allowNull: false, field: 'content_hash' },
    ipAddress: { type: DataTypes.STRING(45), allowNull: true, field: 'ip_address' },
    userAgent: { type: DataTypes.STRING(512), allowNull: true, field: 'user_agent' },
    acceptanceChannel: {
      type: DataTypes.ENUM('REGISTRO', 'CHECKOUT', 'LOGIN_REAUTH', 'ADMIN_IMPORT'),
      allowNull: false,
      field: 'acceptance_channel',
    },
    acceptedAt: { type: DataTypes.DATE, allowNull: false, field: 'accepted_at' },
  },
  {
    sequelize,
    tableName: 'legal_acceptances',
    underscored: true,
    timestamps: false,
  }
);

export default LegalAcceptance;
