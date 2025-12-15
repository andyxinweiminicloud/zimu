/**
 * 图片字幕生成器 - 主应用程序
 * 使用模块化架构，支持未来扩展（水印、AI润色等）
 */

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', () => {
    // 初始化核心模块
    const imageManager = new ImageManager();
    const fontSizeManager = new FontSizeManager();
    const colorManager = new ColorManager();
    const renderEngine = new RenderEngine();

    // 初始化UI控制器
    const uiController = new UIController(
        imageManager,
        fontSizeManager,
        colorManager,
        renderEngine
    );

    // 启动应用
    uiController.init();

    console.log('图片字幕生成器已启动！');
    console.log('架构：模块化设计，支持未来扩展');
    console.log('模块：ImageManager, FontSizeManager, ColorManager, RenderEngine, UIController');
});
