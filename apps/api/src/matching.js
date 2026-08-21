export function identifierRegex(identifier) {
  const clean = String(identifier || '').trim();
  if (!clean) throw new Error('A registration number is required');
  return new RegExp(`(?<![A-Za-z0-9_])${clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9_])`, 'i');
}
export function findIdentifier(text, identifier) {
  const match = identifierRegex(identifier).exec(String(text || ''));
  return match ? { value: match[0], index: match.index } : null;
}
