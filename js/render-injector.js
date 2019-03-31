export default function renderInjector(addFrameworkRefrence) {
    //复写render方法
    //源码在ueditor.all.js 6869行

    //ling:添加一个默认加入element-ui依赖的方法
    addFrameworkRefrence = addFrameworkRefrence || function () {
        return '<link rel=\'stylesheet\' href=\'https://unpkg.com/element-ui/lib/theme-chalk/index.css\'>' +
            '<script type=\'text/javascript\' src=\'https://vuejs.org/js/vue.min.js\'></script>' +
            '<script src=\'https://unpkg.com/element-ui/lib/index.js\'></script>'
    }

    //添加原方法依赖的闭包变量
    const { utils, dom: { domUtils } } = baidu.editor
    const { ie } = UE.browser

    //修改后的原方法
    const render = function (container, addFrameworkRefrence) {
        var me = this,
            options = me.options,
            getStyleValue = function (attr) {
                return parseInt(domUtils.getComputedStyle(container, attr));
            };

        if (utils.isString(container)) {
            container = document.getElementById(container);
        }
        if (container) {
            if (options.initialFrameWidth) {
                options.minFrameWidth = options.initialFrameWidth
            } else {
                options.minFrameWidth = options.initialFrameWidth = container.offsetWidth;
            }
            if (options.initialFrameHeight) {
                options.minFrameHeight = options.initialFrameHeight
            } else {
                options.initialFrameHeight = options.minFrameHeight = container.offsetHeight;
            }

            container.style.width = /%$/.test(options.initialFrameWidth) ? '100%' : options.initialFrameWidth -
                getStyleValue("padding-left") - getStyleValue("padding-right") + 'px';
            container.style.height = /%$/.test(options.initialFrameHeight) ? '100%' : options.initialFrameHeight -
                getStyleValue("padding-top") - getStyleValue("padding-bottom") + 'px';

            container.style.zIndex = options.zIndex;

            var html = (ie && browser.version < 9 ? '' : '<!DOCTYPE html>') +
                '<html xmlns=\'http://www.w3.org/1999/xhtml\' class=\'view\' ><head>' +
                '<style type=\'text/css\'>' +
                '.view{padding:0;word-wrap:break-word;cursor:text;height:90%;}\n' +
                'body{margin:8px;font-family:sans-serif;font-size:16px;}' +
                'p{margin:5px 0;}</style>' +
                (options.iframeCssUrl ? '<link rel=\'stylesheet\' type=\'text/css\' href=\'' + utils.unhtml(options.iframeCssUrl) + '\'/>' : '') +
                //ling:就加这一句
                addFrameworkRefrence() +
                (options.initialStyle ? '<style>' + options.initialStyle + '</style>' : '') +
                '</head><body class=\'view\' ></body>' +
                '<script type=\'text/javascript\' ' + (ie ? 'defer=\'defer\'' : '') + ' id=\'_initialScript\'>' +
                'setTimeout(function(){editor = window.parent.UE.instants[\'ueditorInstant' + me.uid + '\'];editor._setup(document);},0);' +
                'var _tmpScript = document.getElementById(\'_initialScript\');_tmpScript.parentNode.removeChild(_tmpScript);</script></html>';

            container.appendChild(domUtils.createElement(document, 'iframe', {
                id: 'ueditor_' + me.uid,
                width: "100%",
                height: "100%",
                frameborder: "0",
                src: 'javascript:void(function(){document.open();' + (options.customDomain && document.domain != location.hostname ? 'document.domain="' + document.domain + '";' : '') +
                    'document.write("' + html + '");document.close();}())'
            }));
            container.style.overflow = 'hidden';
            setTimeout(function () {
                if (/%$/.test(options.initialFrameWidth)) {
                    options.minFrameWidth = options.initialFrameWidth = container.offsetWidth;
                }
                if (/%$/.test(options.initialFrameHeight)) {
                    options.minFrameHeight = options.initialFrameHeight = container.offsetHeight;
                    container.style.height = options.initialFrameHeight + 'px';
                }
            })
        }
    }

    UE.Editor.prototype.render = function (container) {
        render.call(this, container, addFrameworkRefrence)
    }

}