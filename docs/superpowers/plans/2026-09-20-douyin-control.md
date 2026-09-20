# Douyin Control Implementation Plan

**Goal:** 实现可导入 Operit 的四动作工具包并提交用户仓库。
**Architecture:** 纯命令/页面逻辑 + 会话执行器 + Android/Operit 适配 + ToolPkg 打包。
**Tech Stack:** 无第三方运行时依赖的 CommonJS JavaScript、Node 22 测试、Python 3 标准库 ZIP。
**Spec:** ../specs/2026-09-20-douyin-design.md

## Constraints

只控制校准的普通竖屏视频页。不盲点，不把发送成功当效果成功。所有真机结论保持待验证。用户已授权实施和提交该独立仓库；在本会话直接执行。

## Tasks

- [x] 1. tests/core.test.cjs → src/router.cjs、src/page.cjs、src/controller.cjs：先失败测试，后实现，运行 node --test。测试覆盖相同语句去重、相同文本不同语句、过期、busy、停止中途取消、页面切换与不确定状态。
- [x] 2. src/operit.cjs、src/entry.cjs、metadata.json、manifest.json：将真实宿主类型映射到适配接口，加入跨调用持久化、文件锁、进程/设备检查、校准与只读诊断。集成测试执行打包产物并验证公开函数和参数。
- [x] 3. scripts/build.cjs、scripts/archive.py：生成 METADATA 单文件及 ZIP，读取 ZIP 验证入口路径，稳定排序、固定时间戳。
- [x] 4. README.md、docs/android-testing.md、docs/host-compatibility.md、profiles/example.json、CI：记录实际接线方式、校准、卸载、隐私与实机验收表。
- [x] 5. 完整测试/构建、独立代码审查及修复，检查提交文件，再推送用户指定仓库并核对远端 commit。

## Review focus

跨 QuickJS 调用的会话/互斥；停止与异步 UI 调用竞态；节点结构不完整和重复匹配；校准配置对视口及身份校验的影响；LLM 延迟导致目标视频变化。
