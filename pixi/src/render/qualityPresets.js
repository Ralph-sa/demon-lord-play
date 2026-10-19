/** 渲染画质档位：光照 / 阴影 / 后期 分项开关 */
export const RENDER_QUALITY = {
  high: {
    particles: 200,
    debris: 48,
    maxDynamicLights: 16,
    lighting: true,
    lightRays: true,
    projectedShadows: true,
    buildingShadows: true,
    groundEllipse: true,
    bloom: false,
    bloomStrength: 0,
    colorGrade: true,
    vignette: true,
    chromatic: true,
    radialDistort: true,
    damageVignette: true,
    postResolution: 1,
  },
  mid: {
    particles: 120,
    debris: 28,
    maxDynamicLights: 10,
    lighting: true,
    lightRays: false,
    projectedShadows: true,
    buildingShadows: true,
    groundEllipse: true,
    bloom: false,
    bloomStrength: 0,
    colorGrade: true,
    vignette: true,
    chromatic: true,
    radialDistort: false,
    damageVignette: true,
    postResolution: 0.75,
  },
  low: {
    particles: 60,
    debris: 14,
    maxDynamicLights: 6,
    lighting: true,
    lightRays: false,
    projectedShadows: false,
    buildingShadows: false,
    groundEllipse: true,
    bloom: false,
    bloomStrength: 0,
    colorGrade: true,
    vignette: false,
    chromatic: false,
    radialDistort: false,
    damageVignette: false,
    postResolution: 0.5,
  },
};

export function tierFromFps(fps, current, lowTimer) {
  if (fps < 48) lowTimer += 0.5;
  else lowTimer = Math.max(0, lowTimer - 0.5);
  if (lowTimer > 2.5 && current === 'high') return { tier: 'mid', lowTimer };
  if (lowTimer > 5 && current === 'mid') return { tier: 'low', lowTimer };
  return { tier: current, lowTimer };
}
