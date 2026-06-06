import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class Category extends Model {
  public id!: string;
  public empresaId!: string;
  public parentId?: string | null;
  public name!: string;
  public slug!: string;
  public description?: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Category.init(
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
    parentId: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      field: 'parent_id',
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'categories',
    indexes: [
      {
        unique: true,
        name: 'uq_categories_empresa_name',
        fields: ['empresa_id', 'name'],
      },
      {
        unique: true,
        name: 'uq_categories_empresa_slug',
        fields: ['empresa_id', 'slug'],
      },
      {
        name: 'idx_categories_empresa_parent',
        fields: ['empresa_id', 'parent_id'],
      },
    ],
  }
);

export default Category;
