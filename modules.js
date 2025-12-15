/**
 * 图片字幕生成器 - 模块化架构
 * 基于PRD文档的核心设计：Less is more, 默认智能，所见即所得, 核心变量解耦
 */

// ============================================================================
// 1. 颜色管理模块 - 负责文字颜色的智能分析和选择
// ============================================================================
class ColorManager {
    constructor() {
        this.recommendedColor = null; // 推荐的颜色（HSL格式）
        this.currentColor = null;     // 当前选中的颜色
        this.colorPicker = null;      // 隐藏的颜色选择器
        this.onColorChange = null;    // 颜色变化回调
        this.createColorPicker();
    }

    /**
     * 创建隐藏的颜色选择器
     * @private
     */
    createColorPicker() {
        this.colorPicker = document.createElement('input');
        this.colorPicker.type = 'color';
        this.colorPicker.style.opacity = '0';
        this.colorPicker.style.position = 'fixed';
        this.colorPicker.style.pointerEvents = 'none';
        this.colorPicker.style.width = '0';
        this.colorPicker.style.height = '0';
        document.body.appendChild(this.colorPicker);

        // 监听颜色变化
        this.colorPicker.addEventListener('input', (e) => {
            const hexColor = e.target.value;
            this.setCurrentColorHex(hexColor);
            if (this.onColorChange) {
                this.onColorChange(hexColor);
            }
        });
    }

    /**
     * 打开颜色选择器
     */
    openColorPicker() {
        if (this.colorPicker) {
            // 如果有推荐颜色，设置选择器的默认值
            if (this.recommendedColor) {
                const hexColor = this.hslToHex(
                    this.recommendedColor.h,
                    this.recommendedColor.s,
                    this.recommendedColor.l
                );
                this.colorPicker.value = hexColor;
            }
            this.colorPicker.click();
        }
    }

    /**
     * 设置颜色变化回调
     * @param {Function} callback - 回调函数
     */
    setOnColorChange(callback) {
        this.onColorChange = callback;
    }

    /**
     * 从HEX设置当前颜色
     * @param {string} hex - HEX颜色的值
     */
    setCurrentColorHex(hex) {
        // HEX转RGB
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        // RGB转HSL
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        this.currentColor = {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }

    /**
     * 分析图片的主色调，计算推荐的颜色
     * @param {HTMLImageElement} img - 需要分析的图片
     * @returns {Promise<Object>} HSL格式的推荐颜色
     */
    async analyzeImageColor(img) {
        return new Promise((resolve) => {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            const sampleSize = Math.min(img.width, img.height) * 0.5;

            tempCanvas.width = Math.floor(sampleSize);
            tempCanvas.height = Math.floor(sampleSize);

            // 采样中心区域
            tempCtx.drawImage(img,
                (img.width - sampleSize) / 2, (img.height - sampleSize) / 2,
                sampleSize, sampleSize,
                0, 0, 100, 100
            );

            const imageData = tempCtx.getImageData(0, 0, 100, 100);
            const pixels = imageData.data;

            let totalR = 0, totalG = 0, totalB = 0;

            for (let i = 0; i < pixels.length; i += 4) {
                totalR += pixels[i];
                totalG += pixels[i + 1];
                totalB += pixels[i + 2];
            }

            const count = pixels.length / 4;
            const avgR = totalR / count;
            const avgG = totalG / count;
            const avgB = totalB / count;

            // RGB转HSL
            const r = avgR / 255;
            const g = avgG / 255;
            const b = avgB / 255;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;

            if (max === min) {
                h = s = 0;
            } else {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                    case g: h = ((b - r) / d + 2) / 6; break;
                    case b: h = ((r - g) / d + 4) / 6; break;
                }
            }

            // 返回互补色作为推荐颜色
            this.recommendedColor = {
                h: Math.round(((h * 360) + 180) % 360),
                s: Math.round(Math.min(s * 100 * 0.8, 70)),
                l: Math.round(l * 100 > 50 ? 20 : 80)
            };

            // 如果没有当前颜色，使用推荐颜色
            if (!this.currentColor) {
                this.currentColor = { ...this.recommendedColor };
            }

            resolve(this.recommendedColor);
        });
    }

