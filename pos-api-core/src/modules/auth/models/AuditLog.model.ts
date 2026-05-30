import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class AuditLog extends Model {
  public id!: string;
  public userId!: string;
  public action!: string;
  public resource!: string;
  public resourceId!: string;
  public details!: string;
  public ipAddress?: string;
  public userAgent?: string;
  public readonly createdAt!: Date;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    resource: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    resourceId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'audit_logs',
  }
);

export default AuditLog;
