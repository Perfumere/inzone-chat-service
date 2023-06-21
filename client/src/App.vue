<template>
    <div>Test</div>
    <Login @login="onLogin" @logout="onLogout" />

    <Board
      v-if="isLogin"
      :member_id="count"
      :is-kefu="isKefu"
    />
</template>

<script setup>
import { ref } from 'vue';
import Login from '@/components/login.vue';
import Board from '@/components/board.vue';

const isKefu = ref(false);
const isLogin = ref(false);
const count = ref('');

// Methods
function onLogin({ phone, isKefu: role }) {
  if (!phone) {
    return;
  }

  // 默认直接登录成功
  console.log('login', phone, role);
  isLogin.value = true;
  isKefu.value = role;
  count.value = phone;
}

function onLogout() {
  isLogin.value = false;
}
</script>
