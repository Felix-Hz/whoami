interface HeadMeta {
  title: string;
  description: string;
  url: string;
  image?: string;
}

let current: HeadMeta | null = null;

export function collectHead(meta: HeadMeta): void {
  current = meta;
}

export function flushHead(): HeadMeta | null {
  const result = current;
  current = null;
  return result;
}
