# 安卓安装、校准与验收

本文件是待执行清单。所有真机项当前均为 **未测试**。

## 记录环境

记录机型、Android 版本、抖音普通版版本、实际 packageName、Operit 版本/commit、UI 权限提供方式、ASR 与模型、外放音量/距离。只声称支持实际通过的组合。

## 安装和接口验证

1. 从 dist 下载 ToolPkg，在 Operit 导入并启用容器和子包。
2. 用浮窗或安卓调试工具保持抖音前台，调用 `inspect_page`，确认返回 package/activity。
3. 出现 `HOST_UNSUPPORTED/HOST_ERROR` 时检查宿主是否提供 Java bridge、UI 权限、所选权限级别。不要将工具异常解释为“抖音节点不存在”。
4. 用户明确同意屏幕采样后调用 `inspect_page({include_nodes:true})`；工具结果可能进入模型上下文。采样文件仅存本地 `device-private/`。

## 配置页面 profile

`profiles/example.json` 是**结构示例，不是真实抖音适配**。每个 selector 是字段相等判断，多字段是 AND，不支持正则、模糊匹配、子节点关系或数组序号。支持 `resourceId`、`text`、`contentDesc`、`className`，不能仅使用 className。

- `packageName/activityName`：原样使用 inspect 返回值；不能只填显示名称。
- `viewport`：实际竖屏屏幕像素宽高。分辨率、显示缩放、导航方式改变后重做校准。根节点 bounds 也必须与之符合。
- `markers`：至少两个在支持视频页唯一出现的稳定标记，不能在评论、直播、图文页同样成立。
- `blockers`：至少一个，覆盖评论面板、直播、图文、系统弹窗、收藏面板等。拿不到可靠遮挡特征时不要宣称支持该场景。
- `identity`：至少两个独立稳定定位的节点，运行时读取其 text/contentDesc 作为比较依据。选择器应使用 resourceId，不应将某一条视频的标题硬编码进选择器。任一字段为空或匹配不唯一则拒绝。
- `like/favorite.on/off`：在手动操作前后分别采样。必须能从确切节点文本或描述区分两种状态。点击节点要求 `isClickable=true` 且 bounds 有效。节点只有“赞”“收藏”且没有状态信息时，本实现不支持可靠幂等，不要把同一个 selector 配到两种状态。
- `gesture`：x/top/bottom 是屏幕相对比例，避开按钮和导航。x 0.2–0.6，top≥0.15，bottom≤0.85，跨度≥0.25；时长 100–1000ms。

将 JSON 序列化为字符串传给 `configure_profile.profile_json`；配置后重新 `start_control`。先运行 `inspect_page`，只有 `analysis.ok=true` 且两个状态正确时才进行实际点击。

## 最小动作验证

工具名均加 `douyin_control:` 前缀（传统 JS 包导入时按宿主展示名称）。

```text
start_control({})
inspect_page({include_nodes:false})
next_video({session_id:"start返回的ID", command_id:"test-next-001"})
previous_video({session_id:"start返回的ID", command_id:"test-previous-001"})
inspect_page({include_nodes:false})
ensure_liked({session_id:"start返回的ID", command_id:"test-like-001", expected_video_key:"上一步的analysis.video_key"})
ensure_liked({session_id:"start返回的ID", command_id:"test-like-002", expected_video_key:"同一视频token"})
ensure_favorited({session_id:"start返回的ID", command_id:"test-favorite-001", expected_video_key:"同一视频token"})
stop_control({})
```

`already_done` 说明读取到已有状态，不能再次点击。`unverified` 说明发送过动作但结果不确定，需要人工确认。命令 ID 在同一会话中不可重用；重复请求复用旧 ID 会返回 DUPLICATE。

## 验收表

| 场景 | 操作与预期 | 当前状态 |
| --- | --- | --- |
| 导入与加载 | 9 个工具可见，Java bridge 调用正常 | 未测试 |
| 四动作 | 每类 20 次，分别统计识别和执行成功率，目标≥95% | 未测试 |
| 幂等 | 已点赞/收藏分别重复 10 次，无取消 | 未测试 |
| 页面保护 | 评论、直播、图文、弹窗、其他 App 全部拒绝 | 未测试 |
| 手动切换 | inspect 后或指令后立即滑动，旧收藏不作用于新视频 | 未测试 |
| 去重 | 同语句部分+最终+重复最终，只执行一次；两个独立相同语句分别执行 | 纯逻辑通过，实机未测试 |
| 停止/息屏 | 等待中停止不提交；已提交不承诺撤回；检测到息屏停止 | 纯逻辑通过，实机未测试 |
| 锁屏完整周期 | 两次调用之间锁屏再解锁 | 首版无后台监听，需用户显式停止/恢复 |
| 进程重启 | 强制停止 Operit 后重开，必须重新 start | 未测试 |
| LLM 语义 | 否定句、引用、复合命令不得误调用正向动作 | 未测试，依赖宿主模型 |
| 严格入口 | 20 条否定/干扰文本应 ignored | 代表性纯逻辑测试通过，实机未测试 |
| 外放 | 30 分钟含动作词、完整唤醒词视频，记录误执行数 | 未测试 |
| 延迟 | 记录语音结束→最终识别→工具入口→动作提交→验证的中位数/P95 | 未测试 |
| 长会话 | 温度、耗电、监听中断和只刷视频对照 | 未测试 |

## 常见结果

`PROFILE_REQUIRED`：先校准；`VIEWPORT_CHANGED`：重新检查尺寸；`STATE_UNKNOWN`：状态或身份不可靠；`VIDEO_CHANGED`：重新观察，由用户重新下命令；`EXPIRED`：检查时钟基准及耗时；`BUSY`：前一动作未完成，当前请求未排队；`SESSION_STOPPED`：由用户重新开始；`EXPECTED_VIDEO_REQUIRED`：先 inspect；`HOST_ERROR`：检查宿主日志及权限。

UI 工具 Promise 挂起时不要释放锁强制并发；先 stop_control，再停止 Operit。取消、权限撤销与宿主销毁是否释放桥接文件句柄需要真机覆盖。校准错误无法由单元测试识别；不满足保护条件时保持拒绝。
