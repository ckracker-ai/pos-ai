export type Ok<T> = { success: true; value: T; error?: never };
export type Fail<E> = { success: false; error: E; value?: never };

export type Result<T, E = string> = Ok<T> | Fail<E>;

export const ok = <T>(value: T): Ok<T> => ({ success: true, value });

export const fail = <E = string>(error: E): Fail<E> => ({ success: false, error });

export const isOk = <T, E>(r: Result<T, E>): r is Ok<T> => r.success === true;
export const isFail = <T, E>(r: Result<T, E>): r is Fail<E> => r.success === false;
