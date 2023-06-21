<template>
  <div>
    <span>账号：</span>
    <input
      v-if="!loginStatus"
      v-model="phone"
      placeholder="输入手机号"
      placeholder-class="input-placeholder"
    />
    <span v-else>{{ phone }}</span>

    <span
      :style="{
        margin: '0 10px'
      }"
    >客服</span>
    <input v-model="isKefu" style="margin-right: 12px;" type="checkbox">

    <button v-if="loginStatus" @click="logout">退出</button>
    <button v-else @click="login">登录</button>
  </div>
</template>

<script>
export default {
  name: 'login',

  data() {
    return {
      phone: '',
      loginStatus: false,
      isKefu: true
    };
  },

  methods: {
    login() {
      this.loginStatus = true;
      this.$emit('login', {
        phone: this.phone,
        isKefu: this.isKefu
      });
    },

    logout() {
      this.loginStatus = false;
      this.$emit('logout', {
        phone: this.phone,
        isKefu: this.isKefu
      });
    }
  }
};
</script>