    /**
     * 获取当前颜色（HEX格式）
     * @returns {string} HEX颜色值
     */
    getCurrentColorHex() {
        if (!this.currentColor) {
            return '#FFFFFF';
        }
        return this.hslToHex(this.currentColor.h, this.currentColor.s, this.currentColor.l);
    }

    /**
     * 获取推荐颜色（HEX格式）
     * @returns {string} HEX颜色值
     */
    getRecommendedColorHex() {
        if (!this.recommendedColor) {
            return '#FFFFFF';
        }
        return this.hslToHex(this.recommendedColor.h, this.recommendedColor.s, this.recommendedColor.l);
    }

    /**
     * 设置当前颜色
     * @param {Object} hsl HSL格式的颜色
     */
    setCurrentColor(hsl) {
        this.currentColor = { ...hsl };
    }

    /**
     * 重置为推荐颜色
     */
    resetToRecommended() {
        if (this.recommendedColor) {
            this.currentColor = { ...this.recommendedColor };
        }
    }

    /**
     * HSL转HEX
     * @private
     */
    hslToHex(h, s, l) {
        h = h / 360;
        s = s / 100;
        l = l / 100;

        const hueToRgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        const r = hueToRgb(p, q, h + 1/3);
        const g = hueToRgb(p, q, h);
        const b = hueToRgb(p, q, h - 1/3);

        const toHex = (c) => {
            const hex = Math.round(c * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
}

// ============================================================================
// 2. 字体大小管理模块 - 负责字体大小的控制和显示
// ============================================================================
class FontSizeManager {
    constructor() {
        this.minSize = 24;
        this.maxSize = 60;
        this.currentSize = 40;
        this.defaultSize = 40;
    }

    /**
     * 根据图片宽度计算智能字体大小
     * @param {number} imageWidth - 图片宽度
     * @returns {number} 计算出的字体大小
     */
    calculateSmartSize(imageWidth) {
        const calculatedSize = Math.round(imageWidth * 0.04);
        return Math.max(this.minSize, Math.min(this.maxSize, calculatedSize));
    }

    /**
     * 设置当前字体大小
     * @param {number} size - 字体大小
     */
    setSize(size) {
        if (size >= this.minSize && size <= this.maxSize) {
            this.currentSize = size;
        }
    }

    /**
     * 获取当前字体大小
     * @returns {number} 当前字体大小
     */
    getSize() {
        return this.currentSize;
    }

    /**
     * 获取行高（基于字体大小自动计算）
     * @returns {number} 行高
     */
    getLineHeight() {
        return Math.round(this.currentSize * 1.8);
    }

    /**
     * 重置为默认值
     */
    reset() {
        this.currentSize = this.defaultSize;
    }
}

// ============================================================================
// 3. 图片管理模块 - 负责图片的上传、加载和预览
// ============================================================================
class ImageManager {
    constructor() {
        this.image = null;
        this.originalImage = null;
        this.onImageLoaded = null; // 图片加载完成回调
    }

    /**
     * 处理图片上传
     * @param {File} file - 上传的文件
     * @returns {Promise<HTMLImageElement>} 加载完成的图片
     */
    async handleUpload(file) {
        return new Promise((resolve, reject) => {
            // 验证文件类型
            if (!file.type.startsWith('image/')) {
                reject(new Error('请选择图片文件'));
                return;
            }

            // 验证文件大小（限制10MB）
            if (file.size > 10 * 1024 * 1024) {
                reject(new Error('图片大小不能超过10MB'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    this.image = img;
                    this.originalImage = img;
                    if (this.onImageLoaded) {
                        this.onImageLoaded(img);
                    }
                    resolve(img);
                };
                img.onerror = () => reject(new Error('图片加载失败'));
                img.src = event.target.result;
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * 获取当前图片
     * @returns {HTMLImageElement|null} 当前图片
     */
    getImage() {
        return this.image;
    }

    /**
     * 清除当前图片
     */
    clear() {
        this.image = null;
        this.originalImage = null;
    }

    /**
     * 检查是否有图片
     * @returns {boolean} 是否有图片
     */
    hasImage() {
        return this.image !== null;
    }
}

// ============================================================================
// 4. 渲染引擎 - 负责字幕的渲染和图片生成
// ============================================================================
class RenderEngine {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.fontFamily = 'Noto Sans SC, -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", "微软雅黑", Arial, sans-serif';
        this.fontWeight = '700';
        this.outlineColor = '#000000';
    }

    /**
     * 设置Canvas上下文
     * @param {HTMLCanvasElement} canvas - Canvas元素
     */
    setCanvas(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    /**
     * 渲染字幕图片
     * @param {Object} options - 渲染选项
     * @returns {string} 生成的图片DataURL
     */
    renderSubtitle(options) {
        const {
            image,
            text,
            fontSize,
            fontColor,
            lineHeight = Math.round(fontSize * 1.8)
        } = options;

        if (!this.ctx || !image) {
            return null;
        }

        // 设置Canvas尺寸
        this.canvas.width = image.width;
        this.canvas.height = image.height;

        // 绘制原始图片
        this.ctx.drawImage(image, 0, 0);

        // 如果文本为空，直接返回
        if (!text || text.trim() === '') {
            return this.canvas.toDataURL('image/png');
        }

        // 分割文本为多行
        const lines = this.splitText(text, image.width, fontSize);
        if (lines.length === 0) {
            return this.canvas.toDataURL('image/png');
        }

        // 字幕参数
        const lineSpacing = 8;
        const padding = 30;
        const bottomMargin = 30;
        const sideMargin = 40;

        // 计算总高度
        const totalHeight = lines.length * lineHeight + (lines.length - 1) * lineSpacing;
        let currentY = image.height - totalHeight - bottomMargin;

        // 设置字体
        this.ctx.font = `${this.fontWeight} ${fontSize}px ${this.fontFamily}`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // 渲染每一行字幕
        lines.forEach(line => {
            if (!line.trim()) return;

            const backgroundWidth = image.width - sideMargin * 2;
            const backgroundX = sideMargin;
            const backgroundY = currentY;

            // 绘制背景块
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            this.ctx.fillRect(backgroundX, backgroundY, backgroundWidth, lineHeight);

            // 绘制文字轮廓
            const textX = image.width / 2;
            const textY = currentY + lineHeight / 2;

            this.ctx.strokeStyle = this.outlineColor;
            this.ctx.lineWidth = Math.max(2, fontSize * 0.1);
            this.ctx.lineJoin = 'round';
            this.ctx.miterLimit = 2;
            this.ctx.strokeText(line, textX, textY);

            // 绘制文字填充
            this.ctx.fillStyle = fontColor;
            this.ctx.fillText(line, textX, textY);

            // 移动到下一行
            currentY += lineHeight + lineSpacing;
        });

        return this.canvas.toDataURL('image/png');
    }

    /**
     * 智能分割文本为多行
     * @private
     */
    splitText(text, imageWidth, fontSize) {
        const lines = [];
        const userLines = text.split('\n').filter(line => line.trim());

        this.ctx.font = `${this.fontWeight} ${fontSize}px ${this.fontFamily}`;
        const maxWidth = imageWidth - 80; // 左右边距各40px

        userLines.forEach(userLine => {
            const metrics = this.ctx.measureText(userLine);
            if (metrics.width <= maxWidth) {
                lines.push(userLine.trim());
            } else {
                // 需要自动换行
                lines.push(...this.wrapText(userLine, maxWidth));
            }
        });

        return lines;
    }

    /**
     * 自动换行
     * @private
     */
    wrapText(text, maxWidth) {
        const words = text.split('');
        const lines = [];
        let currentLine = '';

        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i];
            const metrics = this.ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine !== '') {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    }
}

// ============================================================================
// 5. UI控制器 - 负责UI交互和事件处理
// ============================================================================
class UIController {
    constructor(imageManager, fontSizeManager, colorManager, renderEngine) {
        this.imageManager = imageManager;
        this.fontSizeManager = fontSizeManager;
        this.colorManager = colorManager;
        this.renderEngine = renderEngine;

        this.elements = {};
        this.generatedImageData = null;
    }

    /**
     * 初始化UI，绑定元素和事件
     */
    init() {
        this.bindElements();
        this.bindEvents();
    }

    /**
     * 绑定DOM元素
     */
    bindElements() {
        this.elements = {
            imageInput: document.getElementById('imageInput'),
            uploadArea: document.getElementById('uploadArea'),
            replaceImageBtn: document.getElementById('replaceImageBtn'),
            fileName: document.getElementById('fileName'),
            previewCanvas: document.getElementById('previewCanvas'),
            previewPlaceholder: document.getElementById('previewPlaceholder'),
            saveBtn: document.getElementById('saveBtn'),
            notification: document.getElementById('notification'),
            fontSize: document.getElementById('fontSize'),
            fontSizeDisplay: document.getElementById('fontSizeDisplay'),
            subtitleContent: document.getElementById('subtitleContent'),
            controlToolbar: document.getElementById('controlToolbar'),
            colorPickerTrigger: document.getElementById('colorPickerTrigger'),
            colorPreview: document.getElementById('colorPreview'),
            colorPresetPanel: document.getElementById('colorPresetPanel'),
            customColorBtn: document.getElementById('customColorBtn')
        };

        // 设置Canvas
        if (this.elements.previewCanvas) {
            this.renderEngine.setCanvas(this.elements.previewCanvas);
        }
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 图片上传
        if (this.elements.uploadArea) {
            this.elements.uploadArea.addEventListener('click', () => {
                this.elements.imageInput.click();
            });
        }

        // 替换图片
        if (this.elements.replaceImageBtn) {
            this.elements.replaceImageBtn.addEventListener('click', () => {
                this.elements.imageInput.click();
            });
        }

        // 文件选择
        this.elements.imageInput.addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });

        // 字体大小变化
        if (this.elements.fontSize) {
            this.elements.fontSize.addEventListener('input', () => {
                const size = parseInt(this.elements.fontSize.value);
                this.fontSizeManager.setSize(size);

                if (this.elements.fontSizeDisplay) {
                    this.elements.fontSizeDisplay.textContent = size + 'px';
                }

                this.updatePreview();
            });

            // 初始化字体大小显示
            if (this.elements.fontSizeDisplay) {
                this.elements.fontSizeDisplay.textContent = this.elements.fontSize.value + 'px';
            }
        }

        // 颜色选择器
        if (this.elements.colorPickerTrigger) {
            // 点击触发器，显示/隐藏颜色预设面板
            this.elements.colorPickerTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const panel = this.elements.colorPresetPanel;
                if (panel) {
                    const isVisible = panel.style.display === 'block';
                    panel.style.display = isVisible ? 'none' : 'block';
                }
            });

            // 绑定颜色变化回调
            this.colorManager.setOnColorChange(() => {
                this.updatePreview();
                this.updateColorPreview();
            });
        }

        // 颜色预设面板
        if (this.elements.colorPresetPanel) {
            // 点击预设颜色
            const presetColors = this.elements.colorPresetPanel.querySelectorAll('.preset-color');
            presetColors.forEach(colorEl => {
                colorEl.addEventListener('click', () => {
                    const color = colorEl.getAttribute('data-color');
                    this.colorManager.setCurrentColorHex(color);
                    this.updatePreview();
                    this.updateColorPreview();
                    this.elements.colorPresetPanel.style.display = 'none';
                });
            });

            // 自定义颜色按钮
            if (this.elements.customColorBtn) {
                this.elements.customColorBtn.addEventListener('click', () => {
                    this.colorManager.openColorPicker();
                    this.elements.colorPresetPanel.style.display = 'none';
                });
            }
        }

        // 点击页面其他地方关闭颜色面板
        document.addEventListener('click', (e) => {
            if (this.elements.colorPresetPanel &&
                this.elements.colorPresetPanel.style.display === 'block' &&
                !this.elements.colorPickerTrigger.contains(e.target)) {
                this.elements.colorPresetPanel.style.display = 'none';
            }
        });

        // 字幕输入
        if (this.elements.subtitleContent) {
            this.elements.subtitleContent.addEventListener('input', () => {
                this.handleSubtitleChange();
            });
        }

        // 下载按钮
        if (this.elements.saveBtn) {
            this.elements.saveBtn.addEventListener('click', () => {
                this.saveImage();
            });
        }
    }

    /**
     * 处理图片上传
     */
    async handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // 清除之前的预览
            this.clearPreview();

            // 上传新图片
            const img = await this.imageManager.handleUpload(file);

            // 显示文件名
            if (this.elements.fileName) {
                this.elements.fileName.textContent = file.name;
            }

            // 智能分析颜色
            await this.colorManager.analyzeImageColor(img);

            // 更新UI
            this.updateUIWithImage(img);

        } catch (error) {
            alert(error.message);
        }
    }

    /**
     * 字幕内容变化处理
     */
    handleSubtitleChange() {
        const hasContent = this.elements.subtitleContent.value.trim().length > 0;

        // 显示/隐藏控制工具栏
        if (this.elements.controlToolbar) {
            this.elements.controlToolbar.style.display = hasContent ? 'flex' : 'none';
        }

        // 更新预览
        this.updatePreview();
    }

    /**
     * 更新预览
     */
    updatePreview() {
        if (this.imageManager.hasImage()) {
            const text = this.elements.subtitleContent.value;
            const size = this.fontSizeManager.getSize();
            const color = this.colorManager.getCurrentColorHex();

            const imageData = this.renderEngine.renderSubtitle({
                image: this.imageManager.getImage(),
                text: text,
                fontSize: size,
                fontColor: color
            });

            this.generatedImageData = imageData;

            // 更新保存按钮状态
            if (this.elements.saveBtn) {
                this.elements.saveBtn.disabled = !imageData || !text.trim();
            }

            // 更新颜色预览
            this.updateColorPreview();
        }
    }

    /**
     * 更新UI显示
     */
    updateUIWithImage(img) {
        // 显示预览
        this.elements.previewCanvas.style.display = 'block';
        this.elements.previewPlaceholder.classList.add('hidden');
        if (this.elements.uploadArea) {
            this.elements.uploadArea.style.display = 'none';
        }

        // 显示替换按钮
        if (this.elements.replaceImageBtn) {
            this.elements.replaceImageBtn.style.display = 'flex';
        }

        // 禁用保存按钮
        if (this.elements.saveBtn) {
            this.elements.saveBtn.disabled = true;
        }

        // 更新颜色预览
        this.updateColorPreview();

        // 显示原始图片
        this.renderEngine.setCanvas(this.elements.previewCanvas);
        this.renderEngine.renderSubtitle({
            image: img,
            text: '',
            fontSize: this.fontSizeManager.getSize(),
            fontColor: this.colorManager.getCurrentColorHex()
        });
    }

    /**
     * 更新颜色预览
     */
    updateColorPreview() {
        if (this.elements.colorPreview) {
            const color = this.colorManager.getCurrentColorHex();
            this.elements.colorPreview.style.backgroundColor = color;
            // 移除网格背景图案，让纯色更清晰
            this.elements.colorPreview.style.backgroundImage = 'none';
        }
    }

    /**
     * 清除预览
     */
    clearPreview() {
        this.imageManager.clear();
        this.generatedImageData = null;

        if (this.elements.previewCanvas) {
            this.elements.previewCanvas.style.display = 'none';
        }
        if (this.elements.previewPlaceholder) {
            this.elements.previewPlaceholder.classList.remove('hidden');
        }
        if (this.elements.uploadArea) {
            this.elements.uploadArea.style.display = 'flex';
        }
        if (this.elements.replaceImageBtn) {
            this.elements.replaceImageBtn.style.display = 'none';
        }
        if (this.elements.controlToolbar) {
            this.elements.controlToolbar.style.display = 'none';
        }
        if (this.elements.saveBtn) {
            this.elements.saveBtn.disabled = true;
        }
        if (this.elements.fileName) {
            this.elements.fileName.textContent = '';
        }
    }

    /**
     * 保存图片
     */
    saveImage() {
        if (!this.generatedImageData) {
            alert('请先生成字幕图片');
            return;
        }

        const link = document.createElement('a');
        link.download = `subtitle-image-${Date.now()}.png`;
        link.href = this.generatedImageData;
        link.click();
    }
}
