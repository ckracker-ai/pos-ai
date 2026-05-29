import { Model } from 'sequelize';

/** Lee un atributo del modelo evitando shadowing de class fields de Sequelize. */
export function readModelString(model: Model, attr: string): string {
  const fromData = model.getDataValue(attr);
  if (fromData !== undefined && fromData !== null && String(fromData).trim()) {
    return String(fromData);
  }

  const plain =
    typeof model.toJSON === 'function'
      ? (model.toJSON() as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  const snake = attr.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  for (const key of [attr, snake]) {
    const value = plain[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value);
    }
  }

  return '';
}
