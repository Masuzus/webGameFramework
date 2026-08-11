# Web 2D 游戏到 Android 技术管线

## 1. 方案定位

这是一套面向小型 2D 游戏的轻量管线：游戏主体运行在浏览器技术栈中，Android 只提供受控的本地 WebView 容器和必要的原生能力。

```text
TypeScript 规则与状态
        +
Canvas 2D 游戏画面 + DOM 界面
        |
     esbuild
        |
dist/ 静态离线应用
        |
Gradle 构建前自动同步
        |
Android Activity + WebView
```

适用范围：2D 网格游戏、轻量动作游戏、卡牌、解谜、经营和回合制游戏。需要大规模 3D、复杂物理或重度原生图形能力时，应单独评估专业游戏引擎。

## 2. 技术基线

| 层级 | 技术 | 职责 |
| --- | --- | --- |
| 语言 | TypeScript 5.9 / ES2020 | 状态、规则、输入、渲染装配 |
| 构建 | esbuild 0.25 | JS/CSS 打包和 Source Map |
| 界面 | 原生 HTML/CSS/DOM | HUD、菜单、设置、弹层、可访问性 |
| 游戏画面 | Canvas 2D | 高频场景、实体、粒子和反馈 |
| 离线 Web | Manifest + Service Worker | 浏览器安装与同源静态缓存 |
| Android | Java 17 + WebView | 本地资源承载、窗口和生命周期 |
| Android 构建 | AGP 8.10.1 / Gradle 8.11.1 | APK/AAB 构建与资源同步 |
| Android SDK | compile/target 36，min 23 | Android 6.0 及以上 |

## 3. 目录职责

```text
src/
  main.ts                 应用装配与生命周期
  runtime/                固定步长、时钟、状态循环
  rendering/              只读取状态并绘制 Canvas
  styles/tokens.css       视觉令牌的唯一来源
  styles/app.css          DOM 布局和组件样式
public/                   HTML、图标、Manifest、Service Worker
scripts/build.mjs         Web 构建与静态资源复制
dist/                     唯一可部署产物
android/                  原生容器
docs/                     技术和视觉规范
```

业务扩展时建议新增 `game/`、`input/`、`ui/` 和 `platform/`。规则层不得读取 DOM；渲染层不得修改规则状态。

## 4. Web 构建

`src/main.ts` 是唯一入口。esbuild 将 TypeScript 打包为浏览器 IIFE，同时提取 CSS。`public/` 中的静态文件随后复制到 `dist/`。

使用 IIFE 而不是浏览器原生模块，是为了让同一份构建结果在普通 HTTP 环境和 Android 本地资源环境下保持一致。

标准命令：

```powershell
npm run typecheck
npm run build
npm run check
```

只发布或同步 `dist/`，不要从 `src/` 和 `public/` 中挑选文件手工复制。

## 5. 游戏循环

推荐将更新与绘制分开：

1. `requestAnimationFrame` 提供显示帧时间。
2. 累加真实经过时间。
3. 使用固定步长更新规则状态。
4. 限制一帧内的最大补算次数。
5. 根据最新状态绘制一次画面。

这样可以降低不同刷新率对手感、碰撞和数值的影响，也能避免应用从后台恢复后集中补算过多逻辑。

静态网格、固定地形或装饰层应缓存到离屏 Canvas。动态对象按稳定层级绘制，例如：背景、地形、奖励、危险物、角色、弹道、反馈特效。

## 6. 视口和输入

- Canvas 使用 CSS 尺寸参与布局，内部像素尺寸乘以设备像素比。
- 设备像素比应设置上限，避免高分辨率手机产生不必要的填充压力。
- 同时监听 `window.resize` 和 `visualViewport.resize`。
- 页面使用 `100dvh`、`viewport-fit=cover` 和 `safe-area-inset-*`。
- 游戏操作区设置 `touch-action: none`；普通滚动区不要禁用默认触控。
- 页面进入后台时暂停实时游戏。

## 7. Android 资源链

`android/app/build.gradle` 中的 `syncWebAssets` 执行以下操作：

1. 检查 `dist/index.html` 是否存在。
2. 清理旧的生成资源目录。
3. 将完整 `dist/` 复制到 `app/src/main/assets/`。
4. 作为 `preBuild` 的依赖自动执行。

推荐发布顺序：

```powershell
npm ci
npm run check
Set-Location android
./gradlew bundleRelease
```

`app/src/main/assets/` 是生成目录，不应手工维护。

## 8. WebView 配置

最小离线容器应做到：

- 开启 JavaScript 和 DOM Storage。
- 仅加载 `file:///android_asset/index.html`。
- 只允许 `/android_asset/` 下的本地导航。
- 禁止网络加载和混合内容。
- 禁止缩放、过度滚动和内容访问。
- WebView 背景与 Web 首帧底色一致，避免白闪。
- Activity 销毁时停止加载并销毁 WebView。
- 系统栏使用沉浸式布局，具体安全区交给 CSS 处理。

当前模板不声明网络权限。确实需要远程接口时，再添加权限、网络安全配置和明确的域名策略。

## 9. 原生能力边界

震动、支付、广告、分享、通知或云存档应通过平台接口接入。先在 TypeScript 中定义平台无关接口，再分别实现浏览器适配和 Android 适配。

新增 JavaScript Interface 时必须：

- 只对精确匹配的可信本地入口启用。
- 在原生层校验方法参数和允许值。
- 拦截所有外部导航。
- 使用 UI 线程执行 WebView 操作。
- 不把密钥、价格、权益判断或可信存档放在 JavaScript 中。

需要同时承载本地与远程内容时，优先使用 AndroidX `WebViewAssetLoader` 为本地资源提供受控 HTTPS 域名，并重新审计同源策略、CSP 和接口暴露范围。

## 10. 发布检查

- TypeScript 严格检查通过。
- Web 构建可重复，`dist/` 不引用源码绝对路径。
- 离线启动所需文件全部进入缓存清单。
- Android 同步只以 `dist/` 为输入。
- 应用名、包名、版本、图标和签名均已替换。
- 真实设备验证前后台切换、返回键、安全区、触控和音频焦点。
- 原生接口经过参数校验和非可信页面隔离。

