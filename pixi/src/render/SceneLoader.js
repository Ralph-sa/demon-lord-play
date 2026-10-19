/** 数据驱动场景配置（占位资源，后续替换贴图） */
export async function loadSceneData(url = './data/scene.json') {
  const data = await fetch(url).then((r) => r.json());
  return data;
}
