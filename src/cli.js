#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const fs = require('fs-extra');
const yaml = require('yaml');
const { ConfigManager } = require('./config');
const { SidebarGenerator } = require('./generator');
const { DeploymentManager } = require('./deployment');

const program = new Command();

program
    .name('docsify-helper')
    .description('Docsify 文档自动化工具')
    .version('1.0.0');

program
    .option('-c, --config <path>', '配置文件路径', 'config.yaml')
    .option('-d, --docs <path>', '文档目录路径')
    .option('-o, --output <path>', '输出目录路径')
    .option('--deployment-type <type>', '部署类型 (git|cloudflare)');

program
    .command('generate')
    .description('生成 _sidebar.md 文件')
    .action(async (options) => {
        try {
            console.log('🔍 正在生成 _sidebar.md 文件...');
            
            const config = await loadConfig(program.opts());
            const generator = new SidebarGenerator();
            generator.setConfig(config);
            
            const result = await generator.generateSidebar();
            
            console.log('✅ 生成完成!');
            console.log(`📁 输出路径: ${result.outputPath}`);
            console.log(`📄 文件数量: ${result.fileCount}`);
            console.log(`📂 文件夹数量: ${result.folderCount}`);
        } catch (error) {
            console.error('❌ 生成失败:', error.message);
            process.exit(1);
        }
    });

program
    .command('check')
    .description('检查部署环境')
    .action(async () => {
        try {
            console.log('🔍 正在检查部署环境...');
            
            const config = await loadConfig(program.opts());
            const deployment = new DeploymentManager();
            deployment.setConfig(config);
            
            const result = await deployment.checkEnvironment();
            
            console.log('✅ 环境检查通过!');
            console.log(`📋 ${result.message}`);
        } catch (error) {
            console.error('❌ 环境检查失败:', error.message);
            process.exit(1);
        }
    });

program
    .command('deploy')
    .description('部署文档')
    .option('--skip-generate', '跳过生成 _sidebar.md')
    .action(async (options) => {
        try {
            const config = await loadConfig(program.opts());
            
            // 默认先生成侧边栏
            if (!options.skipGenerate) {
                console.log('🔍 正在生成 _sidebar.md 文件...');
                const generator = new SidebarGenerator();
                generator.setConfig(config);
                await generator.generateSidebar();
                console.log('✅ _sidebar.md 生成完成!');
            }
            
            console.log('🚀 正在部署...');
            
            const deployment = new DeploymentManager();
            deployment.setConfig(config);
            
            const result = await deployment.deploy();
            
            console.log('✅ 部署完成!');
            console.log(`📋 ${result.message}`);
        } catch (error) {
            console.error('❌ 部署失败:', error.message);
            process.exit(1);
        }
    });

program
    .command('config')
    .description('配置管理')
    .option('--show', '显示当前配置')
    .option('--init', '初始化默认配置')
    .action(async (options) => {
        try {
            const configManager = new ConfigManager();
            
            if (options.init) {
                console.log('🔧 正在创建默认配置...');
                const defaultConfig = configManager.getDefaultConfig();
                await configManager.saveConfig(defaultConfig);
                console.log('✅ 默认配置已创建: config.yaml');
                return;
            }
            
            if (options.show) {
                const config = await loadConfig(program.opts());
                console.log('📋 当前配置:');
                console.log(JSON.stringify(config, null, 2));
                return;
            }
            
            // 默认显示帮助
            console.log('请使用 --show 显示配置或 --init 初始化配置');
        } catch (error) {
            console.error('❌ 配置操作失败:', error.message);
            process.exit(1);
        }
    });

async function loadConfig(options) {
    const configManager = new ConfigManager();
    
    // CLI 模式：使用传统的配置文件加载方式
    const configPath = options.config || path.join(process.cwd(), 'config.yaml');
    
    try {
        // 检查配置文件是否存在
        if (!await fs.pathExists(configPath)) {
            throw new Error(`配置文件不存在: ${configPath}`);
        }
        
        // 读取并解析配置文件
        const configContent = await fs.readFile(configPath, 'utf8');
        const yaml = require('yaml');
        let config = yaml.parse(configContent);
        
        // 合并默认配置
        const defaultConfig = configManager.getDefaultConfig();
        config = configManager.mergeWithDefaults(config || {});
        
        // 命令行参数覆盖配置文件
        if (options.docs) {
            config.docsDir = options.docs;
        }
        
        if (options.output) {
            config.outputDir = options.output;
        }
        
        return config;
    } catch (error) {
        throw new Error(`加载配置失败: ${error.message}`);
    }
}

// 错误处理
process.on('uncaughtException', (error) => {
    console.error('❌ 未捕获的异常:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未处理的 Promise 拒绝:', reason);
    process.exit(1);
});

// 解析命令行参数
program.parse();

// 如果没有提供任何命令，显示帮助
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
