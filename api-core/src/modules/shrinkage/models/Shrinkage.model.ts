import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class Shrinkage extends Model {
  public id!: string;
  public empresaId!: string;
  public productId!: string;
  public branchId!: string;
  public reportedBy!: string;
  public approvedBy?: string | null;
  public status!: 'PENDING' | 'APPROVED' | 'REJECTED';
  public quantity!: number;
  public reason!: string;
  public imageUrl?: string;
  public rejectionNote?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Shrinkage.init(
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
    productId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    branchId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    reportedBy: {
      type: DataTypes.CHAR(36),
      allowNull: false,
    },
    approvedBy: {
      type: DataTypes.CHAR(36),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    rejectionNote: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'shrinkages',
  }
);

export default Shrinkage;
