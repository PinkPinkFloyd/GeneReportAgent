<template>
  <v-app>
    <v-app-bar color="primary" density="compact" elevation="1">
      <v-app-bar-title>🤖 Gemini 3.0 Agent Studio</v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn icon="mdi-theme-light-dark" @click="toggleTheme"></v-btn>
    </v-app-bar>

    <v-main class="bg-grey-lighten-4">
      <v-container class="fill-height pa-0" fluid>
        <v-row no-gutters class="fill-height flex-column">
          
          <v-col class="chat-container pa-4 overflow-y-auto">
            <div v-if="history.length === 0" class="d-flex flex-column align-center justify-center fill-height text-grey">
              <v-icon icon="mdi-robot" size="64" class="mb-4"></v-icon>
              <h3>Agent 已就绪</h3>
              <p>试着说："在 workspace 下创建一个贪吃蛇游戏"</p>
            </div>

            <div v-for="(msg, index) in history" :key="index" class="d-flex mb-4" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
              
              <v-avatar v-if="msg.role === 'ai'" color="primary" size="36" class="mr-2" icon="mdi-robot"></v-avatar>

              <v-card 
                :color="msg.role === 'user' ? 'primary' : 'white'" 
                :theme="msg.role === 'user' ? 'dark' : 'light'"
                class="pa-3 rounded-lg"
                max-width="80%"
                elevation="1"
              >
                <div style="white-space: pre-wrap; word-break: break-word;">{{ msg.content }}</div>
              </v-card>

              <v-avatar v-if="msg.role === 'user'" color="grey-darken-1" size="36" class="ml-2" icon="mdi-account"></v-avatar>
            </div>
            
            <div ref="bottomRef"></div>
          </v-col>

          <v-col cols="auto" class="bg-white pa-4 elevation-4">
            <div class="d-flex align-center">
              <v-text-field
      v-model="userInput"
      variant="outlined"
      density="comfortable"
      placeholder="给 Agent 下达指令..."
      hide-details
      rounded="lg"
      @keyup.enter="sendMessage"
      :disabled="loading"
      bg-color="grey-lighten-5"
    >
      <template v-slot:prepend-inner>
        <v-tooltip text="选择文件" location="top">
          <template v-slot:activator="{ props }">
            <v-btn 
              icon="mdi-file-document-outline" 
              variant="text" 
              size="small" 
              color="grey-darken-1"
              v-bind="props"
              @click="handleSelectPath('file')"
              class="mr-1"
            ></v-btn>
          </template>
        </v-tooltip>

        <v-tooltip text="选择文件夹" location="top">
          <template v-slot:activator="{ props }">
            <v-btn 
              icon="mdi-folder-open-outline" 
              variant="text" 
              size="small" 
              color="grey-darken-1"
              v-bind="props"
              @click="handleSelectPath('folder')"
            ></v-btn>
          </template>
        </v-tooltip>
      </template>

      <template v-slot:append-inner>
         <v-progress-circular v-if="loading" indeterminate color="primary" size="24"></v-progress-circular>
      </template>
    </v-text-field>
              
              <v-btn 
                color="primary" 
                class="ml-3" 
                height="48" 
                width="48"
                icon="mdi-send"
                :loading="loading"
                :disabled="!userInput.trim()"
                @click="sendMessage"
                elevation="2"
              ></v-btn>
            </div>
          </v-col>

        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { useTheme } from 'vuetify';

// 主题切换
const theme = useTheme();
const toggleTheme = () => {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark';
};

interface Message {
  role: 'user' | 'ai';
  content: string;
}

const userInput = ref('');
const history = ref<Message[]>([]);
const loading = ref(false);
const bottomRef = ref<HTMLDivElement | null>(null);

const scrollToBottom = () => {
  nextTick(() => {
    bottomRef.value?.scrollIntoView({ behavior: 'smooth' });
  });
};
// 发送信息
const sendMessage = async () => {
  if (!userInput.value.trim()) return;

  const content = userInput.value;
  history.value.push({ role: 'user', content });
  userInput.value = '';
  loading.value = true;
  scrollToBottom();

  try {
    // 调用 Electron API
    const response = await (window as any).api.chat(content);
    history.value.push({ role: 'ai', content: response });
  } catch (error) {
    history.value.push({ role: 'ai', content: `❌ 错误: ${error}` });
  } finally {
    loading.value = false;
    scrollToBottom();
  }
};
// 处理文件选择逻辑
const handleSelectPath = async (type: 'file' | 'folder') => {
  try {
    // 调用preload 定义的 api
    const path = await (window as any).api.selectPath(type);
    
    if (path) {
      // 在输入框追加 @路径
      // 如果输入框当前有内容，且没空格，补个空格
      const prefix = userInput.value.length > 0 && !userInput.value.endsWith(' ') ? ' ' : '';
      
      userInput.value += `${prefix}@${path} `;
      
      // 让输入框自动获得焦点，方便继续打字
      // Vuetify 的 autofocus 可能需要手动处理，这里简单赋值即可
    }
  } catch (error) {
    console.error('选择路径失败:', error);
  }
};
</script>

<style scoped>
/* 隐藏默认滚动条，美化一下 */
.chat-container::-webkit-scrollbar {
  width: 8px;
}
.chat-container::-webkit-scrollbar-track {
  background: transparent;
}
.chat-container::-webkit-scrollbar-thumb {
  background-color: rgba(0,0,0,0.1);
  border-radius: 4px;
}
</style>