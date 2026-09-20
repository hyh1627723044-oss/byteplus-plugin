# 宿主接口核对

源码核对日期：2026-09-20；Operit main commit：`dbf71916fae9750cfdc9f9a774f5a0fee56633fb`。**源码核对通过不等于已在发行版设备上验证。**

| 本插件调用 | 上游依据 | 状态 |
| --- | --- | --- |
| `Tools.UI.getPageInfo()` | [ui.d.ts](https://github.com/AAswordman/Operit/blob/dbf71916fae9750cfdc9f9a774f5a0fee56633fb/examples/types/ui.d.ts) | 已核对声明，实机待测 |
| `packageName/activityName/uiElements` | [results.d.ts](https://github.com/AAswordman/Operit/blob/dbf71916fae9750cfdc9f9a774f5a0fee56633fb/examples/types/results.d.ts) | 节点字段含 text/contentDesc/resourceId/bounds/isClickable/children，不含 selected/checked |
| `Tools.UI.clickElement({bounds})`、`swipe(x1,y1,x2,y2,duration)` | ui.d.ts | 返回 UIActionResultData，没有可用的 success 布尔字段；插件自行读页面复核 |
| `Tools.System.sleep(ms)` | [system.d.ts](https://github.com/AAswordman/Operit/blob/dbf71916fae9750cfdc9f9a774f5a0fee56633fb/examples/types/system.d.ts) | 异步等待用于读取动作结果 |
| `Java.type()`、`Java.getApplicationContext()` | [java-bridge.d.ts](https://github.com/AAswordman/Operit/blob/dbf71916fae9750cfdc9f9a774f5a0fee56633fb/examples/types/java-bridge.d.ts) | 公开 bridge；SharedPreferences、系统服务、FileChannel 在实际 QuickJS/Android 环境待测 |
| `exports`、`complete(result)` | [core.d.ts](https://github.com/AAswordman/Operit/blob/dbf71916fae9750cfdc9f9a774f5a0fee56633fb/examples/types/core.d.ts) | 产物在 Node VM 中已验证导出和 complete；宿主加载待测 |
| manifest + main + METADATA 子包 | [ToolPkg 格式](https://github.com/AAswordman/Operit/blob/dbf71916fae9750cfdc9f9a774f5a0fee56633fb/docs/TOOLPKG_FORMAT_GUIDE.md) | schema_version=1、api_version=1.0.0；产物 ZIP 内路径检查通过 |

## P0 结论

已经确定可以针对公开脚本 API 编写 UI 工具并打包。**未完成**：设备实际导入、无障碍权限链路、后台 ASR、无需 LLM 的 ASR 事件分发、实际页面选择器、延迟与外放误触发。因此不能宣称 P0 真机能力探测全部通过。

无须修改 Operit 即可提供可由 LLM 发现的动作工具。后台语音监听是否保持在抖音前台，以及用户安装的具体版本是否暴露 ASR 直达入口，需要后续手机验证；本包没有推测性调用不存在的 ASR API。

本插件仅使用公开接口并独立实现逻辑，没有复制 B站助手或其他 GPL 实现源码；不分发 Operit APK。引用上游文档仅用于接口说明。
