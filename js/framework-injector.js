//注入导致的bug修复，功能实现
import needCover from './need-cover.js'
//样式框架注入器,默认element-ui
import renderInjector from "./render-injector.js";

renderInjector()

const getEditor = function (container) {
    const ue = UE.getEditor(container)

    ue.setOpt({
        'allowDivTransToP': false,
        'disabledTableInTable': true
    })

    ue.addListener('ready', function () {
        needCover(this)
    })

    return ue
}

const getNeedInitComponentContainerList = function (doc) {
    const body = doc.body
    const componentContainerList = []

    function markVueComponent(node) {
        const children = node.children
        if (!children || children.length < 1) {
            return
        }

        for (let i = 0; i < children.length; i++) {
            if (children[i].nodeType === 1) {
                if (children[i].nodeName.toLowerCase().startsWith('el-')) {
                    let parent = children[i].parentElement
                    if (parent && parent.nodeName === 'BODY') {
                        parent = children[i]
                    }

                    const originalHtml = parent.outerHTML
                    parent.id = `component-id-${componentContainerList.length}`
                    parent.contentEditable = false

                    const data = {
                        index: componentContainerList.length,
                        id: parent.id,
                        container: parent,
                        outerHTML: parent.outerHTML,
                        originalHtml: originalHtml
                    }

                    componentContainerList.push(data)

                } else {
                    markVueComponent(children[i])
                }
            }
        }
    }

    markVueComponent(body)

    //由于需要编译的部分是不能进行编辑的，所以当body最后一个元素是不能进行编辑的，需要采用相同规则：补充一个p占位
    if (body.children.length > 0) {
        if (componentContainerList.some(item => {
            return item.container === body.children[body.children.length - 1]
        })) {
            const p = doc.createElement('p')
            p.innerHTML = '<br />'
            body.appendChild(p)
        }
    }

    return componentContainerList
}

const createJsTemplate = function (item) {
    return `new Vue({
                el:'#${item.id}',
                     beforeMount(){
                        ${(item.getBeforeMount && `(${item.getBeforeMount.toString()})()`) || ''}
                     },
                    mounted(){
                        window.parent.componentContainerList[${item.index}].compileOuterHtml=this.$el.outerHTML
                        ${(item.getMounted && `(${item.getMounted.toString()})()`) || ''}
                     }
            })`
    //     beforeCreate(){
    //         ${item.getBeforeCreate()}
    //     }
    //     created(){
    //         ${item.getCreated()}
    //     }
}

const getUeditorHtml = function (html, format) {
    //这里执行和ueditor的getContent方法相同操作流程
    //root.traversal 操作没加，代码太多影响阅读
    let root = UE.htmlparser(html)
    ue.filterOutputRule(root)
    return root.toHtml(format)
}

const getDecompileHtml = function (html, componentContainerList, format) {
    if (!html) {
        return ''
    }
    let newHtml = html
    if (componentContainerList && componentContainerList.length > 0) {
        componentContainerList.forEach(item => {
            //这里保持和sourcemode的源生change事件一致
            item.compileOuterHtml = getUeditorHtml(item.compileOuterHtml, format)
            newHtml = newHtml.replace(item.compileOuterHtml, item.originalHtml)
        })
    }
    if (newHtml.endsWith('<p><br/></p>')) {
        newHtml = newHtml.substring(0, newHtml.length - '<p><br/></p>'.length)
    }
    console.log(newHtml)
    return newHtml
}

const setDecompileHtmlToContent = function (ue, componentContainerList, format) {
    let html = ue.getContent()
    let decompileHtml = html
    decompileHtml = getDecompileHtml(html, componentContainerList, format)
    ue.setContent(decompileHtml)
}

export default {
    getEditor,
    getNeedInitComponentContainerList,
    createJsTemplate,
    getUeditorHtml,
    getDecompileHtml,
    setDecompileHtmlToContent
}