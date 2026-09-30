# xinrui-tea-admin · 鑫芮茶业管理后台

基于若依 Vue 3 的运营管理 Web 应用，与 xinrui-tea-backend 后端及 xinrui-tea-app H5 共享茶叶业务数据。

## 项目简介

提供若依登录、动态菜单和权限控制；茶叶业务包括经营概览、商品、商城订单、拍卖、会员、公告、拍卖仓库、付款审核、寄卖服务费、充值审核、提现记录、投诉、流水、出价记录和商城内容等 15 个入口。

商品分类与描述、运单登记、订单查询、拍卖管理及审核操作通过真实 Java API 读写，不由前端本地数据冒充成功。部分菜单仅提供记录查询；提现、预约、分佣和卖方二次交易等完整流程仍有缺项，菜单存在不代表全部业务完成。

## 技术栈

- Vue 3.5、JavaScript ES Modules（本工程不是 TypeScript 项目）。
- Vite 6、Vue Router 4、Pinia 3。
- Element Plus 2、Axios、ECharts。
- Sass、SVG 图标、自动导入和构建压缩插件。
- 若依 Java JWT/RBAC API；开发代理连接 backend。

## 关联仓库

| 项目 | 说明 | GitHub |
| --- | --- | --- |
| xinrui-tea-backend | 后端服务 | [xinrui-tea-backend](https://github.com/jiangyi3265/xinrui-tea-backend) |
| xinrui-tea-admin | 管理后台 | [xinrui-tea-admin](https://github.com/jiangyi3265/xinrui-tea-admin) |
| xinrui-tea-app | 用户端 | [xinrui-tea-app](https://github.com/jiangyi3265/xinrui-tea-app) |

## 快速启动

需要连同数据库一键启动时，使用 [app 仓库部署入口](https://github.com/jiangyi3265/xinrui-tea-app/blob/main/deploy/README.md)：`bash deploy/deploy.sh`。本仓库 Dockerfile 构建静态后台，通过 Nginx 将 `/prod-api` 转发到真实 Java 服务、将 `/h5` 转发到商城资源。默认后台端口为 18001，首次随机密码保存在部署机器的私密文件，不写入仓库。

前置：Node.js 22+ 和 npm，关联后端已经启动。依赖以 package-lock.json 为准。

```bash
npm ci
cp .env.development.example .env.development
npm run dev
```

默认后台地址 `http://127.0.0.1:5174`，`/dev-api` 代理至 Java `http://127.0.0.1:8080`，`/h5` 资源代理至 `http://127.0.0.1:5173`。可通过启动进程的 `TEA_API_ORIGIN`、`TEA_ASSET_ORIGIN` 配置目标。`VITE_*` 变量会进入浏览器构建，禁止放入数据库密码、Token 或服务端密钥。

```bash
cp .env.production.example .env.production
npm run build:prod
npm run preview
```

生产产物为 `dist/`；必须由正式 Web 服务器将 `/prod-api` 反代到后端，同时配置静态资源、HTTPS 和访问策略。Vite preview 仅用于检查产物，不提供生产业务后端。预发模式可复制 `.env.staging.example` 后执行 `npm run build:stage`。

完整本地隔离联调请采用 app 仓库的 `npm run local:shared`，目录布置如下：

三个仓库的本地目录名应保持为下面的名称（联调脚本按相邻目录定位）：

```bash
git clone https://github.com/jiangyi3265/xinrui-tea-backend.git RuoYi-Vue
git clone https://github.com/jiangyi3265/xinrui-tea-admin.git RuoYi-Vue3
git clone https://github.com/jiangyi3265/xinrui-tea-app.git 分销茶叶
```

## 项目结构

| 路径 | 用途 |
| --- | --- |
| src/views/tea/ | 茶叶商品、订单、拍卖、审核及内容页面 |
| src/api/tea.js | 茶叶业务 API 请求封装 |
| src/views/system/ | 若依系统管理页面 |
| src/router/、src/permission.js | 路由与访问控制 |
| src/store/ | Pinia 登录、权限、布局状态 |
| src/components/、src/layout/ | 通用组件与后台框架 |
| src/utils/ | 请求、鉴权和工具 |
| vite/、vite.config.js | 插件、代理与构建配置 |
| public/ | 公共静态资源 |

## 验证与当前边界

本仓库实际构建命令为 `npm run build:prod`；记住密码工具的定向回归使用 `node --test tests/remember-credentials.test.mjs`。未配置独立 `npm test`。跨项目业务回归在 app 仓库通过 `npm run verify:nonpay` 执行。公开源码不代表已经满足商用、容量或所有设备兼容要求，详见 [业务验收范围](https://github.com/jiangyi3265/xinrui-tea-app/blob/main/docs/NONPAY-PAGE-MATRIX.md)。

## 简历描述示例

参与基于 Vue 3、Element Plus 和若依权限体系的茶叶运营后台开发，实现商品编辑、物流发货、拍卖管理和业务审核页面。对接统一 Java API，完善校验、重复提交处理和不同角色的操作权限。

## 安全与来源

真实 `.env*`、依赖、dist、IDE 配置及日志不提交；仅提交无凭据的 `.env*.example`。保留若依及依赖的开源许可说明，严禁将开发示例账户直接用于生产。

已移除旧版内置 RSA 私钥。“记住密码”仅在用户勾选时按浏览器生成独立密钥；密钥过期、存储受限或旧版Cookie无法解密时，需要重新输入登录密码，不影响正常登录。该功能不是防XSS或防本机访问的安全边界，共用设备不要使用记住密码；不能把服务端私钥放入前端配置。
