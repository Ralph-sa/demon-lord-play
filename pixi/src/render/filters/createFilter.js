/** 从 GLSL 片段着色器创建 Pixi Filter（WebGL 优先） */
import { Filter, GlProgram, UniformGroup } from '../../../vendor/pixi.min.mjs';
import { FILTER_VERT } from './glsl.js';

export function createGlFilter(fragment, name, uniforms = {}) {
  const glProgram = GlProgram.from({
    vertex: FILTER_VERT,
    fragment,
    name,
  });
  const resources = {};
  for (const [key, def] of Object.entries(uniforms)) {
    resources[key] = new UniformGroup(def);
  }
  return new Filter({ glProgram, resources });
}
