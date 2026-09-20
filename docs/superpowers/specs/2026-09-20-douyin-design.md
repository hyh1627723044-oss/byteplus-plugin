# 安卓抖音控制首版

依据用户提供的整体开发文档及“先完成代码、之后安卓测试、提交 byteplus-plugin 仓库”的授权实现。目标是 Operit ToolPkg，不是独立 APK。目标仓库为空，在独立 checkout 开发。

## 范围与决策

- 聊天/宿主语音转文本 → Operit LLM → 四个公开动作工具。动作执行不调用 LLM。
- 另提供严格文本入口 ingest_transcript：最终结果、唤醒词、独立语句 ID；可供后续宿主 ASR/工作流接线。不能把这个入口宣称为已实现后台 ASR 服务。
- 原生 Java bridge 读取单调时钟、设备可交互状态；SharedPreferences 保存配置和会话；文件锁跨脚本运行时互斥。停止不等待动作锁。
- 可校准的精确节点选择器，要求明确页面标记、遮挡标记及两个视频身份字段。未配置时拒绝动作。没有真机数据，不编造抖音资源 ID。
- Operit 简化节点没有 selected/checked 字段。点赞/收藏只接受校准过的明确“已/未”文本或描述；不从点击次数推断状态。
- 每动作执行前两次页面检查，串行、去重、过期检查；点击后验证，不自动重试。无法确认返回 unverified。
- 会话跨工具调用保存，进程重启失效。每次请求检查锁屏，检测到时停止。没有独立后台锁屏监听器，无法检测两次调用之间完整发生的锁屏/解锁周期，作为限制记录。
- 默认不导出屏幕文字；inspect_page 显式 include_nodes 时才返回校准节点，该工具结果可能送到宿主模型。

## 宿主接口基线

Operit main commit dbf71916fae9750cfdc9f9a774f5a0fee56633fb。核对 docs/TOOLPKG_FORMAT_GUIDE.md、examples/types/ui.d.ts、results.d.ts、java-bridge.d.ts、core.d.ts。

## 成功标准

构建可复现的 .toolpkg 和独立 .js；Node 自动测试覆盖幂等、否定、语句去重、页面变化、停止、过期、并发和未知结果；安卓导入、Java bridge、实际节点、后台语音、延迟及误触发留给真机验收，不能以模拟测试代替。
