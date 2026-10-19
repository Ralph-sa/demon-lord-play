/** 简单对象池，减少战斗时 GC */
export class Pool {
  constructor(factory, reset, initial = 8) {
    this.factory = factory;
    this.reset = reset;
    this.free = [];
    this.active = new Set();
    for (let i = 0; i < initial; i++) this.free.push(factory());
  }

  acquire() {
    const o = this.free.pop() || this.factory();
    this.active.add(o);
    return o;
  }

  release(o) {
    if (!this.active.has(o)) return;
    this.active.delete(o);
    this.reset(o);
    this.free.push(o);
  }

  releaseAll() {
    for (const o of [...this.active]) this.release(o);
  }
}
