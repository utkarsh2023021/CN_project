// This tool is illustrative; in a real deployment you'd flip bytes on wire.
// Here we just log guidance because flipping in-kernel streams isn't trivial in Node without proxies.
console.log('To demo integrity failure, add a one-line flip in server/tunnel-server.js where DATA is sent:');
console.log('  s.on(\'data\', (chunk) => { chunk[0] ^= 0xFF; mux.send(MSG.DATA, sid, chunk); });');
console.log('This will cause AEAD tag verification to fail on the client, dropping frames.');
