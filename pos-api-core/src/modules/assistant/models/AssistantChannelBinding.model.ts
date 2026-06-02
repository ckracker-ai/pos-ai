import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

export type AssistantChannel = 'WHATSAPP' | 'VOZ';

class AssistantChannelBinding extends Model {
  public id!: string;
  public empresaId!: string;
  public channel!: AssistantChannel;
  public externalId!: string;
  public defaultBranchId?: string | null;
  public sessionBranchId?: string | null;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AssistantChannelBinding.init(
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
    channel: {
      type: DataTypes.ENUM('WHATSAPP', 'VOZ'),
      allowNull: false,
      defaultValue: 'WHATSAPP',
    },
    externalId: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: 'external_id',
    },
    defaultBranchId: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      field: 'default_branch_id',
    },
    sessionBranchId: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      field: 'session_branch_id',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
  },
  {
    sequelize,
    tableName: 'assistant_channel_bindings',
  }
);

export default AssistantChannelBinding;
