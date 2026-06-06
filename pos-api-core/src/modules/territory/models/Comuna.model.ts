import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class Comuna extends Model {
  public codigoCut!: string;
  public nombre!: string;
  public regionId!: string;
  public nombreBusqueda!: string;
}

Comuna.init(
  {
    codigoCut: {
      type: DataTypes.STRING(8),
      allowNull: false,
      primaryKey: true,
      field: 'codigo_cut',
    },
    nombre: { type: DataTypes.STRING(120), allowNull: false },
    regionId: {
      type: DataTypes.STRING(5),
      allowNull: false,
      field: 'region_id',
    },
    nombreBusqueda: {
      type: DataTypes.STRING(140),
      allowNull: false,
      field: 'nombre_busqueda',
    },
  },
  {
    sequelize,
    tableName: 'comunas',
    timestamps: false,
  }
);

export default Comuna;
