# 智能字幕排版助手 (Smart Subtitle Formatter)

这是一个基于 AI 的 Web 应用程序，专为将破碎的字幕文件（TXT）重组为高质量的小说格式而设计。它利用 Google Gemini 模型进行语义断句，并支持智能语气词过滤和沉浸式动态背景。

## ✨ 功能特点

*   **智能排版**：利用 AI 识别语义，将破碎的字幕行合并为通顺的段落（300-500字）。
*   **语气词过滤**：一键自动删除“啊。”、“嗯，”等 8 种常见的口语废话。
*   **批量处理**：支持同时上传和处理多个 TXT 文件。
*   **打包下载**：一键将所有处理好的文件打包为 ZIP 下载。
*   **沉浸体验**：提供流星、银河、极光三种高质量动态背景。
*   **实时预览**：支持左右分屏对比原文本与处理后的文本。

## 🚀 如何获取应用网址 (部署指南)

要让其他人使用此应用，你需要将其部署到网络上。推荐使用 **Vercel** 进行免费托管。

### 1. 准备工作
确保你拥有一个有效的 Google Gemini API Key。

### 2. 部署步骤

1.  将本项目代码推送到 **GitHub** 仓库。
2.  访问 [Vercel](https://vercel.com) 并使用 GitHub 账号登录。
3.  点击 **"Add New..."** -> **"Project"**。
4.  选择你刚才上传的 GitHub 仓库并点击 **"Import"**。
5.  **⚠️ 重要配置**：
    *   在 **"Environment Variables"** (环境变量) 区域：
    *   Key 填写：`API_KEY`
    *   Value 填写：你的 Google Gemini API 密钥
6.  点击 **"Deploy"** (部署)。

### 3. 完成
部署完成后，Vercel 会生成一个类似 `https://your-project-name.vercel.app` 的网址。你可以将此链接分享给任何人，他们即可在浏览器中直接使用你的应用。

## 🛠️ 本地开发

如果你想在本地运行：

1.  安装依赖：
    ```bash
    npm install
    ```
2.  创建 `.env` 文件并填入 API Key：
    ```env
    API_KEY=你的_GEMINI_API_KEY
    ```
3.  启动开发服务器：
    ```bash
    npm run dev
    ```

## 📄 技术栈

*   React 19
*   TypeScript
*   Tailwind CSS
*   Google GenAI SDK
*   JSZip (用于文件打包)
*   Lucide React (图标库)
