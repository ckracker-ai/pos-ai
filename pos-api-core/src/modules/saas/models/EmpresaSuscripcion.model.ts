import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

export type SuscripcionEstado = 'ACTIVA' | 'GRACIA' | 'VENCIDA' | 'CANCELADA' | 'PILOTO';
export type SuscripcionOrigen = 'PLATAFORMA' | 'CHECKOUT' | 'COMERCIAL';
export type SuscripcionPeriodo = 'MENSUAL' | 'ANUAL';

class EmpresaSuscripcion extends Model {
  public id!: string;
  public empresaId!: string;
  public planId!: string;
  public estado!: SuscripcionEstado;
  public origen!: SuscripcionOrigen;
  public periodo!: SuscripcionPeriodo;
  public inicioEn!: Date;
  public proximoCobroEn?: Date | null;
  public venceEn?: Date | null;
  public graceHasta?: Date | null;
  public notas?: string | null;
  public externalCustomerId?: string | null;
  public externalSubscriptionId?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

EmpresaSuscripcion.init(
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
    planId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'plan_id',
    },
    estado: {
      type: DataTypes.ENUM('ACTIVA', 'GRACIA', 'VENCIDA', 'CANCELADA', 'PILOTO'),
      allowNull: false,
      defaultValue: 'PILOTO',
    },
    origen: {
      type: DataTypes.ENUM('PLATAFORMA', 'CHECKOUT', 'COMERCIAL'),
      allowNull: false,
      defaultValue: 'PLATAFORMA',
    },
    periodo: {
      type: DataTypes.ENUM('MENSUAL', 'ANUAL'),
      allowNull: false,
      defaultValue: 'MENSUAL',
    },
    inicioEn: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'inicio_en',
    },
    proximoCobroEn: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'proximo_cobro_en',
    },
    venceEn: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'vence_en',
    },
    graceHasta: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'grace_hasta',
    },
    notas: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    externalCustomerId: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: 'external_customer_id',
    },
    externalSubscriptionId: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: 'external_subscription_id',
    },
  },
  {
    sequelize,
    tableName: 'empresa_suscripciones',
  }
);

export default EmpresaSuscripcion;
