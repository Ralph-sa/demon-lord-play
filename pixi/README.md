# 古惑仔成魔 · PixiJS 样板房

Hades 式 **2D 光照 / 阴影 / 屏幕后期** 围合小竞技场（WebGL）。画风 v6 漫画素材；质感基准 **傍晚 1**（`docs/art/quality_ref_dusk_1.png`）。

## 试玩

静态根为 `prototype/` 时：**`/pixi/`**

```bash
cd prototype && python3 -m http.server 8767
# http://127.0.0.1:8767/pixi/
```

## 操作

| 输入 | 功能 |
|------|------|
| WASD / 左半屏摇杆 | 移动 |
| 左键 / 普攻钮 | 连击 |
| 右键 / E / 横扫钮 | 铁管横扫 |
| Q | 循环画质档 |
| `` ` `` / 三指点击 | 渲染调试面板 |

## 目录

```
prototype/pixi/
  data/scene.json          # 场景数据驱动（光源、阴影区、占位道具）
  src/render/              # 可复用渲染管线
    lighting/              # 光照缓冲 + 受击闪白
    shadows/               # 接地影 / 方向投影 / 楼房阴影区
    post/                  # 后期：调色、暗角、色差、径向模糊、泛光
    camera/                # 跟随、前瞻、trauma 震屏、缩放、慢动作
    debug/                 # 调试面板
    RenderPipeline.js
  vendor/pixi.min.mjs
```

## 截图验收

```bash
cd tools && node capture_pixi_screenshots.mjs
```

生成 `prototype/screenshots/pixi_post_*.png`、`pixi_heavy_hit.png`、`pixi_lights_night.png` 及 `pixi_fps_report.json`。
