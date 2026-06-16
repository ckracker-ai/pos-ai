import { Op } from 'sequelize';
import User from '../../auth/models/User.model';
import Empresa from '../../tenant/models/Empresa.model';
import DataSubjectRequest from '../../legal/models/DataSubjectRequest.model';
import LegalAcceptance from '../../legal/models/LegalAcceptance.model';
import PaymentEvent from '../../payments/models/PaymentEvent.model';
import PaymentSession from '../../payments/models/PaymentSession.model';
import { invalidateAuthUserCache } from '../../../lib/authUserCache';
import { Result, ok, fail } from '../../../types/result';

/** Elimina datos del tenant en BD (tablas sin FK CASCADE hacia empresas + fila empresa). */
class TenantPurgeDelegate {
  async purgeEmpresa(empresaId: string): Promise<Result<{ purged: true }>> {
    const empresa = await Empresa.findByPk(empresaId, { attributes: ['id'] });
    if (!empresa) return fail('EMPRESA_NOT_FOUND');

    const sequelize = Empresa.sequelize;
    if (!sequelize) return fail('DB_UNAVAILABLE');

    const userRows = await User.findAll({
      where: { empresaId },
      attributes: ['id'],
    });
    const userIds = userRows.map((u) => String(u.id));

    await sequelize.transaction(async (transaction) => {
      if (userIds.length > 0) {
        await LegalAcceptance.destroy({
          where: { userId: { [Op.in]: userIds } },
          transaction,
        });
        for (const userId of userIds) {
          await invalidateAuthUserCache(userId);
        }
      }

      await DataSubjectRequest.destroy({ where: { empresaId }, transaction });
      await PaymentEvent.destroy({ where: { empresaId }, transaction });
      await PaymentSession.destroy({ where: { empresaId }, transaction });

      const deleted = await Empresa.destroy({ where: { id: empresaId }, transaction });
      if (deleted === 0) {
        throw new Error('EMPRESA_NOT_FOUND');
      }
    });

    return ok({ purged: true });
  }
}

const tenantPurgeDelegate = new TenantPurgeDelegate();
export default tenantPurgeDelegate;
