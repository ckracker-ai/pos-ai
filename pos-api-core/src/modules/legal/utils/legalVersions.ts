export type LegalVersionPair = {
  termsVersion: string;
  privacyVersion: string;
};

export function versionsMatchCurrent(
  input: LegalVersionPair,
  current: { tosVersion: string; privacyVersion: string }
): boolean {
  return (
    input.termsVersion === current.tosVersion && input.privacyVersion === current.privacyVersion
  );
}
