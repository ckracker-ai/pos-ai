import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

export type LegalDocType = 'TOS' | 'PRIVACY' | 'SLA' | 'AUP' | 'COOKIES';

class LegalDocument extends Model {
  public id!: string;
  public docType!: LegalDocType;
  public version!: string;
  public locale!: string;
  public title!: string;
  public contentMd!: string;
  public contentHash!: string;
  public effectiveAt!: Date;
  public isCurrent!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

LegalDocument.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true },
    docType: {
      type: DataTypes.ENUM('TOS', 'PRIVACY', 'SLA', 'AUP', 'COOKIES'),
      allowNull: false,
      field: 'doc_type',
    },
    version: { type: DataTypes.STRING(32), allowNull: false },
    locale: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'es-CL' },
    title: { type: DataTypes.STRING(200), allowNull: false },
    contentMd: { type: DataTypes.TEXT('medium'), allowNull: false, field: 'content_md' },
    contentHash: { type: DataTypes.CHAR(64), allowNull: false, field: 'content_hash' },
    effectiveAt: { type: DataTypes.DATE, allowNull: false, field: 'effective_at' },
    isCurrent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_current' },
  },
  {
    sequelize,
    tableName: 'legal_documents',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default LegalDocument;
