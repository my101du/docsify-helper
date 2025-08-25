const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { ConfigManager } = require('./config');
const { SidebarGenerator } = require('./generator');
const { DeploymentManager } = require('./deployment');

class DocsifyHelperApp {
    constructor() {
        this.mainWindow = null;
        this.configManager = new ConfigManager();
        this.generator = new SidebarGenerator();
        this.deployment = new DeploymentManager();
    }

    async createWindow() {
        // 创建浏览器窗口
        this.mainWindow = new BrowserWindow({
            width: 900,
            height: 700,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true
            },
            icon: path.join(__dirname, '../assets/icon.png'),
            title: 'Docsify Helper',
            minWidth: 800,
            minHeight: 600
        });

        // 加载应用的 index.html
        await this.mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

        // 开发模式下打开开发者工具
        if (process.argv.includes('--dev')) {
            this.mainWindow.webContents.openDevTools();
        }
    }

    setupIPC() {
        // 加载上次配置
        ipcMain.handle('load-last-config', async () => {
            try {
                return await this.configManager.loadLastConfig();
            } catch (error) {
                console.error('加载上次配置失败:', error);
                return null;
            }
        });

        // 清除上次配置
        ipcMain.handle('clear-last-config', async () => {
            try {
                await this.configManager.clearLastConfig();
                return true;
            } catch (error) {
                console.error('清除上次配置失败:', error);
                return false;
            }
        });

        // 保存最后配置
        ipcMain.handle('save-last-config', async (event, config) => {
            try {
                await this.configManager.saveLastConfig(config);
                return true;
            } catch (error) {
                console.error('保存最后配置失败:', error);
                return false;
            }
        });

        // 设置文档目录
        ipcMain.handle('set-docs-dir', async (event, docsDir) => {
            try {
                await this.configManager.setDocsDir(docsDir);
                const isValid = await this.configManager.isDocsDirValid();
                if (!isValid) {
                    throw new Error('指定的目录不存在或不是有效目录');
                }
                return true;
            } catch (error) {
                console.error('设置文档目录失败:', error);
                throw error;
            }
        });

        // 检查是否有配置文件
        ipcMain.handle('has-config', async () => {
            try {
                return await this.configManager.hasConfig();
            } catch (error) {
                console.error('检查配置文件失败:', error);
                return false;
            }
        });

        // 创建默认配置文件
        ipcMain.handle('create-config', async () => {
            try {
                return await this.configManager.createDefaultConfig();
            } catch (error) {
                console.error('创建配置文件失败:', error);
                throw error;
            }
        });

        // 加载配置
        ipcMain.handle('load-config', async () => {
            try {
                return await this.configManager.loadConfig();
            } catch (error) {
                console.error('加载配置失败:', error);
                throw error;
            }
        });

        // 保存配置
        ipcMain.handle('save-config', async (event, config) => {
            try {
                await this.configManager.saveConfig(config);
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // 选择文件夹
        ipcMain.handle('select-folder', async () => {
            const result = await dialog.showOpenDialog(this.mainWindow, {
                properties: ['openDirectory'],
                title: '选择文件夹'
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
                return result.filePaths[0];
            }
            return null;
        });

        // 生成侧边栏
        ipcMain.handle('generate-sidebar', async (event, config) => {
            try {
                this.generator.setConfig(config);
                const result = await this.generator.generateSidebar();
                return { success: true, result };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // 检查部署环境
        ipcMain.handle('check-deployment', async (event, config) => {
            try {
                this.deployment.setConfig(config);
                const result = await this.deployment.checkEnvironment();
                return { success: true, result };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // 执行部署
        ipcMain.handle('deploy', async (event, config) => {
            try {
                this.deployment.setConfig(config);
                const result = await this.deployment.deploy();
                return { success: true, result };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // 保存文件对话框
        ipcMain.handle('save-file-dialog', async () => {
            const result = await dialog.showSaveDialog(this.mainWindow, {
                title: '保存配置文件',
                defaultPath: 'config.yaml',
                filters: [
                    { name: 'YAML 文件', extensions: ['yaml', 'yml'] },
                    { name: '所有文件', extensions: ['*'] }
                ]
            });
            
            if (!result.canceled) {
                return result.filePath;
            }
            return null;
        });
    }

    async initialize() {
        // 当应用准备就绪时创建窗口
        await app.whenReady();
        
        this.setupIPC();
        await this.createWindow();

        // 当所有窗口都关闭时退出应用 (macOS 除外)
        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        // 当应用被激活时重新创建窗口 (macOS)
        app.on('activate', async () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                await this.createWindow();
            }
        });
    }
}

// 防止多实例运行
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        // 当运行第二个实例时，聚焦到主窗口
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    // 创建应用实例并初始化
    const docsifyHelper = new DocsifyHelperApp();
    docsifyHelper.initialize().catch(console.error);
}
