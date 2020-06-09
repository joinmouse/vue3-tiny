/* 
* vue3 响应式原理
* 2020/6/5
*/
function isObject(val) {
    return typeof val === 'object' && val !== null
}
function hasOwn(target, key) {
    return target.hasOwnProperty(key)
}

// hash表 映射表 ES6 弱引用映射表 WeakMap
let toProxy = new WeakMap()  //放置 原对象: 代理过的对象
let toRow = new WeakMap()    //放置 被代理过的对象: 原对象

// 1、响应式对象核心方法
function reactive(target) {
    // 判断传入的target是否是一个对象
    if(isObject(target)) {
        return createReactiveObject(target)
    }else {
        return target
    }
}

// 2、创建响应式对象
function createReactiveObject(target) {
    // 若已经代理过了，就将已经代理的对象返回
    let proxy = toProxy.get(target)
    if(proxy) {
        return proxy
    }
    // 防止已经代理过的对象，多次被代理
    if(toRow.has(target)) {
        return target
    }

    // reflect 反射, 有返回值 会替代掉Object上的方法
    let baseHandle = {
        // target 目标对象
        // receiver 代理后的对象(proxy)
        get(target, key, receiver) {
            let result = Reflect.get(target, key, receiver)
            // 收集依赖, 将key和effect对应起来
            track(target, key)
            // 多层代理
            return isObject(result) ? reactive(result) : result
        },
        set(target, key, value, receiver) {
            let hasKey = hasOwn(target, key)
            let oldValue = target[key]
            // flag为布尔值, 是否设置成功
            let flag = Reflect.set(target, key, value, receiver)
            // 解决数组length等属性重复修改等问题
            if(!hasKey) {
                console.log('新增属性')
                // 触发
                trigger(target, 'add', key)
            }else if(oldValue !== value) {   // 屏蔽无意义的属性修改
                console.log('修改属性')
                trigger(target, 'set', key)
            }
            return flag
        },
        deleteProperty(target, key) {
            let flag = Reflect.deleteProperty(target, key)
            console.log('delete')
            return flag
        }
    }
    // ES6 proxy
    let observe = new Proxy(target, baseHandle)
    toProxy.set(target, observe)
    toRow.set(observe, target)
    return observe
}

// 响应式 副作用

// 收集依赖
// target : {
//    key1: new Set() [fn, fn, ...]
//    key2: new Set() [fn, fn, ...]  
// }
let activeEffectStacks = []
let tragetsMap = new WeakMap()
// 3、建立依赖收集
function track(target, key) {
    // 取最后一个
    if(activeEffectStacks.length > 0) {
       let effect = activeEffectStacks[activeEffectStacks.length - 1]
       // 如果有对应关系, 建立关联, 动态创建
       let depsMap = tragetsMap.get(target)
        if(!depsMap) {
            tragetsMap.set(target, depsMap = new Map())
        }
        let deps = depsMap.get(key)
        if(!deps) {
            depsMap.set(key, deps = new Set())
        }
        if(!deps.has(effect)) {
            deps.add(effect)
            console.log('--------')
            console.log(deps)
            console.log(depsMap)
            console.log(tragetsMap)
            console.log('--------')
        }
    }
}
// 4、响应式触发
function trigger(target, type, key) {
    let depsMap = tragetsMap.get(target)
    if(depsMap) {
        let deps = depsMap.get(key)
        if(deps) {
            // deps存的effect依次执行
            deps.forEach(effect => {
                effect()
            })
        }
    }
}
// 5、effect的调用执行
function effect(fn) {
    let effect = createReactiveEffect(fn)
    effect()  // 默认先执行一次，调用run(effect, fn)
}
function createReactiveEffect(fn) {
    let effect = function() {
        // 运行: 
        // 1、执行fn 
        // 2、让effect存到栈中
        return run(effect, fn)
    }
    return effect
}
function run(effect, fn) {
    try {
        activeEffectStacks.push(effect)
        fn()
    }finally {
        activeEffectStacks.pop(effect)
    }
}