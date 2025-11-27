export function pickRandomPrompt(list?: string[]) {
  if (!list?.length) return 'Empty JSON';
  const i = Math.floor(Math.random() * list.length);
  return list[i];
}
