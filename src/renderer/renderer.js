const { ipcRenderer } = require('electron');

class DocsifyHelperUI {
    constructor() {
        this.config = null;
        this.hasValidConfig = false;
        this.initializeElements();
        this.setupEventListeners();
        this.initializeApp();
    }

    initializeElements() {
        // 输入元素
        this.docsDirInput = document.getElementById('docsDir');
        this.outputDirInput = document.getElementById('outputDir');
        this.deploymentTypeSelect = document.getElementById('deploymentType');
        this.excludePatternsTextarea = document.getElementById('excludePatterns');

        // 按钮元素
        this.browseDocsBtn = document.getElementById('browseDocs');
        this.browseOutputBtn = document.getElementById('browseOutput');
        this.generateBtn = document.getElementById('generateBtn');
        this.checkEnvBtn = document.getElementById('checkEnvBtn');
        this.deployBtn = document.getElementById('deployBtn');
        this.saveConfigBtn = document.getElementById('saveConfigBtn');
        this.resetConfigBtn = document.getElementById('resetConfigBtn');
        this.clearLogBtn = document.getElementById('clearLogBtn');

        // 状态和日志元素
        this.statusText = document.getElementById('statusText');
        this.logOutput = document.getElementById('logOutput');

        // 模态框元素
        this.modal = document.getElementById('modal');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalMessage = document.getElementById('modalMessage');
        this.modalOk = document.getElementById('modalOk');
        this.modalCancel = document.getElementById('modalCancel');
        this.modalClose = document.querySelector('.modal-close');
    }

