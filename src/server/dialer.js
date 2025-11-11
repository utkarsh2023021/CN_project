import net from 'net';

export function dial(host, port) {
  const s = net.connect({ host, port });
  return s;
}
