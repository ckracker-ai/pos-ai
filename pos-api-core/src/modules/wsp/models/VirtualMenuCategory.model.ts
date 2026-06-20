import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class VirtualMenuCategory extends Model {
  public id!: string;
  public menuId!: string;
  public catalogCategoryId?: string | null;
  public name!: string;
  public description?: string | null;
  public sortOrder!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

VirtualMenuCategory.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    menuId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'menu_id',
    },
    catalogCategoryId: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      field: 'catalog_category_id',
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
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
    tableName: 'virtual_menu_categories',
  }
);

export default VirtualMenuCategory;
