
function initCaptureButton() {
    if (document.getElementById('capture-binder-elements-button')) {
        return;
    }

    const captureButton = document.createElement('button');
    captureButton.id = 'capture-binder-elements-button';
    captureButton.type = 'button';
    captureButton.textContent = 'Capture mockup sample elements';
    captureButton.setAttribute('aria-label', 'Capture all binder elements as images');
    Object.assign(captureButton.style, {
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: '2147483647',
        padding: '10px 14px',
        backgroundColor: '#fff9c4',
        color: '#333',
        border: '2px solid #f2c100',
        borderRadius: '24px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
    });
    captureButton.addEventListener('click', captureAllBinderElementsAsImages);
    document.body.appendChild(captureButton);
}

async function captureAllBinderElementsAsImages() {
    const binderElements = Array.from(document.querySelectorAll('div.binder__element'))
        .filter((element) => {
            const titleText = element.querySelector('div.inline-input.primary')?.textContent || '';
            return titleText.toLowerCase().includes('sample');
        });

    for (let index = 0; index < binderElements.length; index += 1) {
        const element = binderElements[index];
        element.setAttribute('tabindex', '-1');
        element.classList.add('binder__element--focused');
        element.focus({ preventScroll: true });
        element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
        const previousOutline = element.style.outline;
        element.style.outline = '3px solid rgba(242, 193, 0, 0.9)';

        await new Promise((resolve) => setTimeout(resolve, 150));
        try {
            const dataUrl = await captureElementAsDataURL(element);
            downloadDataUrl(dataUrl, `binder-element-${index + 1}.png`);
        } catch (error) {
            console.error('Failed to capture binder element', error, element);
        } finally {
            element.classList.remove('binder__element--focused');
            element.style.outline = previousOutline || '';
        }
    }
}

function captureElementAsDataURL(element) {
    return new Promise((resolve, reject) => {
        const rect = element.getBoundingClientRect();
        const width = Math.ceil(rect.width);
        const height = Math.ceil(rect.height);

        if (width === 0 || height === 0) {
            reject(new Error('Element has zero width or height'));
            return;
        }

        const clone = cloneElementWithInlineStyles(element);
        const wrapper = document.createElement('div');
        wrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        wrapper.style.width = `${width}px`;
        wrapper.style.height = `${height}px`;
        wrapper.style.margin = '0';
        wrapper.style.padding = '0';
        wrapper.style.boxSizing = 'border-box';
        wrapper.appendChild(clone);

        const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
            `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
            `<foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(wrapper)}</foreignObject>` +
            `</svg>`;

        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            if (!context) {
                reject(new Error('Unable to create canvas context'));
                return;
            }
            context.drawImage(image, 0, 0, width, height);
            try {
                resolve(canvas.toDataURL('image/png'));
            } catch (error) {
                reject(error);
            }
        };
        image.onerror = reject;
        image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
}

function cloneElementWithInlineStyles(element) {
    const clone = element.cloneNode(false);
    if (element.nodeType === Node.ELEMENT_NODE) {
        copyComputedStyle(element, clone);
        element.childNodes.forEach((child) => {
            clone.appendChild(
                child.nodeType === Node.ELEMENT_NODE
                    ? cloneElementWithInlineStyles(child)
                    : child.cloneNode(true)
            );
        });
    }
    return clone;
}

function copyComputedStyle(source, target) {
    const style = window.getComputedStyle(source);
    for (let i = 0; i < style.length; i += 1) {
        const prop = style[i];
        target.style.setProperty(prop, style.getPropertyValue(prop), style.getPropertyPriority(prop));
    }
}

function downloadDataUrl(dataUrl, fileName) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function initPageFeatures() {
    initCaptureButton();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPageFeatures);
} else {
    initPageFeatures();
}

