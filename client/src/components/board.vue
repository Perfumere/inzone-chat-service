<template>
  <div class="container">
    <!-- 用户列表 -->
    <div class="user-area">
      <div v-if="isKefu" class="user-nav">
        <div v-for="(item, index) in userNav" :key="index" :style="{
          cursor: 'pointer',
          marginLeft: '10px',
          fontWeight: curUserNavIdx === index ? 'bold' : 'normal',
          color: curUserNavIdx === index ? 'blue' : '#333'
        }" @click="onUserNavClk(index)">{{ item }}</div>
      </div>

      <ul class="user-list">
        <li v-for="(item, index) in userList" :key="index" class="user-item" @click="onUserClk(item, index)">账号：{{
          item.member_id }}</li>
      </ul>
    </div>

    <!-- 聊天消息 -->
    <div class="message-area">
      <div class="screen">
        <div
          v-for="(item, index) in messageList"
          :key="index"
          :class="item.isKefu ? $style.kefuMsg : $style.userMsg"
        >
          {{ item.content }}
        </div>
      </div>

      <div v-if="!isKefu || (isKefu && selectedUser.member_id)" class="textarea">
        <textarea v-model="message" placeholder="请输入内容" placeholder-class="textarea-placeholder" />
        <button @click="onSend">发送</button>
      </div>
    </div>

    <!-- 拓展区域：订单/商品/推荐等 面板 -->
    <div class="expand-area">
      <div class="">拓展区域</div>
    </div>
  </div>
</template>

<script>
import { ChannelSocket } from '@/utils/libs/socket';

let socket = null;
let wtTimer = null; // 待接待计时器
let wtGap = 45 * 1000; // 待接待计时器轮询间隔
let lstSessionTime = 0;

export default {
  name: 'board',

  props: {
    isKefu: {
      type: Boolean,
      default: false
    },
    member_id: {
      type: String,
      default: ''
    }
  },

  data() {
    return {
      userNav: ['用户', '客服'],
      curUserNavIdx: 0,
      members: [],
      userList: [],
      message: '',
      selectedUser: {
        member_id: '',
        isKefu: false
      },
      messageList: [],
    };
  },

  computed: {
    kefuMessageList() {
      return this.messageList.filter(msg => msg.isKefu);
    },
    userMessageList() {
      return this.messageList.filter(msg => !msg.isKefu);
    }
  },

  mounted() {
    // 请求用户列表
    // socket = new ChannelSocket('ws://172.31.228.72:3030/ws');
    socket = new ChannelSocket('ws://117.50.180.192:3030/ws');
    // 0. 通过登录，获取当前用户的角色和专柜
    // 1. 区分客服和用户，加入专柜, 当前只有一个专柜id

    socket.send({
      type: 'CHANNEL_JOIN',
      channel_id: '1',
      member_id: this.member_id,
      isKefu: this.isKefu
    });

    // 延迟发送待接待
    if (!this.isKefu) {
      setTimeout(() => {
        socket.send({ type: 'USER_NEED_SERVICE' });
        lstSessionTime = Date.now();
      }, 500);

      wtTimer = setInterval(() => {
        const now = Date.now();

        if (now - lstSessionTime > wtGap) {
          lstSessionTime = now;
          // 超过一定时长未接待，再次通知
          socket.send({ type: 'USER_NEED_SERVICE' });
        }
      }, wtGap);

      // 客服消息
      socket.on('KEFU_MESSAGE', data => {
        this.messageList.push({
          type: 'kefu',
          content: data.content
        })
      });

      // 客服接入
      socket.on('SESSION_ESTABLISH', data => {
        this.messageList.push({
          type: 'service',
          kefu_id: data.kefu_id,
          content: `客服${data.kefu_id}为您服务！`
        });
      });

      // 客服转接
      socket.on('SESSION_CHANGE', data => {
        this.messageList.push({
          type: 'service_change',
          old_kefu_id: data.old_kefu_id,
          kefu_id: data.kefu_id,
          content: `已转接(*^_^*) 客服${data.kefu_id}继续为您服务！`
        });
      });
    }
    else {
      // 客服收到客户消息
      socket.on('USER_MESSAGE', data => {
        this.messageList.push({
          type: 'user',
          content: data.content
        })
      });
    }

    socket.on('CHANNEL_JOIN', data => {
      this.members = data.members;
      this.onUserNavClk(this.curUserNavIdx);
    });

    socket.on('CHANNEL_LEAVE', data => {
      for (let i = 0; i < this.members.length; i += 1) {
        const member = this.members[i];

        if (member.member_id === data.member_id) {
          this.members.splice(i, 1);
          this.onUserNavClk(this.curUserNavIdx);
          break;
        }
      }
    });
  },

  unmounted() {
    clearInterval(wtTimer);
    socket.close();
    wtTimer = null;
  },

  methods: {
    onUserNavClk(index) {
      this.curUserNavIdx = index;

      // 用户列表
      if (index === 0) {
        this.userList = this.members.filter(item => !item.isKefu);
      }

      // 客服列表
      else {
        this.userList = this.members.filter(item => item.isKefu);
      }
    },

    // 选中用户列表中的用户
    onUserClk(user, index) {
      // TODO: 处理选中客服
      if (user.isKefu) {
        return;
      }

      this.selectedUser = user;

      // TODO: 判定用户是否处于待接待
      socket.send({
        type: 'SESSION_ESTABLISH',
        member_id: user.member_id
      })
    },

    onSend() {
      if (this.isKefu) {
        socket.send({
          type: 'KEFU_MESSAGE',
          member_id: this.selectedUser.member_id,  // 选中一个用户
          content: this.message
        });
      }
      else {
        socket.send({
          type: 'USER_MESSAGE',
          content: this.message
        })
      }

      // 自己member_id
      this.messageList.push({
        type: '??',
        content: this.message
      });
    }
  },
}
</script>

<style lang="scss" module>
.container {
  display: flex;
  width: 1520px;

  .user-area {
    width: 400px;

    .user-item {
      cursor: pointer;
      height: 32px;
      line-height: 32px;

      &:hover {
        background: rgba(0, 0, 0, .2);
        transition: all .15s linear;
      }
    }
  }

  .message-area {
    width: 720px;

    .screen {
      height: 720px;
      background-color: rgba(0, 0, 0, .1);
    }

    .kefu-msg {

    }

    .user-msg {

    }

    .textarea {
      width: 100%;

      textarea {
        width: 100%;
      }
    }
  }

  .expand-area {
    width: 400px;
  }

  .user-nav {
    display: flex;
    flex-shrink: 0;
  }
}
</style>
