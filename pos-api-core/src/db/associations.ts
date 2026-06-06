import Role from '../modules/auth/models/Role.model';
import User from '../modules/auth/models/User.model';
import Category from '../modules/catalog/models/Category.model';
import Supplier from '../modules/catalog/models/Supplier.model';
import Product from '../modules/catalog/models/Product.model';
import Branch from '../modules/branch/models/Branch.model';
import InventoryStock from '../modules/inventory/models/InventoryStock.model';
import Shrinkage from '../modules/shrinkage/models/Shrinkage.model';
import Sale from '../modules/sales/models/Sale.model';
import SaleDetail from '../modules/sales/models/SaleDetail.model';
import Empresa from '../modules/tenant/models/Empresa.model';
import SaasPlan from '../modules/saas/models/SaasPlan.model';
import AssistantChannelBinding from '../modules/assistant/models/AssistantChannelBinding.model';
import EmpresaSuscripcion from '../modules/saas/models/EmpresaSuscripcion.model';
import Region from '../modules/territory/models/Region.model';
import Comuna from '../modules/territory/models/Comuna.model';
import SaleDeliveryEvent from '../modules/delivery/models/SaleDeliveryEvent.model';
import LegalDocument from '../modules/legal/models/LegalDocument.model';
import LegalAcceptance from '../modules/legal/models/LegalAcceptance.model';

export function defineAssociations(): void {
  LegalDocument.hasMany(LegalAcceptance, { foreignKey: 'documentId', as: 'acceptances' });
  LegalAcceptance.belongsTo(LegalDocument, { foreignKey: 'documentId', as: 'document' });
  SaasPlan.hasMany(Empresa, { foreignKey: 'planId', as: 'empresas' });
  Empresa.belongsTo(SaasPlan, { foreignKey: 'planId', as: 'plan' });

  Empresa.hasOne(EmpresaSuscripcion, { foreignKey: 'empresaId', as: 'suscripcion' });
  EmpresaSuscripcion.belongsTo(Empresa, { foreignKey: 'empresaId', as: 'empresa' });
  EmpresaSuscripcion.belongsTo(SaasPlan, { foreignKey: 'planId', as: 'plan' });

  Empresa.hasMany(AssistantChannelBinding, { foreignKey: 'empresaId', as: 'assistantBindings' });
  AssistantChannelBinding.belongsTo(Empresa, { foreignKey: 'empresaId', as: 'empresa' });

  Region.hasMany(Comuna, { foreignKey: 'regionId', sourceKey: 'codigoCut', as: 'comunas' });
  Comuna.belongsTo(Region, { foreignKey: 'regionId', targetKey: 'codigoCut', as: 'region' });

  Comuna.hasMany(Branch, { foreignKey: 'comunaId', sourceKey: 'codigoCut', as: 'branches' });
  Branch.belongsTo(Comuna, { foreignKey: 'comunaId', targetKey: 'codigoCut', as: 'comuna' });

  Empresa.hasMany(Branch, { foreignKey: 'empresaId', as: 'branches' });
  Branch.belongsTo(Empresa, { foreignKey: 'empresaId', as: 'empresa' });

  Empresa.hasMany(User, { foreignKey: 'empresaId', as: 'users' });
  User.belongsTo(Empresa, { foreignKey: 'empresaId', as: 'empresa' });

  Empresa.hasMany(Category, { foreignKey: 'empresaId', as: 'categories' });
  Category.belongsTo(Empresa, { foreignKey: 'empresaId', as: 'empresa' });
  Category.hasMany(Category, { foreignKey: 'parentId', as: 'children' });
  Category.belongsTo(Category, { foreignKey: 'parentId', as: 'parent' });

  Empresa.hasMany(Supplier, { foreignKey: 'empresaId', as: 'suppliers' });
  Supplier.belongsTo(Empresa, { foreignKey: 'empresaId', as: 'empresa' });

  Empresa.hasMany(Product, { foreignKey: 'empresaId', as: 'products' });
  Product.belongsTo(Empresa, { foreignKey: 'empresaId', as: 'empresa' });

  Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });
  User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

  Branch.hasMany(User, { foreignKey: 'branchId', as: 'users' });
  User.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });

  Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
  Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

  Supplier.hasMany(Product, { foreignKey: 'supplierId', as: 'products' });
  Product.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });

  Product.hasMany(InventoryStock, { foreignKey: 'productId', as: 'stockEntries' });
  InventoryStock.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

  Branch.hasMany(InventoryStock, { foreignKey: 'branchId', as: 'stockEntries' });
  InventoryStock.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });

  Product.hasMany(Shrinkage, { foreignKey: 'productId', as: 'shrinkages' });
  Shrinkage.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

  Branch.hasMany(Shrinkage, { foreignKey: 'branchId', as: 'shrinkages' });
  Shrinkage.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });

  User.hasMany(Shrinkage, { foreignKey: 'reportedBy', as: 'reportedShrinkages' });
  Shrinkage.belongsTo(User, { foreignKey: 'reportedBy', as: 'reporter' });

  User.hasMany(Shrinkage, { foreignKey: 'approvedBy', as: 'approvedShrinkages' });
  Shrinkage.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

  Branch.hasMany(Sale, { foreignKey: 'branchId', as: 'sales' });
  Sale.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });

  User.hasMany(Sale, { foreignKey: 'sellerId', as: 'sales' });
  Sale.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });

  Sale.hasMany(SaleDetail, { foreignKey: 'saleId', as: 'details', onDelete: 'CASCADE' });
  SaleDetail.belongsTo(Sale, { foreignKey: 'saleId', as: 'sale' });

  Sale.hasMany(SaleDeliveryEvent, { foreignKey: 'saleId', as: 'deliveryEvents' });
  SaleDeliveryEvent.belongsTo(Sale, { foreignKey: 'saleId', as: 'sale' });

  Product.hasMany(SaleDetail, { foreignKey: 'productId', as: 'saleDetails' });
  SaleDetail.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
}
