# WeRead Mini

[English](./README.md) | 简体中文

WeRead Mini 是面向 Windows 10/11 x64 的极简微信读书桌面阅读器。它显示[微信读书官网](https://weread.qq.com/)，不抓取、不下载书籍，也不修改网站的认证或阅读进度机制。本项目与腾讯、微信读书没有隶属关系。

## 功能

- 420×640 的无标题栏阅读窗口，最小 320×400；工具栏约 36px，可拖动和调整窗口大小。
- `Alt+Q` 全局隐藏／恢复；隐藏时保留同一个阅读页面实例。关闭主窗口默认隐藏到托盘。
- 托盘菜单提供显示、隐藏、始终置顶、设置和退出。托盘的“退出程序”会真正结束应用。
- Windows 使用原生窗口透明度：10%～100%，每次 5%，默认 90%。工具栏可直接选择透明度。
- 返回、前进、刷新、置顶、透明度、最小化和隐藏按钮；可在设置中隐藏三个导航按钮。
- 可设置快捷键、浅色／深色工具栏、启动时显示或隐藏到托盘。窗口尺寸、位置和其他设置保存在用户应用数据目录。
- 阅读页使用 `persist:weread` 持久 session。登录状态和阅读进度由微信读书网站及 Chromium session 管理，不写入自定义配置或日志。

## 开发与测试

需要 Node.js 22.12 或更新版本、npm，以及可访问 npm 和 Electron 下载地址的网络。Ubuntu 开发环境还需要 Electron 所需的系统图形库和 X11/Wayland 图形会话。

```bash
npm ci
npm run typecheck
npm run test
npm run build
npm run dev
```

`npm run dev` 先构建再启动 Electron；当前版本没有热更新。`npm run build` 把主进程、preload 和两个本地界面构建到 `dist/`。测试使用 Node.js 自带的测试运行器。项目未配置 lint，因此没有 lint 命令。

当前 Ubuntu 沙箱的 npm 进程不能直接解析 npm registry，因此本次安装使用了临时离线缓存；锁文件是正常的 npm `package-lock.json`，普通开发环境和 GitHub Actions 直接运行 `npm ci` 即可。本机还缺少系统 `libnss3`、`libnspr4`；临时提供这些库后，Chromium 沙箱初始化仍因容器权限收到 `Operation not permitted`，所以没有完成 Electron GUI 冒烟测试。项目本身保持 `sandbox: true`，没有把关闭沙箱的参数写入启动命令。

## Windows EXE 构建

建议在 Windows 10/11 x64 上安装 Node.js 22，再运行：

```powershell
npm ci
npm run typecheck
npm run test
npm run dist:win
```

`npm run dist:win` 使用 electron-builder 构建 NSIS 安装版和 Portable 便携版。输出位置为 `release/WeRead-Mini-Setup-1.0.0-x64.exe` 和 `release/WeRead-Mini-Portable-1.0.0-x64.exe`；具体文件名以版本号为准。Portable 版仍使用 Windows 用户应用数据目录保存设置及登录 session，移动 EXE 不会自动迁移这些数据。项目没有代码签名证书，Windows SmartScreen 可能提示未签名应用；请核实文件来源，不要通过关闭系统安全防护来解决提示。

GitHub Actions 工作流位于 `.github/workflows/build-windows.yml`，支持手动触发、`main` 分支推送和拉取请求。工作流在 `windows-latest` 上运行 `npm ci`、类型检查、测试和 Windows x64 打包，并将 EXE 上传到该次运行的 `weread-mini-windows-x64` Artifact。仓库推送并成功运行工作流前，不能称为“已通过 Windows CI 构建”。

## 安全与数据

工具栏和设置页是本地页面；微信读书放在独立的 `WebContentsView`，没有 preload 或 Node.js API。所有渲染进程启用上下文隔离和沙箱，关闭 Node 集成；主进程按页面身份验证 IPC。阅读页限制主框架导航，只允许微信读书和列出的微信官方认证地址留在应用内；其他有效 HTTPS 地址交给系统浏览器，非 HTTPS 导航被拒绝。远程权限请求默认拒绝。网站若调整登录域名或流程，可能需要更新允许列表并重新验证。

Windows 设置文件通常为 `%APPDATA%\WeRead Mini\settings.json`（准确位置由 `app.getPath('userData')` 决定）。浏览器 Cookie 与缓存由 `persist:weread` session 保存。删除用户数据目录会清除应用设置和可能的登录状态。

## 验证状态

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 源码与 Windows 工作流 | 已实现 | 包含安装版及 Portable 配置 |
| TypeScript 类型检查 | 已通过 Ubuntu 测试 | `npm run typecheck` |
| 自动化测试 | 已通过 Ubuntu 测试 | `npm run test`，4 个测试文件 |
| 代码构建 | 已通过 Ubuntu 测试 | `npm run build` |
| Electron GUI 启动 | 未通过本机验证 | 容器限制 Chromium 沙箱初始化 |
| Windows EXE 生成 | 待 Windows CI 构建 | 工作流已配置，尚未运行 |
| 登录、翻页与进度同步 | 需要 Windows 人工验证 | 取决于微信读书当前网站行为 |
| 全局快捷键、托盘、透明度、高 DPI | 需要 Windows 人工验证 | Ubuntu 测试不能替代 Windows GUI 验证 |

## Windows 人工验收

1. 安装或启动 EXE，确认窗口为 420×640 左右、可拖动及从边缘调整大小；在 100% 和 150% 显示缩放下检查工具栏和阅读区域。
2. 打开微信读书，扫码登录，进入书架、打开一本有权限阅读的书并翻页。退出并重启，检查登录状态和网站阅读进度是否保留；若网站拒绝 Electron 登录，记录原始提示，不尝试绕过。
3. 打开书籍后切到其他程序，按 `Alt+Q` 隐藏，再按一次恢复；确认窗口恢复到原书及原位置。再用窗口关闭操作确认只是隐藏到托盘。
4. 在托盘设置中改成未占用快捷键并测试；改成已占用快捷键，确认设置提示冲突且原快捷键仍有效。
5. 依次设置 10%、90%、100% 透明度，切换始终置顶、浅色／深色、启动时隐藏。重启后检查设置保存，确认调整这些选项不会重新加载书页。
6. 试用返回、前进、刷新和 Ctrl+鼠标滚轮缩放。点击站外 HTTPS 链接，确认由系统浏览器打开；检查非 HTTPS 导航不会获得本地能力。
7. 从托盘点“退出程序”，在任务管理器确认没有遗留的 WeRead Mini 进程。

## 已知限制

- 微信读书的登录及网页行为由官网控制，可能随网站更新而变化。本项目未验证登录成功，也不绕过认证或安全验证。
- Electron 的 `setOpacity()` 在 Linux 不生效；Windows 的实际透明度表现需人工验收。
- Linux Wayland 的全局快捷键、窗口位置和置顶能力取决于桌面环境。本项目以 Windows 为最终运行平台。
- 如果托盘不可用，应用会保持主窗口可见；如果全局快捷键注册失败，设置页和托盘菜单会显示冲突信息。
