import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

export type DataSubjectRequestType = 'EXPORT' | 'DELETE' | 'RECTIFY';
export type DataSubjectRequestStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

class DataSubjectRequest extends Model {
  public id!: string;
  public empresaId!: string;
  public requestType!: DataSubjectRequestType;
  public status!: DataSubjectRequestStatus;
  public requestedBy!: string | null;
  public notes!: string | null;
  public scheduledPurgeAt!: Date | null;
  public cancelledAt!: Date | null;
  public initiatedByPlatform!: boolean;
  public readonly createdAt!: Date;
  public completedAt!: Date | null;
}

DataSubjectRequest.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true },
    empresaId: { type: DataTypes.CHAR(36), allowNull: false, field: 'empresa_id' },
    requestType: {
      type: DataTypes.ENUM('EXPORT', 'DELETE', 'RECTIFY'),
      allowNull: false,
      field: 'request_type',
    },
    status: {
      type: DataTypes.ENUM(
        'PENDING',
        'SCHEDULED',
        'IN_PROGRESS',
        'COMPLETED',
        'REJECTED',
        'CANCELLED'
      ),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    requestedBy: { type: DataTypes.CHAR(36), allowNull: true, field: 'requested_by' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    scheduledPurgeAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'scheduled_purge_at',
    },
    cancelledAt: { type: DataTypes.DATE, allowNull: true, field: 'cancelled_at' },
    initiatedByPlatform: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'initiated_by_platform',
    },
    completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
  },
  {
    sequelize,
    tableName: 'data_subject_requests',
    underscored: true,
    timestamps: true,
    updatedAt: false,
  }
);

export default DataSubjectRequest;
