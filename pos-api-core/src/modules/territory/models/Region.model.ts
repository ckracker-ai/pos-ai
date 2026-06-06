import { DataTypes, Model } from 'sequelize';
import sequelize from '../../../config/database';

class Region extends Model {
  public codigoCut!: string;
  public nombre!: string;
  public sigla!: string;
  public nombreBusqueda!: string;
}

Region.init(
  {
    codigoCut: {
      type: DataTypes.STRING(5),
      allowNull: false,
      primaryKey: true,
      field: 'codigo_cut',
    },
    nombre: { type: DataTypes.STRING(120), allowNull: false },
    sigla: { type: DataTypes.STRING(12), allowNull: false },
    nombreBusqueda: {
      type: DataTypes.STRING(140),
      allowNull: false,
      field: 'nombre_busqueda',
    },
  },
  {
    sequelize,
    tableName: 'regions',
    timestamps: false,
  }
);

export default Region;
