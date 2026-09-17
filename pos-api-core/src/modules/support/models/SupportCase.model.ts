import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';
import type { SupportCaseOrigin, SupportCaseStatus, SupportSeverity } from '../supportStatus';

class SupportCase extends Model {
  public id!: string;
  public empresaId!: string;
  public status!: SupportCaseStatus;
  public origin!: SupportCaseOrigin;
  public severity!: SupportSeverity;
  public subject!: string;
  public createdByKind!: 'USER' | 'PLATFORM' | 'SYSTEM';
  public createdById!: string | null;
  public lastMessageAt!: Date;
  public resolvedAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SupportCase.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true },
    empresaId: { type: DataTypes.CHAR(36), allowNull: false, field: 'empresa_id' },
    status: {
      type: DataTypes.ENUM('ABIERTO', 'ESPERANDO_CLIENTE', 'ESPERANDO_SOPORTE', 'RESUELTO'),
      allowNull: false,
      defaultValue: 'ABIERTO',
    },
    origin: {
      type: DataTypes.ENUM('TENANT', 'PLATFORM', 'SIGNAL', 'COPILOT'),
      allowNull: false,
      defaultValue: 'TENANT',
    },
    severity: {
      type: DataTypes.ENUM('BAJA', 'MEDIA', 'ALTA'),
      allowNull: false,
      defaultValue: 'MEDIA',
    },
    subject: { type: DataTypes.STRING(200), allowNull: false },
    createdByKind: {
      type: DataTypes.ENUM('USER', 'PLATFORM', 'SYSTEM'),
      allowNull: false,
      defaultValue: 'USER',
      field: 'created_by_kind',
    },
    createdById: { type: DataTypes.CHAR(36), allowNull: true, field: 'created_by_id' },
    lastMessageAt: { type: DataTypes.DATE, allowNull: false, field: 'last_message_at' },
    resolvedAt: { type: DataTypes.DATE, allowNull: true, field: 'resolved_at' },
  },
  {
    sequelize,
    tableName: 'support_casos',
    underscored: true,
    timestamps: true,
  }
);

export default SupportCase;
