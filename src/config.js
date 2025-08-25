const fs = require('fs-extra');
const path = require('path');
const yaml = require('yaml');
const { app } = require('electron');

class ConfigManager {
    constructor() {
        this.currentDocsDir = null;
        this.currentConfigPath = null;
        this.config = null;
        this.appDataPath = null;
        this.lastConfigPath = null;
        
        // 初始化应用数据路径
        this.initAppDataPath();
    }

    initAppDataPath() {
        try {
            this.appDataPath = path.join(app.getPath('userData'), 'docsify-helper');
            this.lastConfigPath = path.join(this.appDataPath, 'last-config.json');
        } catch (error) {
            // 如果在 CLI 模式下运行，使用当前目录
            this.appDataPath = path.join(process.cwd(), '.docsify-helper');
            this.lastConfigPath = path.join(this.appDataPath, 'last-config.json');
        }
    }

    async saveLastConfig(config = null) {
        try {
            // 如果传入了配置，使用传入的配置信息
            let docsDir, configPath;
            if (config && config.docsDir) {
                docsDir = config.docsDir;
                configPath = path.join(config.docsDir, 'config.yaml');
            } else {
                // 否则使用当前的配置信息
                if (!this.currentDocsDir || !this.currentConfigPath) return;
                docsDir = this.currentDocsDir;
                configPath = this.currentConfigPath;
            }
            
            await fs.ensureDir(this.appDataPath);
            
            const lastConfig = {
                docsDir: docsDir,
                configPath: configPath,
                lastUsed: new Date().toISOString()
            };
            
            await fs.writeFile(this.lastConfigPath, JSON.stringify(lastConfig, null, 2), 'utf8');
        } catch (error) {
            console.warn('保存上次配置失败:', error.message);
        }
    }

    async loadLastConfig() {
        try {
            if (!await fs.pathExists(this.lastConfigPath)) {
                return null;
            }
            
            const content = await fs.readFile(this.lastConfigPath, 'utf8');
            const lastConfig = JSON.parse(content);
            
            // 验证上次的目录和配置文件是否仍然存在
            if (await fs.pathExists(lastConfig.docsDir) && 
                await fs.pathExists(lastConfig.configPath)) {
                return lastConfig;
            }
            
            return null;
        } catch (error) {
            console.warn('加载上次配置失败:', error.message);
            return null;
        }
    }

    async clearLastConfig() {
        try {
            if (await fs.pathExists(this.lastConfigPath)) {
                await fs.remove(this.lastConfigPath);
            }
        } catch (error) {
            console.warn('清除上次配置失败:', error.message);
        }
    }

    async setDocsDir(docsDir) {
        this.currentDocsDir = path.resolve(docsDir);
        this.currentConfigPath = path.join(this.currentDocsDir, 'config.yaml');
        
        // 保存上次的配置
        await this.saveLastConfig();
    }

    getDocsDir() {
        return this.currentDocsDir;
    }

    getConfigPath() {
        return this.currentConfigPath;
    }

    async isDocsDirValid() {
        if (!this.currentDocsDir) return false;
        try {
            const stat = await fs.stat(this.currentDocsDir);
            return stat.isDirectory();
        } catch {
            return false;
        }
    }

    async hasConfig() {
        if (!this.currentConfigPath) return false;
        return await fs.pathExists(this.currentConfigPath);
    }

    getDefaultConfig() {
        return {
            docsDir: this.currentDocsDir || './docs',
            outputDir: this.currentDocsDir || './docs',
            sidebar: {
                exclude: [
                    '_sidebar.md',
                    'README.md',
                    '.DS_Store',
                    'Thumbs.db',
                    '.git',
                    'node_modules',
                    '.obsidian',
                    '.vscode'
                ],
                showFolders: true,
                recursive: true,
                sortBy: 'name' // name, date, size
            },
            deployment: {
                type: 'git', // git, cloudflare
                git: {
                    executablePath: '',
                    remoteUrl: '',
                    branch: 'main',
                    commitMessage: 'docs: 更新文档 {{date}}'
                },
                cloudflare: {
                    wranglerPath: '',
                    projectName: '',
                    accountId: ''
                }
            }
        };
    }

    async loadConfig() {
        try {
            if (!this.currentConfigPath) {
                throw new Error('未设置文档目录');
            }

            const configExists = await fs.pathExists(this.currentConfigPath);
            
            if (!configExists) {
                throw new Error('配置文件不存在');
            }

            const configContent = await fs.readFile(this.currentConfigPath, 'utf8');
            const config = yaml.parse(configContent);
            
            // 合并默认配置以确保所有字段都存在
            this.config = this.mergeWithDefaults(config);
            return this.config;
        } catch (error) {
            console.error('加载配置文件失败:', error);
            throw error;
        }
    }

    async createDefaultConfig() {
        try {
            if (!this.currentDocsDir) {
                throw new Error('未设置文档目录');
            }

            const defaultConfig = this.getDefaultConfig();
            await this.saveConfig(defaultConfig);
            this.config = defaultConfig;
            return defaultConfig;
        } catch (error) {
            console.error('创建默认配置失败:', error);
            throw error;
        }
    }

    async saveConfig(config = this.config) {
        try {
            if (!this.currentConfigPath) {
                throw new Error('未设置文档目录');
            }

            // 确保目录存在
            await fs.ensureDir(path.dirname(this.currentConfigPath));
            
            // 转换为 YAML 格式
            const yamlContent = yaml.stringify(config, {
                indent: 2,
                lineWidth: 0
            });
            
            // 添加注释头
            const content = `# Docsify Helper 配置文件
# 生成时间: ${new Date().toISOString()}

${yamlContent}`;
            
            await fs.writeFile(this.currentConfigPath, content, 'utf8');
            this.config = config;
            return true;
        } catch (error) {
            throw new Error(`保存配置文件失败: ${error.message}`);
        }
    }

    // 防止 yaml 里面漏了一些设置，如果没有，就用变量默认选项
    mergeWithDefaults(config) {
        const defaults = this.getDefaultConfig();
        
        return {
            docsDir: config.docsDir || defaults.docsDir,
            outputDir: config.outputDir || defaults.outputDir,
            sidebar: {
                ...defaults.sidebar,
                ...config.sidebar
            },
            deployment: {
                type: config.deployment?.type || defaults.deployment.type,
                git: {
                    ...defaults.deployment.git,
                    ...config.deployment?.git
                },
                cloudflare: {
                    ...defaults.deployment.cloudflare,
                    ...config.deployment?.cloudflare
                }
            }
        };
    }

    validateConfig(config) {
        const errors = [];
        
        if (!config.docsDir) {
            errors.push('文档目录不能为空');
        }
        
        if (!config.outputDir) {
            errors.push('输出目录不能为空');
        }
        
        if (!['git', 'cloudflare'].includes(config.deployment?.type)) {
            errors.push('部署类型必须是 git 或 cloudflare');
        }
        
        return errors;
    }
}

module.exports = { ConfigManager };
