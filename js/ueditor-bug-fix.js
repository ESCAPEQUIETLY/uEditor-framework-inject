//修改command[elementpath]，注释节点会导致的bug
//因为闭包变量的依赖只能全部重写
//bug原因是大量的node属性操作未做足够的类型判断，非空判断，比如node.tagName.toLowerCase
{

    window.ueditorBugFix = function (ue) {
        const { utils, dom: { domUtils } } = baidu.editor

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

        {

        }
    }
}