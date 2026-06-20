import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class VirtualMenuProduct extends Model {
  public id!: string;
  public menuCategoryId!: string;
  public productId!: string;
  public displayName?: string | null;
  public description?: string | null;
  public imageUrl?: string | null;
  public priceOverride?: number | null;
  public sortOrder!: number;
  public isFeatured!: boolean;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

VirtualMenuProduct.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    menuCategoryId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'menu_category_id',
    },
    productId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'product_id',
    },
    displayName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'display_name',
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.STRING(512),
      allowNull: true,
      field: 'image_url',
    },
    priceOverride: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'price_override',
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_featured',
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
    tableName: 'virtual_menu_products',
  }
);

export default VirtualMenuProduct;
