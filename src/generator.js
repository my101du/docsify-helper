const fs = require('fs-extra');
const path = require('path');

class SidebarGenerator {
    constructor() {
        this.config = null;
    }

    setConfig(config) {
        this.config = config;
    }

    async generateSidebar() {
        if (!this.config) {
            throw new Error('配置未设置');
        }

        console.log(`📁 开始扫描目录: ${this.config.docsDir}`);
        
        // 扫描文件
        const files = await this.scanFiles();
        
        // 显示扫描结果
        this.logScanResults(files);
        
        // 生成内容
        const content = this.generateContent(files);
        
        // 写入文件
        const outputPath = path.join(this.config.outputDir, '_sidebar.md');
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, content, 'utf8');
        
        const fileCount = files.filter(f => !f.isDir).length;
        const folderCount = files.filter(f => f.isDir).length;
        
        console.log(`\n📊 生成统计:`);
        console.log(`   📄 Markdown 文件: ${fileCount} 个`);
        console.log(`   📂 文件夹: ${folderCount} 个`);
        console.log(`   📝 输出文件: ${outputPath}`);
        
        return {
            outputPath,
            fileCount,
            folderCount
        };
    }

    async scanFiles() {
        const files = [];
        
        try {
            await this.walkDirectory(this.config.docsDir, '', files);
        } catch (error) {
            throw new Error(`扫描目录失败: ${error.message}`);
        }
        
        // 排序文件
        this.sortFiles(files);
        
        return files;
    }

    async walkDirectory(dirPath, relativePath, files) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;
            
            // 检查是否应该排除
            if (this.shouldExclude(relPath, entry.name)) {
                continue;
            }
            
            if (entry.isDirectory()) {
                // 目录
                const level = relativePath ? relativePath.split(path.sep).length : 0;
                
                if (this.config.sidebar.showFolders) {
                    files.push({
                        name: entry.name,
                        path: fullPath,
                        relPath: relPath,
                        isDir: true,
                        level: level
                    });
                }
                
                // 递归扫描子目录
                if (this.config.sidebar.recursive) {
                    await this.walkDirectory(fullPath, relPath, files);
                }
            } else if (entry.isFile() && this.isMarkdownFile(entry.name)) {
                // Markdown 文件
                const stats = await fs.stat(fullPath);
                const level = relativePath ? relativePath.split(path.sep).length : 0;
                
                files.push({
                    name: entry.name,
                    path: fullPath,
                    relPath: relPath,
                    isDir: false,
                    level: level,
                    modTime: stats.mtime,
                    size: stats.size
                });
            }
        }
    }

    shouldExclude(relPath, name) {
        const excludeList = this.config.sidebar.exclude || [];
        
        for (const exclude of excludeList) {
            // 支持简单的通配符匹配
            if (this.matchPattern(relPath, exclude) || this.matchPattern(name, exclude)) {
                return true;
            }
            // 兼容原有的包含匹配
            if (relPath.includes(exclude) || name === exclude) {
                return true;
            }
        }
        
        return false;
    }

    matchPattern(str, pattern) {
        // 简单的通配符支持 (* 和 ?)
        if (!pattern.includes('*') && !pattern.includes('?')) {
            return str === pattern;
        }
        
        // 转换通配符为正则表达式
        const regexPattern = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&') // 转义特殊字符
            .replace(/\*/g, '.*')  // * 匹配任意字符
            .replace(/\?/g, '.');  // ? 匹配单个字符
        
        try {
            const regex = new RegExp('^' + regexPattern + '$', 'i');
            return regex.test(str);
        } catch (e) {
            // 如果正则表达式无效，回退到简单的相等比较
            return str === pattern;
        }
    }

    isMarkdownFile(filename) {
        return /\.md$/i.test(filename);
    }

    sortFiles(files) {
        files.sort((a, b) => {
            // 先按层级排序
            if (a.level !== b.level) {
                return a.level - b.level;
            }
            
            // 同层级下，目录优先
            if (a.isDir !== b.isDir) {
                return a.isDir ? -1 : 1;
            }
            
            // 根据配置的排序方式
            switch (this.config.sidebar.sortBy) {
                case 'date':
                    if (a.modTime && b.modTime) {
                        return b.modTime - a.modTime; // 新的在前
                    }
                    break;
                case 'size':
                    if (a.size !== undefined && b.size !== undefined) {
                        return b.size - a.size; // 大的在前
                    }
                    break;
                default: // 'name'
                    return a.name.localeCompare(b.name, 'zh-CN');
            }
            
            return a.name.localeCompare(b.name, 'zh-CN');
        });
    }

    generateContent(files) {
        let content = '<!-- 此文件由 Docsify Helper 自动生成，请勿手动修改 -->\n';
        content += `<!-- 生成时间: ${new Date().toLocaleString('zh-CN')} -->\n\n`;
        
        // 添加首页链接
        content += '[HOME](/)\n\n';
        
        // 按照目录结构重新组织文件
        const structure = this.buildDirectoryStructure(files);
        content += this.renderStructure(structure, 0);
        
        return content;
    }

    buildDirectoryStructure(files) {
        // 创建目录结构树
        const structure = { children: new Map(), files: [] };
        
        for (const file of files) {
            this.insertIntoStructure(structure, file);
        }
        
        return structure;
    }

    insertIntoStructure(structure, file) {
        const pathParts = file.relPath.split(path.sep);
        
        if (pathParts.length === 1) {
            // 根目录下的文件或目录
            if (file.isDir) {
                if (!structure.children.has(file.name)) {
                    structure.children.set(file.name, {
                        name: file.name,
                        relPath: file.relPath,
                        isDir: true,
                        children: new Map(),
                        files: []
                    });
                }
            } else {
                structure.files.push(file);
            }
        } else {
            // 嵌套路径，需要递归创建目录结构
            const currentDirName = pathParts[0];
            
            // 确保父目录存在
            if (!structure.children.has(currentDirName)) {
                structure.children.set(currentDirName, {
                    name: currentDirName,
                    relPath: currentDirName,
                    isDir: true,
                    children: new Map(),
                    files: []
                });
            }
            
            const parentDir = structure.children.get(currentDirName);
            
            if (pathParts.length === 2) {
                // 直接子级
                if (file.isDir) {
                    if (!parentDir.children.has(file.name)) {
                        parentDir.children.set(file.name, {
                            name: file.name,
                            relPath: file.relPath,
                            isDir: true,
                            children: new Map(),
                            files: []
                        });
                    }
                } else {
                    parentDir.files.push(file);
                }
            } else {
                // 多层嵌套，递归处理 - 保持原始 relPath
                const nestedFile = {
                    ...file,
                    // 保持原始相对路径，但创建新的处理路径
                    _processingPath: pathParts.slice(1).join(path.sep)
                };
                this.insertIntoStructureNested(parentDir, nestedFile, pathParts.slice(1));
            }
        }
    }

    insertIntoStructureNested(structure, file, remainingPathParts) {
        if (remainingPathParts.length === 1) {
            // 最后一级
            if (file.isDir) {
                if (!structure.children.has(file.name)) {
                    structure.children.set(file.name, {
                        name: file.name,
                        relPath: file.relPath,
                        isDir: true,
                        children: new Map(),
                        files: []
                    });
                }
            } else {
                structure.files.push(file);
            }
        } else {
            // 还有更深层级
            const currentDirName = remainingPathParts[0];
            
            if (!structure.children.has(currentDirName)) {
                // 构建当前层级的完整路径
                const currentPath = file.relPath.split(path.sep);
                const currentLevelPath = currentPath.slice(0, currentPath.length - remainingPathParts.length + 1).join(path.sep);
                
                structure.children.set(currentDirName, {
                    name: currentDirName,
                    relPath: currentLevelPath,
                    isDir: true,
                    children: new Map(),
                    files: []
                });
            }
            
            const currentDir = structure.children.get(currentDirName);
            this.insertIntoStructureNested(currentDir, file, remainingPathParts.slice(1));
        }
    }

    renderStructure(structure, level) {
        let content = '';
        const indent = '  '.repeat(level);
        
        // 先渲染根目录的文件
        for (const file of structure.files) {
            const title = this.formatName(file.name.replace(/\.md$/i, ''));
            const urlPath = this.encodeUrlPath(file.relPath.replace(/\\/g, '/'));
            content += `${indent}- [${title}](${urlPath})\n`;
        }
        
        // 然后渲染子目录
        const sortedDirs = Array.from(structure.children.values()).sort((a, b) => 
            a.name.localeCompare(b.name, 'zh-CN')
        );
        
        for (const dir of sortedDirs) {
            const dirName = this.formatName(dir.name);
            content += `${indent}- **${dirName}**\n`;
            
            // 递归渲染子目录内容
            content += this.renderStructure(dir, level + 1);
        }
        
        return content;
    }

    logScanResults(files) {
        console.log(`\n🔍 扫描结果:`);
        
        // 按层级分组显示
        const folders = files.filter(f => f.isDir);
        const markdownFiles = files.filter(f => !f.isDir);
        
        if (folders.length > 0) {
            console.log(`\n📂 发现的文件夹 (${folders.length} 个):`);
            folders.forEach(folder => {
                const indent = '  '.repeat(folder.level + 1);
                console.log(`${indent}📁 ${folder.relPath}`);
            });
        }
        
        if (markdownFiles.length > 0) {
            console.log(`\n📄 发现的 Markdown 文件 (${markdownFiles.length} 个):`);
            markdownFiles.forEach(file => {
                const indent = '  '.repeat(file.level + 1);
                const sizeKB = (file.size / 1024).toFixed(1);
                const modTime = file.modTime.toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                console.log(`${indent}📝 ${file.relPath} (${sizeKB}KB, 修改时间: ${modTime})`);
            });
        }
        
        // 显示排除的文件信息
        const excludeList = this.config.sidebar.exclude || [];
        if (excludeList.length > 0) {
            console.log(`\n🚫 排除规则: ${excludeList.join(', ')}`);
        }
        
        // 显示配置信息
        console.log(`\n⚙️  配置信息:`);
        console.log(`   📁 文档目录: ${this.config.docsDir}`);
        console.log(`   📁 输出目录: ${this.config.outputDir}`);
        console.log(`   📂 显示文件夹: ${this.config.sidebar.showFolders ? '是' : '否'}`);
        console.log(`   🔄 递归扫描: ${this.config.sidebar.recursive ? '是' : '否'}`);
        console.log(`   📊 排序方式: ${this.config.sidebar.sortBy}`);
    }

    formatName(name) {
        // 移除序号前缀
        name = name.replace(/^\d+\s*[.-]\s*/, '');
        
        // 替换特殊字符为空格
        name = name.replace(/[_-]/g, ' ');
        
        // 首字母大写
        name = name.charAt(0).toUpperCase() + name.slice(1);
        
        return name.trim();
    }

    // 新方法：对 URL 路径进行编码
    encodeUrlPath(path) {
        // 将路径分割成各个部分，分别编码，然后重新组合
        return path.split('/').map(part => {
            // 对每个路径部分进行 URL 编码
            return encodeURIComponent(part);
        }).join('/');
    }
}

module.exports = { SidebarGenerator };
