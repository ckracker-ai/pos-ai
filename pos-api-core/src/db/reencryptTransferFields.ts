import 'dotenv/config';
import sequelize from '../config/database';
import Empresa from '../modules/tenant/models/Empresa.model';
import { encryptField, decryptField } from '../utils/cryptoField';

const TRANSFER_KEYS = [
  'transferBankName',
  'transferAccountType',
  'transferAccount',
  'transferHolderName',
  'transferRut',
] as const;

const ENCRYPTED_PREFIX = 'enc:v1:';

function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX);
}

async function run(): Promise<void> {
  await sequelize.authenticate();

  const empresas = await Empresa.findAll();
  let updatedRows = 0;
  let scannedRows = 0;

  for (const empresa of empresas) {
    scannedRows += 1;
    const patch: Record<string, string | null> = {};

    for (const key of TRANSFER_KEYS) {
      const current = String(empresa.getDataValue(key) ?? '').trim() || null;
      if (!current) continue;

      if (isEncrypted(current)) {
        // Smoke-check de integridad; si no desencripta, dejamos registro.
        const test = decryptField(current);
        if (test == null) {
          console.warn(`⚠️  ${empresa.getDataValue('id')} -> ${key} no pudo desencriptarse`);
        }
        continue;
      }

      patch[key] = encryptField(current);
    }

    if (Object.keys(patch).length > 0) {
      await empresa.update(patch);
      updatedRows += 1;
    }
  }

  console.log(
    `✅ Recifrado finalizado. empresas_scan=${scannedRows} empresas_actualizadas=${updatedRows}`
  );

  await sequelize.close();
}

run().catch(async (error) => {
  console.error('❌ Error en recifrado de transferencia:', error);
  try {
    await sequelize.close();
  } catch {
    // ignore
  }
  process.exit(1);
});

