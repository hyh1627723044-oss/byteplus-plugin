# 安卓抖音控制 · Operit ToolPkg

在 Operit 中通过工具调用执行「下一条、上一条、点赞、收藏」。首版代码及构建产物，**尚未完成安卓导入和抖音实机验证，使用前必须校准页面节点**。不包含独立 APK、录音服务或经过验证的抖音选择器。

## 下载与安装

- [下载 douyin-control-0.1.0.toolpkg](dist/douyin-control-0.1.0.toolpkg)：在 GitHub 文件页选择 Download raw，下载后导入 Operit 的包管理入口，启用容器及 `douyin_control` 子包。
- [单文件 douyin_control.js](dist/douyin_control.js)：适合支持传统 JS 包导入的宿主。与 ToolPkg 二选一，不要同时安装同名工具。
- [SHA-256](dist/douyin-control-0.1.0.sha256)：验证下载的 ToolPkg。

需要支持公开 Java bridge 的 Operit、Android API 24+、宿主可用的 UI 自动化权限。接口核对基线见 [兼容性记录](docs/host-compatibility.md)。Android API 24 是本插件所用系统 API 的下限，不表示任意 API 24 设备都能安装当前 Operit。

## 用户文本到动作是不是 LLM 决策？

**默认聊天入口是。** 链路是：Operit 语音识别/键盘输入 → 文本 → Operit LLM 选择工具 → 本插件检查页面并执行。插件不再调用第二个 LLM，也不包含任何模型密钥。需要在 Operit 中配置可用的模型。

另一条已实现的入口是 `ingest_transcript`：宿主适配器把最终转写直接送入工具，插件用严格规则匹配命令，完全不需要 LLM 决策。**首版没有注册后台 ASR 回调，也没有默认工作流自动接线**；这个入口可供后续安卓工具或宿主改造调用。不要把“存在文本入口”等同于“已实现全程免手语音”。

在 LLM 入口中，否定句理解、复合命令拆分、同一句话是否重复调用工具由宿主模型处理。严格命令语法和唤醒词只作用于 `ingest_transcript`；动作工具没有原始文本，无法判断模型是否误解了“不要点赞”。

## 首次运行

1. 安装、启用工具包，授权 Operit 实际需要的 UI 操作权限。语音模式另外授权麦克风。
2. 将抖音切到普通竖屏视频页，用宿主浮窗或安卓调试工具调用 `douyin_control:inspect_page`，参数 `{ "include_nodes": true }`。**这会返回屏幕文字，可能发送到你配置的模型**；只在同意采样的调试场景使用。
3. 按 [校准说明](docs/android-testing.md) 收集正常视频、已/未点赞、已/未收藏、评论和弹窗样本，填写 [profile 格式示例](profiles/example.json)。示例的 `example:id/*` 是虚构格式演示，不可直接用于抖音。
4. 调用 `configure_profile`，把校准 JSON 序列化为 `profile_json` 字符串。配置变化会停止会话。
5. 调用 `start_control`。它开启最长 30 分钟的执行会话，**不会启动录音**。宿主语音监听需另外开启。
6. 保持抖音在前台，通过 Operit 浮窗/语音入口下达命令。若宿主切回聊天页导致抖音不在前台，工具会拒绝操作。
7. 调用 `stop_control` 禁用插件执行；同时在 Operit 中关闭语音监听。已经提交的触摸无法撤销。

可给宿主模型的使用约定：

> 仅在我明确要求时使用抖音工具。先完成校准并开启控制会话。所有动作必须携带 start_control 返回的 session_id；停止/重启会话后不要为旧请求换成新 ID。每个独立操作分配一个新的 command_id；同一请求的重复调用复用 ID。点赞、收藏前先调用 inspect_page（include_nodes=false），把 analysis.video_key 原样传入 expected_video_key。不要猜测页面选择器或 video_key。rejected/failed/unverified 时简短报告结果，不自动重试、不调用其他点击工具绕过保护。除非我要求，不朗读长回复。

## 工具接口

