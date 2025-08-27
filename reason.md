项目地址 https://github.com/my101du/docsify-helper

# 背景

我日常用 Obsidian 来管理自己的技术笔记，这些 markdown 格式的文件都放在本地一个目录里。
得益于这个软件的快速、稳定、插件丰富，已经让我放弃了 Evernote/Joplin 等等一众软件。

之前使用 Hexo / Hugo 等方式来生成博客在线访问，都需要先把 mardown 编译成 HTML 后才能提交，步骤繁琐，于是就切换成了 Docsify ，能够直接解析 markdown 文件，只需要直接定期把目录推送到 CloudFlare Pages 就行了。

由此带来两个问题：

1. 每次都要启动 CloudFlare Wrangler CLI 命令行来跑一次 deploy, 略微繁琐
2. Docsify 自己的 cli 生成 sidebar 导航经常失败

# 实现功能

1. 读取指定目录下所有 markdown 文件，生成 sidebar (支持多层级），目前只支持一个唯一的放在根目录的文件，不支持每个子目录放一个
2. 图形界面一键发布到 CloudFlare Pages, 省去打开命令行调用的时间

# 注意事项

1. 请先找个目录测试一下，不要直接在你的本地文档库运行，避免一些未检测到的问题。



