//修改command[elementpath]，注释节点会导致的bug
//因为闭包变量的依赖只能全部重写
//bug原因是大量的node属性操作未做足够的类型判断，非空判断，比如node.tagName.toLowerCase
{

    window.ueditorNeedCover = function (ue) {
        const { utils, dom, browser } = baidu.editor
        const { domUtils } = dom
        {
            let currentLevel,
                tagNames

            ue.commands.elementpath.execCommand = function (cmdName, level) {
                (function (cmdName, level) {
                    let start = tagNames[level],
                        range = me.selection.getRange()
                    currentLevel = level * 1
                    range.selectNode(start).select()
                }).call(ue, cmdName, level)
            }

            ue.commands.elementpath.queryCommandValue = function () {
                (function () {
                    let parents = [].concat(this.selection.getStartElementPath()).reverse(),
                        names = []
                    tagNames = parents
                    for (let i = 0, ci; ci = parents[i]; i++) {
                        if (ci.nodeType === 3 || ci.nodeType === 8) {
                            continue
                        }
                        let name = (ci.tagName && ci.tagName.toLowerCase()) || ''
                        if (name == 'img' && ci.getAttribute('anchorname')) {
                            name = 'anchor'
                        }
                        names[i] = name
                        if (currentLevel == i) {
                            currentLevel = -1
                            break
                        }
                    }
                    return names
                }).call(ue)
            }
        }

        {
            ue.commands.customstyle.queryCommandValue = function () {
                (function () {
                    var parent = domUtils.filterNodeList(
                        this.selection.getStartElementPath(),
                        function (node) { return (node.getAttribute && node.getAttribute('label')) || '' }
                    )
                    return parent ? parent.getAttribute('label') : ''
                }).call(this)
            }
        }

        {
            let sourceMode = false
            let sourceEditor
            let me = ue
            let opt = ue.options
            let dtd = dom.dtd

            ue.commands.source.execCommand = function () {

                (function () {

                    function createSourceEditor(holder) {
                        return sourceEditors[opt.sourceEditor == 'codemirror' && window.CodeMirror ? 'codemirror' : 'textarea'](me, holder);
                    }

                    const sourceEditors = {
                        textarea: function (editor, holder) {
                            var textarea = holder.ownerDocument.createElement('textarea');
                            textarea.style.cssText = 'position:absolute;resize:none;width:100%;height:100%;border:0;padding:0;margin:0;overflow-y:auto;';
                            // todo: IE下只有onresize属性可用... 很纠结
                            if (browser.ie && browser.version < 8) {
                                textarea.style.width = holder.offsetWidth + 'px';
                                textarea.style.height = holder.offsetHeight + 'px';
                                holder.onresize = function () {
                                    textarea.style.width = holder.offsetWidth + 'px';
                                    textarea.style.height = holder.offsetHeight + 'px';
                                };
                            }
                            holder.appendChild(textarea);
                            return {
                                setContent: function (content) {
                                    textarea.value = content;
                                },
                                getContent: function () {
                                    return textarea.value;
                                },
                                select: function () {
                                    var range;
                                    if (browser.ie) {
                                        range = textarea.createTextRange();
                                        range.collapse(true);
                                        range.select();
                                    } else {
                                        //todo: chrome下无法设置焦点
                                        textarea.setSelectionRange(0, 0);
                                        textarea.focus();
                                    }
                                },
                                dispose: function () {
                                    holder.removeChild(textarea);
                                    // todo
                                    holder.onresize = null;
                                    textarea = null;
                                    holder = null;
                                }
                            };
                        },
                        codemirror: function (editor, holder) {

                            var codeEditor = window.CodeMirror(holder, {
                                mode: "text/html",
                                tabMode: "indent",
                                lineNumbers: true,
                                lineWrapping: true
                            });
                            var dom = codeEditor.getWrapperElement();
                            dom.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;font-family:consolas,"Courier new",monospace;font-size:13px;';
                            codeEditor.getScrollerElement().style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;';
                            codeEditor.refresh();
                            return {
                                getCodeMirror: function () {
                                    return codeEditor;
                                },
                                setContent: function (content) {
                                    codeEditor.setValue(content);
                                },
                                getContent: function () {
                                    return codeEditor.getValue();
                                },
                                select: function () {
                                    codeEditor.focus();
                                },
                                dispose: function () {
                                    holder.removeChild(dom);
                                    dom = null;
                                    codeEditor = null;
                                }
                            };
                        }
                    }

                    sourceMode = !sourceMode;

                    if (sourceMode) {
                        bakAddress = me.selection.getRange().createAddress(false, true);
                        me.undoManger && me.undoManger.save(true);
                        if (browser.gecko) {
                            me.body.contentEditable = false;
                        }

                        bakCssText = me.iframe.style.cssText;
                        me.iframe.style.cssText += 'position:absolute;left:-32768px;top:-32768px;';

                        me.fireEvent('beforegetcontent');
                        var root = UE.htmlparser(me.body.innerHTML);
                        me.filterOutputRule(root);
                        root.traversal(function (node) {
                            if (node.type == 'element') {
                                switch (node.tagName) {
                                    case 'td':
                                    case 'th':
                                    case 'caption':
                                        if (node.children && node.children.length == 1) {
                                            if (node.firstChild().tagName == 'br') {
                                                node.removeChild(node.firstChild())
                                            }
                                        };
                                        break;
                                    case 'pre':
                                        node.innerText(node.innerText().replace(/&nbsp;/g, ' '))

                                }
                            }
                        });

                        me.fireEvent('aftergetcontent');

                        var content = root.toHtml(true);

                        sourceEditor = createSourceEditor(me.iframe.parentNode);
                        sourceEditor.setContent(content);

                        orgSetContent = me.setContent;

                        me.setContent = function (html) {
                            var root = UE.htmlparser(html);
                            me.filterInputRule(root);
                            html = root.toHtml(true);
                            sourceEditor.setContent(html);
                        };

                        setTimeout(function () {
                            sourceEditor.select();
                            me.addListener('fullscreenchanged', function () {
                                try {
                                    sourceEditor.getCodeMirror().refresh()
                                } catch (e) { }
                            });
                        });

                        oldGetContent = me.getContent;
                        me.getContent = function () {
                            return sourceEditor.getContent() || '<p>' + (browser.ie ? '' : '<br/>') + '</p>';
                        };

                    } else {
                        me.iframe.style.cssText = bakCssText;
                        var cont = sourceEditor.getContent() || '<p>' + (browser.ie ? '' : '<br/>') + '</p>';
                        //处理掉block节点前后的空格,有可能会误命中，暂时不考虑
                        cont = cont.replace(new RegExp('[\\r\\t\\n ]*<\/?(\\w+)\\s*(?:[^>]*)>', 'g'), function (a, b) {
                            if (b && !dtd.$inlineWithA[b.toLowerCase()]) {
                                return a.replace(/(^[\n\r\t ]*)|([\n\r\t ]*$)/g, '');
                            }
                            return a.replace(/(^[\n\r\t]*)|([\n\r\t]*$)/g, '')
                        });

                        me.setContent = orgSetContent;
                        me.setContent(cont);
                        sourceEditor.dispose();
                        sourceEditor = null;
                        //还原getContent方法
                        me.getContent = oldGetContent;
                        var first = me.body.firstChild;

                        //trace:1106 都删除空了，下边会报错，所以补充一个p占位
                        if (!first) {
                            me.body.innerHTML = '<p>' + (browser.ie ? '' : '<br/>') + '</p>';
                            first = me.body.firstChild;
                        }

                        //要在ifm为显示时ff才能取到selection,否则报错
                        //这里不能比较位置了
                        me.undoManger && me.undoManger.save(true);

                        if (browser.gecko) {

                            var input = document.createElement('input');
                            input.style.cssText = 'position:absolute;left:0;top:-32768px';

                            document.body.appendChild(input);

                            me.body.contentEditable = false;
                            setTimeout(function () {
                                domUtils.setViewportOffset(input, { left: -32768, top: 0 });
                                input.focus();
                                setTimeout(function () {
                                    me.body.contentEditable = true;
                                    me.selection.getRange().moveToAddress(bakAddress).select(true);
                                    domUtils.remove(input);
                                });

                            });
                        } else {
                            //ie下有可能报错，比如在代码顶头的情况
                            try {
                                me.selection.getRange().moveToAddress(bakAddress).select(true);
                            } catch (e) { }

                        }
                    }
                    this.fireEvent('sourcemodechanged', sourceMode);
                }).call(this)
            }
        }

        {
            baidu.editor.dom.domUtils.filterNodeList = function (nodelist, filter, forAll) {
                (function () {
                    let results = []
                    if (!utils.isFunction(filter)) {
                        let str = filter
                        filter = function (n) {
                            if (!n.tagName) {
                                return
                            }
                            return utils.indexOf(utils.isArray(str) ? str : str.split(' '), n.tagName.toLowerCase()) != -1
                        }
                    }

                    utils.each(nodelist, function (n) {
                        filter(n) && results.push(n)
                    })

                    return results.length == 0 ? null : results.length == 1 || !forAll ? results[0] : results
                }).call(baidu.editor.dom, nodelist, filter, forAll)
            }
        }
    }
}