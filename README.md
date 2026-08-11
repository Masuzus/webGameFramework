# Lumen Canvas Starter

一个干净、独立的 Web 2D 游戏起始模板，包含 Canvas 画面、DOM HUD、离线 Web 构建和原生 Android WebView 外壳。

## 环境

- Node.js 20 或更高版本
- Android 构建需要 JDK 17、Android SDK 36

## Web 构建

```powershell
npm install
npm run check
```

生成文件位于 `dist/`。使用任意静态文件服务器加载该目录即可运行 Demo。

## Android

1. 在项目根目录执行 `npm run build`。
2. 使用 Android Studio 打开 `android/`。
3. 运行 `app`，或在 `android/` 中执行 `./gradlew assembleDebug`。

Gradle 会在构建前将 `dist/` 完整同步到 `android/app/src/main/assets/`。

## 文档

- [技术管线](./docs/TECHNICAL_PIPELINE.md)
- [风格系统](./docs/STYLE_SYSTEM.md)