| 工具 | 用途 |
| --- | --- |
| `inspect_page` | 默认仅返回前台应用、页面支持结果、状态与视频比较 token；显式 `include_nodes=true` 才返回节点文字 |
| `configure_profile` | 保存经过用户核对的设备校准 JSON |
| `start_control` / `stop_control` | 开始/停止执行会话，麦克风由宿主管理 |
| `next_video` / `previous_video` | 单次上滑/下滑 |
| `ensure_liked` / `ensure_favorited` | 已完成时不点击；只在明确未完成时点击一次并复核 |
| `ingest_transcript` | 严格最终转写入口，支持“小刷，下一条”等短句 |

动作返回 `success`、`already_done`、`rejected`、`failed` 或 `unverified`。`verified=true` 只表示读取到了符合校准规则的目标界面状态，不代表抖音服务器已持久化成功。语音入口还可能返回 `ignored`。

直接 ASR 调用示例（值需由适配器生成，不能照抄）：

```json
{
  "session_id": "start_control返回的ID",
  "utterance_id": "utterance-008",
  "text": "小刷，下一条",
  "final": true,
  "issued_at_ms": 123456,
  "expected_video_key": "捕获命令时观察到的视频token"
}
```

`issued_at_ms` 是捕获最终 ASR 结果时的 Android `SystemClock.elapsedRealtime()`，不是 Unix 时间；初始有效期 1500ms。部分结果不执行。同一语句重复最终回调不重复执行，不同语句说同样的话可分别执行。

## 已实现的保护及边界

- 前台包名、Activity、页面标记、遮挡标记、竖屏视口和唯一视频身份字段检查。
- 动作前重新读页面；点赞/收藏比较目标视频；未知状态不点击。
- 使用刚读取节点的 bounds 定位，不是预设点击坐标；不会盲目二次点击或滑动。
- 跨脚本运行时共享会话、语句去重和 OS 文件锁。忙碌直接拒绝，不排队。单会话最多记录 2000 个请求，达到上限停止，重新开启需用户操作。
- 检查到锁屏/息屏时停止；重启 Operit 后旧会话失效；会话 30 分钟到期。
- 未知弹窗只有被校准 blocker 命中或破坏页面标记时才能识别。作者和标题组合并非真实视频唯一 ID，同名内容及最后一次检查与触摸之间的竞态仍有风险。
- 没有后台锁屏/前台变化监听器，不能感知两次工具调用之间已经完成的锁屏/解锁周期。需要用户在锁屏前停止并在解锁后手动开始；后续宿主事件适配应自动执行 stop_control。
- LLM 工具的 1500ms 有效期从工具执行入口计时，不包含语音识别和模型推理延迟。点赞/收藏的 token 保护从 inspect_page 采样开始，不能回溯到说话瞬间。
- 宿主 UI 调用如果挂起，本插件不强行释放锁或发第二次动作。先停止会话，必要时强制停止 Operit；不要通过反复点击绕过。

## 开发

Node.js 22+、Python 3，无第三方依赖，无需 `npm install`：

```sh
npm test
npm run build
npm run check
```

Windows 可使用 `npm.cmd`。Python 可执行文件不是 `python` 时设置 `PYTHON` 环境变量。构建将模块封装为宿主可执行单文件，并用 Python 标准库生成 ToolPkg；归档内仅含 `manifest.json`、`main.js` 和 `packages/douyin_control.js`。

`src/` 是源代码；`dist/` 是可直接下载的提交产物；`tests/` 包含纯逻辑、宿主边界及产物测试；[安卓测试清单](docs/android-testing.md) 用于后续真机验证。GitHub CI 运行测试、构建并上传产物。

## 隐私、清理和卸载

插件不录音、不截图、不联网、不保存完整节点树或完整转写，不写包含屏幕文字的诊断日志。会话仅保存请求 ID、配置和控制状态到 Operit 私有 SharedPreferences；配置不要写入私人屏幕文字，尽量使用稳定 resourceId/描述。工具返回值会进入宿主聊天历史，具体留存和云端传输由 Operit/模型配置决定。

停止会话后禁用或删除工具包即可停止使用。禁用/删除插件不保证删除 Android 私有配置；如需完全清除残留，可清除 Operit 应用数据，但这也会删除宿主其他设置，请先备份。不要将采集到的真实节点样本提交仓库；本地放入被忽略的 `device-private/`。

该仓库是用户自有插件仓库，尚未向 Operit 官方发 PR、提交市场或被官方合入。
