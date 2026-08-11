# Android WebView Shell

这是一个完全离线的最小 Android WebView 容器。

## 使用

1. 在项目根目录执行 `npm install` 和 `npm run build`。
2. 使用 Android Studio 打开本目录。
3. 修改 `app/build.gradle` 中的包名和版本。
4. 同步修改 Java 包目录及 `MainActivity.java` 的 `package` 声明。
5. 运行 `app`，或执行 `./gradlew assembleDebug`。

`preBuild` 会先运行 `syncWebAssets`，以根目录 `dist/` 覆盖生成的本地资源目录。

默认配置不包含网络权限、原生接口、支付、广告、分析或远程内容。

