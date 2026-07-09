# ReadingList Enhancer

[English README](./README.md)

ReadingList Enhancer 是一个 Chrome MV3 扩展，用侧边栏增强 Chrome 原生 Reading List：搜索、过滤、排序、本地标签，以及 JSON/URL 导入导出。

## 功能

- 搜索、过滤、排序 Reading List。
- 添加当前页面，或通过右键菜单添加页面/链接。
- 标记已读/未读，删除条目。
- 给条目选择已有标签，或添加新的本地标签。
- 导入/导出本项目 JSON 备份，或导出全量/当前筛选结果的纯 URL 文本。

## 安装

1. 打开 `chrome://extensions`。
2. 开启 Developer mode。
3. 点击 Load unpacked。
4. 选择本项目目录。
5. 点击扩展图标打开侧边栏。

## 要求

- Chrome 120 或更高版本。
- 不需要构建步骤，不需要安装依赖。
- `manifest.json` 包含本地生成的 `key`，本地加载时固定扩展 ID 为 `nianajlkiccjcfbegngpmhpinggjkbef`。

## 权限

- `readingList`：管理 Chrome 原生 Reading List。
- `sidePanel`：显示侧边栏 UI。
- `contextMenus`：提供右键保存入口。
- `activeTab`：用户触发扩展后读取当前页标题和 URL。
- `storage`：在本机保存 URL 到标签的映射。

不申请 `host_permissions`，不注入内容脚本，不上传数据。隐私说明见 [PRIVACY.md](./PRIVACY.md)。

## 开发验证

```sh
python3 -m json.tool manifest.json >/dev/null
node --check background.js
node --check sidepanel/data.js
node --check sidepanel/panel.js
node tests/data.test.js
sh -n scripts/package-extension.sh
scripts/package-extension.sh
```

## 发版

GitHub Release、Chrome Web Store 上传和 changelog 流程见 [RELEASE.md](./RELEASE.md) 与 [CHANGELOG.md](./CHANGELOG.md)。

## License

MIT. 见 [LICENSE](./LICENSE)。
