import { v4 as uuidv4 } from 'uuid';

import Role from '../modules/auth/models/Role.model';

const DEFAULT_ROLES: ReadonlyArray<{ name: string; description: string }> = [
  { name: 'ADMIN', description: 'Administrador del sistema' },
  { name: 'AUDITOR', description: 'Auditoría y gestión de usuarios' },
  { name: 'SELLER', description: 'Vendedor / operación de sucursal' },
  { name: 'COMANDA', description: 'Usuario para ver comandas en el frontend' },
];

export async function seedRoles(): Promise<void> {
  for (const role of DEFAULT_ROLES) {
    const [, created] = await Role.findOrCreate({
      where: { name: role.name },
      defaults: {
        id: uuidv4(),
        name: role.name,
        description: role.description,
      },
    });

    if (created) {
      console.log(`✅  Role seeded: ${role.name}`);
    }
  }
}
