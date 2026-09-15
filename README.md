# 陪玩单管理 · 本地样本

React + TypeScript / Next.js 16，MongoDB 8。支持陪玩、语聊和独立礼物单，新增、编辑、删除、单号搜索、组合筛选、分页及收入／工资汇总。

## 在这台 Windows 电脑启动

在本文件所在目录打开 PowerShell，运行：

```powershell
powershell -File .\start-local.ps1
```

打开 http://localhost:3000 。首次运行需要联网安装 npm 依赖和下载 MongoDB，下载约 780 MB。

启动脚本会记录依赖锁文件的校验值；依赖未变化时跳过安装。若3000端口已有服务，不会覆盖正在运行的副本。输入错误返回400，数据库连接故障返回503；汇总金额统一保留至分。

本机 Documents 受 Windows 文件夹保护。启动脚本将源码复制到 `%LOCALAPPDATA%\PeiwanLocal\陪玩单管理` 运行，原始交付源码保留在 outputs。再次启动会更新源码，保留 `.env.local` 和 `.runtime` 数据。请在启动前停止旧网页进程，不要同时启动多个副本。

MongoDB 使用真实 mongod 进程和 WiredTiger 磁盘存储；`mongodb-memory-server` 只负责下载和管理进程，不使用内存数据库。数据位于运行目录的 `.runtime/data`，二进制位于 `.runtime/bin`。不要删除此目录；备份时先停止数据库。网页终端按 Ctrl+C 停止；后台数据库可使用同目录 `stop-local-db.ps1` 停止。

## 常规开发

将整个项目放在可写目录，安装 Node.js 22.13+，执行：

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run db
```

保持数据库终端运行，另开终端：

```powershell
npm.cmd run seed
npm.cmd run dev
```

如果已安装 MongoDB，可以直接设置 `.env.local` 中的 `MONGODB_URI` 和 `MONGODB_DB`。不要覆盖已有环境文件。`npm run seed` 使用导入历史记录，只导入尚未导入过的样本，不覆盖编辑，也不会恢复已删除样本。

## 样本与规则

### 陪陪管理

打开 `/companions`，或点击侧栏／手机顶部的“陪陪管理”。支持新增、查看列表、按名称或备注搜索、编辑名称与备注、确认删除。

- 首次运行自动从旧订单整理陪陪名单，并为旧订单补上陪陪ID；已有24条样本对应9位陪陪。
- 名称必填且不能与名单中其他陪陪重复（忽略首尾空白、英文大小写及全角／半角差异），备注选填。
- 录单表单从名单选择陪陪。可以在“管理名单”新窗口新增，然后点“刷新名单”继续填写原订单。
- 订单保存陪陪ID与下单时的名称。改名后新订单使用新名称，历史订单保留原名称；删除后不再允许新订单选择该陪陪，但历史订单仍可查看、编辑。
- 删除以数据库中的删除标记实现，不级联删除订单，重复启动或样本导入不会恢复已删除陪陪。
- `GET/POST /api/companions` 与 `GET/PATCH/DELETE /api/companions/:id` 提供名单接口；GET 列表接受 `q`，写入字段为 `name`、`notes`。重复名称返回409，输入错误400，不存在404，数据库故障503。
- 订单接口新增可选 `companionId`。提供ID时后端校验名单并使用数据库名称；原有不提供ID的导入与API调用仍保持兼容。

- 来源：普通陪陪.xlsx → sep 26，原始行 2–25，共 24 条。订单总金额 RM665.00，陪陪工资 RM500.45，剩下 RM164.55。
- 原工作表顺序分配 21 个 P 单号、3 个 T 单号。无原始独立礼物单。订单列表默认按日期和时间倒序显示。
- L 礼物、P 陪玩、T 语聊独立递增，不按月份重置，不回收删除号码；四位以上自动扩展。
- 单号和类型不可编辑。可以更改同类型下的服务和单价。
- 通话映射语音通话、陪看 2小时映射陪看、受气包/树洞映射树洞。陪看 RM27 为两小时一份；输入数量按份。树洞／受气包均默认 RM20。
- 七个服务附加价：夜单4、甜蜜/技术5、声优3、优等2、头牌5、独家3、人气3（RM）。附加价也乘数量。
- 头牌／人气优先：服务及礼物均80%；否则独家85%；普通服务75%、礼物80%。独立礼物单只有礼物金额及分成选项，不收服务附加价。
- 金额使用十进制运算，四舍五入至分。后端重新计算，不能通过提交总金额修改计算结果。
- 原颜色保存为来源信息，未推断状态。存单文字仅作备注，不扣减余额或剩余时间。
- 首次打开默认筛选2026年9月；新增其他月份订单后，请调整日期或点击“重置”。

## 环境变量与 Vercel

| 变量        | 本地示例                  | Vercel                                  |
| ----------- | ------------------------- | --------------------------------------- |
| MONGODB_URI | mongodb://127.0.0.1:27017 | MongoDB Atlas 等云端连接字符串          |
| MONGODB_DB  | peiwan_local              | 分别设置 Preview 和 Production 数据库名 |

连接字符串只在服务端使用，不要添加 NEXT*PUBLIC* 前缀，不要提交 `.env.local`、数据库文件或凭据。Vercel 不运行此项目的本地 MongoDB 脚本；线上需要云端数据库。

后续部署步骤：

1. 将本目录作为 Git 仓库根目录推送到自己的私有 GitHub 仓库。
2. Vercel Import Project 选择该仓库，框架选择 Next.js，Node.js 22，构建命令 `npm run build`。
3. 在 Vercel Settings → Environment Variables 设置以上变量，Preview 和 Production 使用不同数据库。
4. `.github/workflows/ci.yml` 在 push/PR 时检查类型、计算、数据库集成及生产构建。把 Checks 配置成 main 分支保护的必需检查。
5. Vercel Git 集成自动为分支／PR 创建 Preview，main 合并后创建 Production。数据库 seed 是人工显式操作，不在构建或线上启动时自动执行。

参考：[Vercel Git 部署](https://vercel.com/docs/git)、[Vercel 环境变量](https://vercel.com/docs/environment-variables)。本部分尚未创建远程仓库或执行线上部署。当前没有登录和权限控制，供本地单人使用；上线前完成访问控制。

## 检查命令

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:integration
npm.cmd run build
```

集成测试需本地 MongoDB 运行，使用独立 `peiwan_test_*` 数据库，完成后清理该测试库，不修改样本数据库。

## API

- `GET /api/orders`：支持 q、from、to、type、companion、service、status、addon（可重复）、page；返回 items、summary、companions、page、pageSize。每页12条，summary 覆盖全部匹配订单。
- `POST /api/orders`：提交 type、date、time、companion、service、unitPrice、quantity、addons、gift、notes、status；后端分配单号与时间戳。
- `PATCH /api/orders/:id`：提交完整可编辑字段；类型变更被拒绝。
- `DELETE /api/orders/:id`：删除记录，计数器不回退。

日期、时间保存为马来西亚本地墙钟值；创建／更新时间使用 UTC ISO 字符串。搜索为转义后的普通子字符串匹配，不执行用户正则表达式。
