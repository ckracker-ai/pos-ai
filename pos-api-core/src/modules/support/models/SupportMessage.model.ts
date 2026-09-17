import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';
import type { SupportAuthorKind } from '../supportStatus';

class SupportMessage extends Model {
  public id!: string;
  public casoId!: string;
  public authorKind!: SupportAuthorKind;
  public authorId!: string | null;
  public body!: string;
  public readonly createdAt!: Date;
}

SupportMessage.init(
  {
    id: { type: DataTypes.CHAR(36), primaryKey: true },
    casoId: { type: DataTypes.CHAR(36), allowNull: false, field: 'caso_id' },
    authorKind: {
      type: DataTypes.ENUM('USER', 'PLATFORM', 'SYSTEM', 'COPILOT'),
      allowNull: false,
      field: 'author_kind',
    },
    authorId: { type: DataTypes.CHAR(36), allowNull: true, field: 'author_id' },
    body: { type: DataTypes.TEXT, allowNull: false },
  },
  {
    sequelize,
    tableName: 'support_mensajes',
    underscored: true,
    timestamps: true,
    updatedAt: false,
  }
);

export default SupportMessage;
