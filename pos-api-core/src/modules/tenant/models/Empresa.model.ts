import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

export type EmpresaEstado = 'ACTIVO' | 'SUSPENDIDO' | 'PENDIENTE_ONBOARDING';

class Empresa extends Model {
  public id!: string;
  public rutEmpresa!: string;
  public rutNumero!: number;
  public rutDv!: string;
  public razonSocial!: string;
  public nombreFantasia?: string | null;
  public giroSii?: string | null;
  public direccionComercial?: string | null;
  public correoFacturacion?: string | null;
  public urlLogo?: string | null;
  public slug!: string;
  public estado!: EmpresaEstado;
  public planId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Empresa.init(
  {
    id: {
      type: DataTypes.CHAR(36),
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    rutEmpresa: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'rut_empresa',
    },
    rutNumero: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'rut_numero',
    },
    rutDv: {
      type: DataTypes.CHAR(1),
      allowNull: false,
      field: 'rut_dv',
    },
    razonSocial: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'razon_social',
    },
    nombreFantasia: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'nombre_fantasia',
    },
    giroSii: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'giro_sii',
    },
    direccionComercial: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'direccion_comercial',
    },
    correoFacturacion: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'correo_facturacion',
    },
    urlLogo: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'url_logo',
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    estado: {
      type: DataTypes.ENUM('ACTIVO', 'SUSPENDIDO', 'PENDIENTE_ONBOARDING'),
      allowNull: false,
      defaultValue: 'PENDIENTE_ONBOARDING',
    },
    planId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'plan_id',
    },
    assistantAdminPhone: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: 'assistant_admin_phone',
    },
    transferBankName: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: 'transfer_bank_name',
    },
    transferAccount: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: 'transfer_account',
    },
    transferRut: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'transfer_rut',
    },
    transferAccountType: {
      type: DataTypes.STRING(40),
      allowNull: true,
      field: 'transfer_account_type',
    },
    transferHolderName: {
      type: DataTypes.STRING(160),
      allowNull: true,
      field: 'transfer_holder_name',
    },
  },
  {
    sequelize,
    tableName: 'empresas',
  }
);

export default Empresa;