    setupEventListeners() {
        // 文件夹浏览
        this.browseDocsBtn.addEventListener('click', () => this.selectFolder('docs'));
        this.browseOutputBtn.addEventListener('click', () => this.selectFolder('output'));

        // 主要操作
        this.generateBtn.addEventListener('click', () => this.generateSidebar());
        this.checkEnvBtn.addEventListener('click', () => this.checkEnvironment());
        this.deployBtn.addEventListener('click', () => this.deploy());
        this.saveConfigBtn.addEventListener('click', () => this.saveConfig());
        this.resetConfigBtn.addEventListener('click', () => this.resetConfiguration());

        // 其他操作
        this.clearLogBtn.addEventListener('click', () => this.clearLog());

        // 配置更改
        this.deploymentTypeSelect.addEventListener('change', () => {
            this.updateConfigFromUI();
            this.toggleCloudflareProjectInput();
        });

        // Cloudflare 项目名称输入框变更
        const cloudflareProjectInput = document.getElementById('cloudflareProject');
        if (cloudflareProjectInput) {
            cloudflareProjectInput.addEventListener('input', () => this.updateConfigFromUI());
        }

        // 排除模式输入框变更
        this.excludePatternsTextarea.addEventListener('input', () => this.updateConfigFromUI());

        // 模态框
        this.modalClose.addEventListener('click', () => this.hideModal());
        this.modalCancel.addEventListener('click', () => this.hideModal());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hideModal();
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveConfig();
            }
            if (e.key === 'Escape') {
                this.hideModal();
            }
        });
    }

    async initializeApp() {
        this.updateStatus('正在初始化...');
        this.disableFeatures();
        
        // 尝试加载上次的配置
        try {
            const lastConfig = await ipcRenderer.invoke('load-last-config');
            if (lastConfig) {
                this.log(`📁 发现上次使用的配置: ${lastConfig.docsDir}`);
                this.updateStatus('正在加载上次的配置...');
                
                await this.setDocsDirectory(lastConfig.docsDir);
                return;
            }
        } catch (error) {
            this.log(`⚠️ 加载上次配置失败: ${error.message}`);
        }
        
        // 如果没有上次的配置，显示目录选择
        this.updateStatus('请先选择文档目录...');
        this.showDocsDirSelection();
    }

    showDocsDirSelection() {
        this.showModal(
            '选择文档目录', 
            '请选择包含 Markdown 文档的目录，程序将在该目录中查找或创建 config.yaml 配置文件。',
            'info'
        );
        
        // 修改模态框按钮文本
        this.modalOk.textContent = '选择目录';
        this.modalCancel.textContent = '退出';
        
        // 重新绑定事件
        this.modalOk.onclick = () => this.selectDocsDirectory();
        this.modalCancel.onclick = () => window.close();
    }

    async selectDocsDirectory() {
        try {
            const folderPath = await ipcRenderer.invoke('select-folder');
            if (folderPath) {
                this.hideModal();
                await this.setDocsDirectory(folderPath);
            }
        } catch (error) {
            this.log(`❌ 选择目录失败: ${error.message}`);
            this.showDocsDirSelection(); // 重新显示选择对话框
        }
    }

    async setDocsDirectory(docsDir) {
        try {
            this.updateStatus('正在设置文档目录...');
            
            // 设置文档目录
            await ipcRenderer.invoke('set-docs-dir', docsDir);
            this.docsDirInput.value = docsDir;
            
            // 检查配置文件
            const hasConfig = await ipcRenderer.invoke('has-config');
            
            if (!hasConfig) {
                this.showConfigCreationDialog(docsDir);
            } else {
                await this.loadConfig();
                this.enableFeatures();
                
                // 保存为最后使用的配置
                try {
                    await ipcRenderer.invoke('save-last-config', this.config);
                    this.log('📝 已保存为最后使用的配置');
                } catch (saveError) {
                    this.log(`⚠️ 保存最后配置失败: ${saveError.message}`);
                }
            }
        } catch (error) {
            this.log(`❌ 设置文档目录失败: ${error.message}`);
            this.showDocsDirSelection();
        }
    }

    showConfigCreationDialog(docsDir) {
        this.showModal(
            '创建配置文件',
            `在目录 "${docsDir}" 中未找到 config.yaml 配置文件。\n\n是否创建默认配置文件？`,
            'info'
        );
        
        this.modalOk.textContent = '创建配置';
        this.modalCancel.textContent = '重新选择';
        
        this.modalOk.onclick = () => this.createConfig();
        this.modalCancel.onclick = () => {
            this.hideModal();
            this.showDocsDirSelection();
        };
    }

    async createConfig() {
        try {
            this.hideModal();
            this.updateStatus('正在创建配置文件...');
            
            await ipcRenderer.invoke('create-config');
            await this.loadConfig();
            this.enableFeatures();
            
            // 保存为最后使用的配置
            try {
                await ipcRenderer.invoke('save-last-config', this.config);
                this.log('📝 已保存为最后使用的配置');
            } catch (saveError) {
                this.log(`⚠️ 保存最后配置失败: ${saveError.message}`);
            }
            
            this.log('✅ 配置文件创建完成');
            this.updateStatus('就绪');
        } catch (error) {
            this.log(`❌ 创建配置文件失败: ${error.message}`);
            this.showDocsDirSelection();
        }
    }

    disableFeatures() {
        this.hasValidConfig = false;
        this.generateBtn.disabled = true;
        this.checkEnvBtn.disabled = true;
        this.deployBtn.disabled = true;
        this.saveConfigBtn.disabled = true;
        this.browseOutputBtn.disabled = true;
        
        // 禁用配置输入
        this.outputDirInput.disabled = true;
        this.deploymentTypeSelect.disabled = true;
        this.excludePatternsTextarea.disabled = true;
        
        const cloudflareProjectInput = document.getElementById('cloudflareProject');
        if (cloudflareProjectInput) {
            cloudflareProjectInput.disabled = true;
        }
    }

    enableFeatures() {
        this.hasValidConfig = true;
        this.generateBtn.disabled = false;
        this.checkEnvBtn.disabled = false;
        this.deployBtn.disabled = false;
        this.saveConfigBtn.disabled = false;
        this.browseOutputBtn.disabled = false;
        
        // 启用配置输入
        this.outputDirInput.disabled = false;
        this.deploymentTypeSelect.disabled = false;
        this.excludePatternsTextarea.disabled = false;
        
        const cloudflareProjectInput = document.getElementById('cloudflareProject');
        if (cloudflareProjectInput) {
            cloudflareProjectInput.disabled = false;
        }
    }

    async loadConfig() {
        try {
            this.updateStatus('正在加载配置...');
            this.config = await ipcRenderer.invoke('load-config');
            this.updateUIFromConfig();
            this.updateStatus('就绪');
            this.log('✅ 配置加载完成');
        } catch (error) {
            this.log(`❌ 配置加载失败: ${error.message}`);
            this.updateStatus('配置加载失败');
            this.disableFeatures();
        }
    }

    updateUIFromConfig() {
        if (!this.config) return;

        this.docsDirInput.value = this.config.docsDir || '';
        this.outputDirInput.value = this.config.outputDir || '';
        this.deploymentTypeSelect.value = this.config.deployment?.type || 'git';
        
        // 加载 Cloudflare 项目名称
        const cloudflareProjectInput = document.getElementById('cloudflareProject');
        if (cloudflareProjectInput) {
            cloudflareProjectInput.value = this.config.deployment?.cloudflare?.project_name || '';
        }
        
        // 加载排除模式
        const excludePatterns = this.config.sidebar?.exclude || [];
        this.excludePatternsTextarea.value = excludePatterns.join('\n');
        
        // 根据部署类型显示/隐藏 Cloudflare 项目名称输入框
        this.toggleCloudflareProjectInput();
    }

    updateConfigFromUI() {
        if (!this.config) return;

        this.config.docsDir = this.docsDirInput.value;
        this.config.outputDir = this.outputDirInput.value;
        this.config.deployment.type = this.deploymentTypeSelect.value;
        
        // 更新 Cloudflare 项目名称
        const cloudflareProjectInput = document.getElementById('cloudflareProject');
        if (cloudflareProjectInput && this.config.deployment.type === 'cloudflare') {
            if (!this.config.deployment.cloudflare) {
                this.config.deployment.cloudflare = {};
            }
            this.config.deployment.cloudflare.project_name = cloudflareProjectInput.value;
        }
        
        // 更新排除模式
        const excludeText = this.excludePatternsTextarea.value.trim();
        const excludePatterns = excludeText ? excludeText.split('\n').map(p => p.trim()).filter(p => p) : [];
        if (!this.config.sidebar) {
            this.config.sidebar = {};
        }
        this.config.sidebar.exclude = excludePatterns;
    }

    async selectFolder(type) {
        try {
            const folderPath = await ipcRenderer.invoke('select-folder');
            if (folderPath) {
                if (type === 'docs') {
                    // 重新设置文档目录
                    await this.setDocsDirectory(folderPath);
                } else if (type === 'output') {
                    this.outputDirInput.value = folderPath;
                    this.updateConfigFromUI();
                    this.log(`📁 已选择输出目录: ${folderPath}`);
                }
            }
        } catch (error) {
            this.log(`❌ 选择文件夹失败: ${error.message}`);
        }
    }

    async generateSidebar() {
        if (!this.hasValidConfig) {
            this.showModal('错误', '请先选择文档目录并创建配置文件', 'error');
            return;
        }
        
        try {
            this.setButtonLoading(this.generateBtn, true);
            this.updateStatus('正在生成 _sidebar.md...');
            this.log('🔄 开始生成侧边栏文件...');

            this.updateConfigFromUI();
            const result = await ipcRenderer.invoke('generate-sidebar', this.config);

            if (result.success) {
                this.updateStatus('生成完成');
                this.log(`✅ _sidebar.md 生成完成!`);
                this.log(`📄 处理了 ${result.result.fileCount} 个文件，${result.result.folderCount} 个文件夹`);
                this.log(`📁 输出路径: ${result.result.outputPath}`);
                this.showModal('成功', '侧边栏文件生成完成!', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.updateStatus('生成失败');
            this.log(`❌ 生成失败: ${error.message}`);
            this.showModal('错误', `生成失败: ${error.message}`, 'error');
        } finally {
            this.setButtonLoading(this.generateBtn, false);
        }
    }

    async checkEnvironment() {
        if (!this.hasValidConfig) {
            this.showModal('错误', '请先选择文档目录并创建配置文件', 'error');
            return;
        }
        
        try {
            this.setButtonLoading(this.checkEnvBtn, true);
            this.updateStatus('正在检查部署环境...');
            this.log('🔍 开始检查部署环境...');

            this.updateConfigFromUI();
            const result = await ipcRenderer.invoke('check-deployment', this.config);

            if (result.success) {
                this.updateStatus('环境检查通过');
                this.log(`✅ 环境检查通过: ${result.result.message}`);
                this.showModal('成功', '部署环境检查通过!', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.updateStatus('环境检查失败');
            this.log(`❌ 环境检查失败: ${error.message}`);
            this.showModal('错误', `环境检查失败: ${error.message}`, 'error');
        } finally {
            this.setButtonLoading(this.checkEnvBtn, false);
        }
    }

    async deploy() {
        if (!this.hasValidConfig) {
            this.showModal('错误', '请先选择文档目录并创建配置文件', 'error');
            return;
        }
        
        try {
            this.setButtonLoading(this.deployBtn, true);
            this.updateStatus('正在部署...');
            this.log('🚀 开始部署...');

            this.updateConfigFromUI();
            const result = await ipcRenderer.invoke('deploy', this.config);

            if (result.success) {
                this.updateStatus('部署完成');
                this.log(`✅ 部署完成: ${result.result.message}`);
                this.showModal('成功', '部署完成!', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.updateStatus('部署失败');
            this.log(`❌ 部署失败: ${error.message}`);
            this.showModal('错误', `部署失败: ${error.message}`, 'error');
        } finally {
            this.setButtonLoading(this.deployBtn, false);
        }
    }

    async saveConfig() {
        if (!this.hasValidConfig) {
            this.showModal('错误', '请先选择文档目录并创建配置文件', 'error');
            return;
        }
        
        try {
            this.setButtonLoading(this.saveConfigBtn, true);
            this.updateConfigFromUI();

            const result = await ipcRenderer.invoke('save-config', this.config);

            if (result.success) {
                this.log(`✅ 配置已保存`);
                this.showModal('成功', '配置保存成功!', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.log(`❌ 保存配置失败: ${error.message}`);
            this.showModal('错误', `保存配置失败: ${error.message}`, 'error');
        } finally {
            this.setButtonLoading(this.saveConfigBtn, false);
        }
    }

    async resetConfiguration() {
        try {
            // 清除持久化的配置
            await ipcRenderer.invoke('clear-last-config');
            
            // 重置当前应用状态
            this.config = null;
            this.hasValidConfig = false;
            
            // 清空 UI 输入
            this.docsDirInput.value = '';
            this.outputDirInput.value = '';
            this.deploymentTypeSelect.value = 'git';
            this.excludePatternsTextarea.value = '';
            
            const cloudflareProjectInput = document.getElementById('cloudflareProject');
            if (cloudflareProjectInput) {
                cloudflareProjectInput.value = '';
            }
            
            // 禁用功能按钮
            this.disableFeatures();
            
            // 清空日志
            this.clearLog();
            
            // 显示目录选择界面
            this.showDocsDirSelection();
            
            this.log('✅ 配置已重置，请重新选择文档目录');
            this.updateStatus('等待选择目录');
            
        } catch (error) {
            this.log(`❌ 重置配置失败: ${error.message}`);
            this.showModal('错误', `重置配置失败: ${error.message}`, 'error');
        }
    }

    clearLog() {
        this.logOutput.textContent = '欢迎使用 Docsify Helper! 🎉\\n\\n请先配置文档目录和输出目录，然后开始使用。\\n';
        this.log('📝 日志已清空');
    }

    updateStatus(status) {
        this.statusText.textContent = status;
    }

    log(message) {
        const timestamp = new Date().toLocaleTimeString('zh-CN');
        const logLine = `[${timestamp}] ${message}\\n`;
        this.logOutput.textContent += logLine;
        
        // 滚动到底部
        this.logOutput.scrollTop = this.logOutput.scrollHeight;
    }

    setButtonLoading(button, loading) {
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    toggleCloudflareProjectInput() {
        const cloudflareProjectGroup = document.getElementById('cloudflareProjectGroup');
        if (!cloudflareProjectGroup) return;

        const deploymentType = this.deploymentTypeSelect.value;
        if (deploymentType === 'cloudflare') {
            cloudflareProjectGroup.classList.remove('hidden');
        } else {
            cloudflareProjectGroup.classList.add('hidden');
        }
    }

    showModal(title, message, type = 'info') {
        this.modalTitle.textContent = title;
        this.modalMessage.textContent = message;
        this.modalMessage.className = type === 'success' ? 'success-message' : 
                                     type === 'error' ? 'error-message' : '';
        
        // 重置按钮文本和事件
        this.modalOk.textContent = '确定';
        this.modalCancel.textContent = '取消';
        this.modalOk.onclick = () => this.hideModal();
        this.modalCancel.onclick = () => this.hideModal();
        
        this.modal.style.display = 'block';

        // 自动关闭成功消息
        if (type === 'success') {
            setTimeout(() => {
                this.hideModal();
            }, 2000);
        }
    }

    hideModal() {
        this.modal.style.display = 'none';
    }
}

// 当 DOM 加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new DocsifyHelperUI();
});
