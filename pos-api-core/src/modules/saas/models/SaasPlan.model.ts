import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';
import type { SaasPlanCodigo, SaasPlanFeatures } from '../constants/planCodes';
import type { SaasMetodoPago } from '../constants/metodoPago';

class SaasPlan extends Model {
  public id!: string;
  public codigo!: SaasPlanCodigo;
  public nombre!: string;
  public descripcion?: string | null;
  public valor!: number;
  public metodoPago!: SaasMetodoPago;
  public maxSucursales!: number;
  public maxUsuarios!: number;
  public features!: SaasPlanFeatures;
  public orden!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SaasPlan.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      primaryKey: true,
    },
    codigo: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
    },
    nombre: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    valor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    metodoPago: {
      type: DataTypes.ENUM('TRANSFERENCIA', 'WEBPAY', 'MERCADO_PAGO', 'FLOW', 'MIXTO'),
      allowNull: false,
      defaultValue: 'TRANSFERENCIA',
      field: 'metodo_pago',
    },
    maxSucursales: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'max_sucursales',
    },
    maxUsuarios: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      field: 'max_usuarios',
    },
    features: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    tableName: 'saas_planes',
  }
);

export default SaasPlan;
