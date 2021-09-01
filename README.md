# vine-tracker

Tracking framework for Vue.js (and even React).

[Chinese docs(中文文档)](docs/README-zh.md)

## Installation

```shell
npm install vine-tracker
```

If you need to use this library on production environment, make sure that either you have installed any script bundler like Webpack, or the target browsers support ES Modules.

## Usage

```javascript
// Import function and channel
import { track } from 'vine-tracker';
import 'vine-tracker/dist/lib/channels/gio';

// Custom configure
track.config.disabled = process.env.NODE_ENV === 'production'
  ? ['gio'] : false;
track.config.defaultChannels = ['gio'];

// Send event by default channel
track('click', {
  id: 'foo',
});

// Or config for specified channel
track('config:user', {
  id: uuid(),
}, ['gio']);

// ... and send event by it
track('pageview', {
  query: location.search
}, ['gio']);
```

The channel could be registered or overwritten by yourself:

```javascript
import { getChannel, registerChannel } from 'vine-tracker/dist/core/channel';

const APIChannel = getChannel('api');
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

You can also use the built-in Vue.js plugin:

```javascript
import { createApp } from 'vue';
import { VueTracker } from 'vine-tracker/dist/vue';
import 'vine-tracker/dist/lib/channels/api';

createApp()
  .use(VueTracker, {
    // equivalent to assigning to track.config
    defaultChannels: ['api'],
  });

// in component methods
this.$track('click', {
  id: 'foo',
});
```

For Vue 2.x:

```javascript
import Vue from 'vue';
import { VueTracker } from 'vine-tracker/dist/vue-v2';
import 'vine-tracker/dist/lib/channels/api';

Vue.use(VueTracker, {
  // equivalent to assigning to track.config
  defaultChannels: ['api'],
});

```

## Advanced Topics for Vue.js

If you're using Vue, a directive named `track-by` and its corresponding instance method `$trackBy` are provided, which support bubbling up.

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

### Options

The method `$trackBy` will call the `trackedBy` custom lifecycle function on the nearest component (with itself).

```javascript
export default {
  trackedBy(key, data, channels) {
    if (key === 'appear') {
      data = { scene: 1000, ...data };
    }
    return this.$trackBy.final(key, data, channels);
    // or bubbles
    // return this.$parent.$trackBy(key, data, channels);
  },
};
```

You should always return either `undefined` or a calling of `track` or `trackBy` in your `trackedBy` functions, or it will cause errors when applying some features.

The `trackedBy` can be also declared as an object:

```javascript
export default {
  trackedBy: {
    // If the value of 'final' is truthy, the event will be send
    // otherwise it will bubble to the parent component
    final: true,
    // Prevent all received events
    prevented: true,
    // Reset the **default** channel for all received events
    channels: ['api'],
    // The object will be merged in event data whatever the key is
    with: {
      attribute: 1,
    },
    // And this only if the key is 'appear'
    appear: {
      scene: 1000,
    },
    // Visit `this` by declaring a method
    route() {
      return {
        scene: 1001,
        module: this.name,
      };
    },
    // 'default' will be used if there is no key matched
    default: {
      scene: 1002,
    },
  },
};
```

### Modifiers

The parent component can add more data by `.with` modifier.

```vue
<template>
  <div>
    <ChildComponent v-track-by:appear.with="{ page: pagination.page }"></ChildComponent>
  </div>
</template>
```

It will be also added to other tracking actions defined on the current template. If you are using `.with` without arg specified, it will be added to every tracking event data.

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

You can also use `.prevent` to prevent tracking events from bubbling up.

```vue
<template>
  <div>
    <ChildComponent v-track-by:appear.prevent></ChildComponent>
  </div>
</template>
```

### Collecting

Sometimes, for example, when you want to send a tracking event of `route`, you may want to collect data on the previous page and then send it after navigating to a new page. In this case, you can use the `$collectBy` method, which only returns the data on the link without actually sending the event:

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

In particular, if you specify the global `track.config.disabled` with 'true', then `$collectBy` will no longer be able to collect data.

### Composition APIs

You can also use the following Composition APIs:

```vue
<template>
  <div>
    <div v-track-by:appear="{ module: 'card' }"></div>
    <div v-track-by:click.route="{ page: 'user' }"></div>
    <div @click="handleClick"></div>
  </div>
</template>

<script>
import { defineTrackedBy, useTracker } from 'vine-tracker/dist/vue';

export default {
  setup() {
    defineTrackedBy({
      final: true,
    })

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

## Support for React

You can use it in a similar way in React.

In the form of components:

```jsx
import { Tracker } from 'vine-tracker/dist/react'

function Component() {
  const [count, setCount] = useState(0)

  const trackedBy = useMemo(() => ({
    default: {
      count,
    },
  }), [count])

  return (
    <div className="component">
      <Tracker context={trackedBy}>
        <ChildComponent />
      </Tracker>
    </div>
  )
}
```

```jsx
import { Tracker } from 'vine-tracker/dist/react'

function ChildComponent() {
  return (
    <Tracker by="click" data={{ foo: 'bar' }}>
      <button />
    </Tracker>
  )
}
```

In the form of props injections:

```jsx
import { withTracker } from 'vine-tracker/dist/react'

function Component(props) {
  const handleClick = useCallback(() => {
    props.trackBy('click')
  })
  return (
    <button onClick={handleClick} />
  )
}

export default withTracker(Component)
```

In the form of Hooks:

```jsx
import { useTracker } from 'vine-tracker/dist/react'

function Component(props) {
  const { trackBy } = useTracker()
  const handleClick = useCallback(() => {
    trackBy('click')
  })
  return (
    <button onClick={handleClick} />
  )
}
```
