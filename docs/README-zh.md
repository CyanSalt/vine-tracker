# vine-tracker

Vue.js 埋点框架。

## 安装

```shell
npm install vine-tracker
```

如果你需要在生产环境使用这个库，确保你安装了 Webpack 等打包工具，或者目标浏览器支持 ES 模块。

## 用法

```javascript
// 导入函数和 channel
import { track } from 'vine-tracker';
import 'vine-tracker/dist/lib/channels/api';

// 自定义配置
track.config.disabled = process.env.NODE_ENV === 'production'
  ? ['gio'] : false;
track.config.defaultChannels = ['gio'];

// 使用默认 channel 发送事件
track('click', {
  id: 'foo',
});

// 为特定 channel 进行配置
track('config:user', {
  id: uuid(),
}, ['gio']);

// ... 并发送事件
track('pageview', {
  query: location.search
}, ['gio']);
```

Channel 可以自行注册或重写：

```javascript
import { getChannel, registerChannel } from 'vine-tracker/dist/core/channel';

const APIChannel = getChannel('api')
registerChannel('api', {
  ...APIChannel,
  async track(key, data) {
    try {
      await axios.post('/my-address', {
        event: key,
        data: JSON.stringify(data),
      });
    } catch (err) {
      // ignore error
    }
  },
});

```

你也可以使用内置的 Vue.js 插件：

```javascript
import { createApp } from 'vue';
import { VueTracker } from 'vine-tracker/dist/vue';
import 'vine-tracker/dist/lib/channels/api';

createApp()
  .use(VueTracker, {
    // 等价于配置 track.config
    defaultChannels: ['api'],
  });

// 在组件方法中
this.$track('click', {
  id: 'foo',
});
```

对于 Vue 2.x:

```javascript
import Vue from 'vue';
import { VueTracker } from 'vine-tracker/dist/vue-v2';
import 'vine-tracker/dist/lib/channels/api';

Vue.use(VueTracker, {
  // 等价于配置 track.config
  defaultChannels: ['api'],
});
```

## Vue.js 中的进阶用法

如果你正使用 Vue，我们提供了一个支持向上冒泡的 `track-by` 指令及其对应的实例方法 `$trackBy`。

```vue
<template>
  <div>
    <div v-track-by:appear="{ module: 'card' }"></div>
    <div v-track-by:click.route="{ page: 'user' }"></div>
    <div @click="handleClick"></div>
  </div>
</template>

<script>
export default {
  methods: {
    handleClick() {
      this.$trackBy('click', { id: 'foo' });
      // ...
    },
  },
};
</script>
```

### 选项

`$trackBy` 方法将会在最近的组件（包含自身）上调用 `trackedBy` 自定义生命周期函数。

```javascript
export default {
  trackedBy(key, data, channels) {
    if (key === 'appear') {
      data = { scene: 1000, ...data };
    }
    return this.$trackBy.final(key, data, channels);
    // 或者，向上冒泡
    // return this.$parent.$trackBy(key, data, channels);
  },
};
```

你应当总是在 `trackedBy` 函数中要么返回 `undefined`，要么返回 `track` 或 `trackBy` 的调用，否则将会在应用某些特性时产生错误。

`trackedBy` 也可以被定义为一个对象：

```javascript
export default {
  trackedBy: {
    // 如果 'final' 的值是 truthy 的，事件将被发送
    // 否则会冒泡至父组件
    final: true,
    // 阻止所有接收到的事件继续传播
    prevented: true,
    // 为所有接收到的事件重置**默认** channel
    channels: ['api'],
    // 这个对象会合并到事件数据中，不论 key 是什么
    with: {
      attribute: 1,
    },
    // 仅当 key 是 'appear' 时这个对象才会被合并
    appear: {
      scene: 1000,
    },
    // 通过定义一个方法来访问 this
    route() {
      return {
        scene: 1001,
        module: this.name,
      };
    },
    // 如果没有 key 匹配，则会使用 'default'
    default: {
      scene: 1002,
    },
  }
}
```

### 修饰符

父组件可以通过 `.with` 修饰符添加更多数据。

```vue
<template>
  <div>
    <ChildComponent v-track-by:appear.with="{ page: pagination.page }"></ChildComponent>
  </div>
</template>
```

它也可以用来向当前模板定义的埋点动作上添加数据。如果使用 `.with` 时没有携带任何参数，将会在所有的埋点事件上都添加数据。

```vue
<template>
  <div>
    <ChildComponent
      v-track-by.with="{ page: pagination.page }"
      v-track-by:appear="{ scene: 1000 }"
      v-track-by:click.route="{ scene: 1001 }"
    ></ChildComponent>
  </div>
</template>
```

你也可以 `.prevent` 阻止埋点事件继续向上冒泡。

```vue
<template>
  <div>
    <ChildComponent v-track-by:appear.prevent></ChildComponent>
  </div>
</template>
```

### 采集

有些时候，例如当你希望发送一个 `route` 事件的埋点时，你可能希望在前一个页面收集数据，然后在跳转到新页面之后发送。这时你可以使用 `$collectBy` 方法，它仅返回链路上的数据而不实际发送埋点：

```javascript
export default {
  methods: {
    handleClick() {
      const data = this.$collectBy('route');
      // ...
    },
  },
};
```

特别注意，如果你指定了全局的 `track.config.disabled` 为 `true`，那么 `$collectBy` 也将不再能够收集到数据。

### Composition APIs

你也可以使用下面的 Composition APIs:

```vue
<template>
  <div>
    <div v-track-by:appear="{ module: 'card' }"></div>
    <div v-track-by:click.route="{ page: 'user' }"></div>
    <div @click="handleClick"></div>
  </div>
</template>

<script>
import { useTracker } from 'vine-tracker-next/vue';

export default {
  setup() {
    const { trackBy, collectBy } = useTracker();

    function handleClick() {
      trackBy('click', { id: 'foo' });
      // ...
    }

    return {
      handleClick,
    };
  },
};
</script>
```
