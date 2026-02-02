import { createApp } from 'vue'
import './assets/main.css'
import App from './App.vue'

// 1. 引入 Vuetify 核心样式
import 'vuetify/styles'

// 2. 引入 Material Design Icons 图标库
import '@mdi/font/css/materialdesignicons.css'

// 3. 引入构建函数
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// 4. 创建 Vuetify 实例
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light', 
  },
})

const app = createApp(App)

// 5. 挂载 Vuetify
app.use(vuetify)
app.mount('#app')