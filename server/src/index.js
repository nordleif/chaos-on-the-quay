// Room relay for Chaos on the Quay.
// One Durable Object per room. It tracks who is connected, picks the host
// (the browser that runs creatures and waves) and forwards game messages.
import { DurableObject } from 'cloudflare:workers';

const MAX_PLAYERS = 8;
const MAX_MSG = 16384;
const MODES = ['coop', 'pvp'];

export class Room extends DurableObject {
  async fetch(req) {
    const url = new URL(req.url);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const live = this.sockets();

    if (live.length >= MAX_PLAYERS) {
      server.accept();
      server.send(JSON.stringify({ t: 'full' }));
      server.close(4001, 'full');
      return new Response(null, { status: 101, webSocket: client });
    }

    if (!live.length) await this.ctx.storage.deleteAll();
    let mode = await this.ctx.storage.get('mode');
    if (!mode) {
      mode = MODES.includes(url.searchParams.get('mode')) ? url.searchParams.get('mode') : 'coop';
      await this.ctx.storage.put('mode', mode);
    }
    const seq = ((await this.ctx.storage.get('seq')) || 0) + 1;
    await this.ctx.storage.put('seq', seq);

    const used = new Set(live.map(ws => ws.deserializeAttachment().col));
    let col = 0;
    while (used.has(col) && col < MAX_PLAYERS) col++;
    const name = (url.searchParams.get('name') || 'SPILLER').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 12) || 'SPILLER';
    const me = { id: 'p' + seq, name, col, joined: seq, vis: true };

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(me);

    const peers = live.map(ws => {
      const a = ws.deserializeAttachment();
      return { id: a.id, name: a.name, col: a.col };
    });
    const host = await this.pickHost();
    server.send(JSON.stringify({ t: 'hi', id: me.id, mode, host, peers, col }));
    this.broadcast({ t: 'join', id: me.id, name, col }, server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, data) {
    if (typeof data !== 'string' || data.length > MAX_MSG) return;
    let m;
    try { m = JSON.parse(data); } catch { return; }
    if (!m || typeof m.t !== 'string') return;
    const me = ws.deserializeAttachment();

    if (m.t === 'vis') {
      me.vis = !!m.v;
      ws.serializeAttachment(me);
      await this.pickHost();
      return;
    }

    m.f = me.id;
    const out = JSON.stringify(m);
    if (m.to) {
      for (const s of this.sockets()) if (s.deserializeAttachment().id === m.to) { s.send(out); break; }
    } else {
      for (const s of this.sockets()) if (s !== ws) s.send(out);
    }
  }

  async webSocketClose(ws) { await this.gone(ws); }
  async webSocketError(ws) { await this.gone(ws); }

  async gone(ws) {
    const me = ws.deserializeAttachment();
    if (!me) return;
    try { ws.close(1000, 'bye'); } catch {}
    this.broadcast({ t: 'leave', id: me.id }, ws);
    if (!this.sockets(ws).length) { await this.ctx.storage.deleteAll(); return; }
    await this.pickHost(ws);
  }

  sockets(except) {
    return this.ctx.getWebSockets().filter(s => s !== except && s.readyState === 1 && s.deserializeAttachment());
  }

  broadcast(msg, except) {
    const out = JSON.stringify(msg);
    for (const s of this.sockets(except)) s.send(out);
  }

  // Host = earliest-joined player whose tab is visible. A hidden tab stops
  // running frames, so it must not hold the simulation.
  async pickHost(except) {
    const all = this.sockets(except).map(s => s.deserializeAttachment()).sort((a, b) => a.joined - b.joined);
    if (!all.length) return null;
    const cur = await this.ctx.storage.get('host');
    const curA = all.find(a => a.id === cur);
    const firstVis = all.find(a => a.vis);
    let next = cur;
    if (!curA) next = (firstVis || all[0]).id;
    else if (!curA.vis && firstVis) next = firstVis.id;
    if (next !== cur) {
      await this.ctx.storage.put('host', next);
      if (cur) this.broadcast({ t: 'host', id: next });
    }
    return next;
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/room\/([a-z0-9-]{1,32})$/i);
    if (!m) return new Response('Not found', { status: 404 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
    return env.ROOM.get(env.ROOM.idFromName(m[1].toLowerCase())).fetch(req);
  },
};
