import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class VirtualMenu extends Model {
  public id!: string;
  public empresaId!: string;
  public branchId!: string;
  public title!: string;
  public subtitle?: string | null;
  public publicSlug!: string;
  public isEnabled!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

VirtualMenu.init(
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
    branchId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'branch_id',
    },
    title: {
      type: DataTypes.STRING(120),
      allowNull: false,
      defaultValue: 'Menú',
    },
    subtitle: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    publicSlug: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: 'public_slug',
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_enabled',
    },
  },
  {
    sequelize,
    tableName: 'virtual_menus',
  }
);

export default VirtualMenu;
