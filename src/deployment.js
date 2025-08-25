const { spawn, exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const util = require('util');

const execAsync = util.promisify(exec);

class DeploymentManager {
    constructor() {
        this.config = null;
    }

    setConfig(config) {
        this.config = config;
    }

    async checkEnvironment() {
        if (!this.config) {
            throw new Error('配置未设置');
        }

        switch (this.config.deployment.type) {
            case 'git':
                return await this.checkGitEnvironment();
            case 'cloudflare':
                return await this.checkCloudflareEnvironment();
            default:
                throw new Error(`不支持的部署类型: ${this.config.deployment.type}`);
        }
    }

    async deploy() {
        if (!this.config) {
            throw new Error('配置未设置');
        }

        // 先检查环境
        await this.checkEnvironment();

        switch (this.config.deployment.type) {
            case 'git':
                return await this.deployWithGit();
            case 'cloudflare':
                return await this.deployWithCloudflare();
            default:
                throw new Error(`不支持的部署类型: ${this.config.deployment.type}`);
        }
    }

    async checkGitEnvironment() {
        const gitPath = this.config.deployment.git.executablePath || 'git';
        
        try {
            // 检查 Git 是否可用
            await execAsync(`"${gitPath}" --version`);
        } catch (error) {
            if (!this.config.deployment.git.executablePath) {
                throw new Error('Git 命令行工具未安装或不在 PATH 中。请安装 Git 或在配置中指定 git.executablePath');
            }
            throw new Error(`无法执行 Git 命令: ${gitPath}`);
        }
        
        try {
            // 检查是否在 Git 仓库中
            await execAsync(`"${gitPath}" status`, { cwd: this.config.outputDir });
        } catch (error) {
            throw new Error('当前目录不是 Git 仓库，请先初始化 Git 仓库');
        }
        
        return {
            status: 'success',
            message: 'Git 环境检查通过',
            gitPath: gitPath
        };
    }

    async checkCloudflareEnvironment() {
        const wranglerPath = this.config.deployment.cloudflare.wranglerPath || 'wrangler';
        
        // 检查必需的配置参数
        if (!this.config.deployment.cloudflare.projectName && !this.config.deployment.cloudflare.project_name) {
            throw new Error('Cloudflare Pages 部署需要设置项目名称 (project_name)，请在配置文件中设置 deployment.cloudflare.project_name');
        }
        
        try {
            // 检查 Wrangler 是否可用
            await execAsync(`"${wranglerPath}" --version`);
        } catch (error) {
            if (!this.config.deployment.cloudflare.wranglerPath) {
                throw new Error('Cloudflare Wrangler CLI 未安装。请运行 \'npm install -g wrangler\' 安装');
            }
            throw new Error(`无法执行 Wrangler 命令: ${wranglerPath}`);
        }
        
        try {
            // 检查是否已登录
            await execAsync(`"${wranglerPath}" whoami`);
        } catch (error) {
            throw new Error('未登录 Cloudflare，请运行 \'wrangler login\' 登录');
        }
        
        return {
            status: 'success',
            message: 'Cloudflare 环境检查通过',
            wranglerPath: wranglerPath
        };
    }

    async deployWithGit() {
        const gitPath = this.config.deployment.git.executablePath || 'git';
        const workDir = this.config.outputDir;
        
        try {
            // 添加所有更改
            await execAsync(`"${gitPath}" add .`, { cwd: workDir });
            
            // 生成提交信息
            const commitMsg = this.generateCommitMessage();
            
            try {
                // 提交更改
                await execAsync(`"${gitPath}" commit -m "${commitMsg}"`, { cwd: workDir });
            } catch (error) {
                // 如果没有更改需要提交，这不算错误
                if (error.message.includes('nothing to commit')) {
                    return {
                        status: 'success',
                        message: '没有检测到文件更改，跳过提交'
                    };
                }
                throw error;
            }
            
            // 推送到远程仓库
            if (this.config.deployment.git.remoteUrl) {
                const branch = this.config.deployment.git.branch || 'main';
                await execAsync(`"${gitPath}" push origin ${branch}`, { cwd: workDir });
            }
            
            return {
                status: 'success',
                message: 'Git 部署完成',
                commitMessage: commitMsg
            };
        } catch (error) {
            throw new Error(`Git 部署失败: ${error.message}`);
        }
    }

    async deployWithCloudflare() {
        const wranglerPath = this.config.deployment.cloudflare.wranglerPath || 'wrangler';
        
        try {
            let command = `"${wranglerPath}" pages deploy "${this.config.outputDir}"`;
            
            // 支持两种配置格式：projectName 和 project_name
            const projectName = this.config.deployment.cloudflare.projectName || this.config.deployment.cloudflare.project_name;
            if (projectName) {
                command += ` --project-name "${projectName}"`;
            }
            
            const { stdout, stderr } = await execAsync(command);
            
            return {
                status: 'success',
                message: 'Cloudflare Pages 部署完成',
                output: stdout,
                errors: stderr
            };
        } catch (error) {
            throw new Error(`Cloudflare Pages 部署失败: ${error.message}`);
        }
    }

    generateCommitMessage() {
        let template = this.config.deployment.git.commitMessage || 'docs: 更新文档 {{date}}';
        
        const now = new Date();
        const replacements = {
            '{{date}}': now.toLocaleString('zh-CN'),
            '{{dateShort}}': now.toLocaleDateString('zh-CN'),
            '{{time}}': now.toLocaleTimeString('zh-CN'),
            '{{timestamp}}': now.getTime().toString()
        };
        
        for (const [placeholder, value] of Object.entries(replacements)) {
            template = template.replace(new RegExp(placeholder.replace(/[{}]/g, '\\\\$&'), 'g'), value);
        }
        
        return template;
    }

    async executeCommand(command, options = {}) {
        return new Promise((resolve, reject) => {
            const child = spawn(command, [], {
                shell: true,
                stdio: 'pipe',
                ...options
            });
            
            let stdout = '';
            let stderr = '';
            
            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            child.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr });
                } else {
                    reject(new Error(`命令执行失败 (退出码: ${code}): ${stderr || stdout}`));
                }
            });
            
            child.on('error', (error) => {
                reject(error);
            });
        });
    }
}

module.exports = { DeploymentManager };
