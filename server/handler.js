import { parseJSON } from './utils/common';
import {
  channels,
  find_member,
  remove_member,
  init_heartbeat,
  ChannelMember
} from './components/model';

const workMap = {
  // 用户、客服 登录重连事件
  CHANNEL_JOIN(connection, data) {
    if (!data.channel_id || !data.member_id) {
      return;
    }
    if (!channels.has(data.channel_id)) {
      return;
    }

    connection.channel_id = data.channel_id;
    connection.member_id = data.member_id;

    const channelMember = new ChannelMember({
      channel_id: data.channel_id,
      member_id: data.member_id,
      isKefu: data.isKefu,
      socket: connection.socket
    });

    // 初始化心跳监控
    // TODO: 临时仅让用户下线，客服待处理
    !data.isKefu && init_heartbeat(connection);

    // if (!data.isKefu) {
    //   return;
    // }

    channelMember.broadcast({
      type: 'CHANNEL_JOIN',
      members: channelMember.getMembers().map(
        member => ({
          member_id: member.member_id,
          isKefu: member.isKefu
        })
      )
    }, 'kefu');
  },

  // 客服、用户离开
  CHANNEL_LEAVE(connection, data) {
    if (!channels.has(connection.channel_id)) {
      return;
    }

    remove_member(connection.channel_id, connection.member_id, delMember => {
      delMember.broadcast({
        type: 'CHANNEL_LEAVE',
        member_id: delMember.member_id,
        isKeuf: delMember.isKefu
      }, 'kefu');
    });
  },

  // 客服建立与用户的对话
  SESSION_ESTABLISH(connection, data) {
    const channel = channels.get(connection.channel_id);
    // 通知用户 某客服为您服务
    const user = find_member(connection.channel_id, data.member_id);

    if (!user) {
      return;
    }

    // 当前用户被接待中，待释放
    if (user.getServiceId()) {
      return;
    }

    user.setServiceId(connection.member_id);
    user.send({
      type: 'SESSION_ESTABLISH',
      kefu_id: connection.member_id
    });
  },

  // 客服转接
  SESSION_CHANGE(connection, data) {
    const channel = channels.get(connection.channel_id);
    // 通知用户 某客服继续为您服务
    const user = find_member(connection.channel_id, data.member_id);

    if (!user) {
      return;
    }

    user.setServiceId(connection.member_id);
    user.send({
      type: 'SESSION_CHANGE',
      old_kefu_id: connection.member_id,
      kefu_id: data.kefu_id
    });
  },

  // 用户发送消息给频道
  USER_MESSAGE(connection, data) {
    // data.channel_id > 所有客服都能收到
    // data.service_id > 当前接待的客服id
    const user = find_member(connection.channel_id, connection.member_id);
    user.broadcast({
      type: 'USER_MESSAGE',
      content: data.content,
      // service_id: user.service_id
    }, 'kefu');
    // TODO: 记录用户对频道发送的会话消息
  },

  // 用户待接待
  USER_NEED_SERVICE(connection, data) {
    const user = find_member(connection.channel_id, connection.member_id);

    if (!user) {
      return;
    }

    const members = user.getUsers().map(member => ({
      member_id: member.member_id
    }));

    user.setServiceId();
    user.broadcast({ type: 'USER_NEED_SERVICE', members }, 'kefu');
  },

  // 客服指定用户发送消息
  KEFU_MESSAGE(connection, data) {
    // data.member_id  > 指定用户能收到
    // data.channel_id > 所有客服能收到
    const message = {
      type: 'KEFU_MESSAGE',
      content: data.content,
      kefu_id: connection.member_id
    };
    const user = find_member(connection.channel_id, data.member_id);

    user.send(message);
    user.broadcast(message, 'kefu');

    // TODO: 记录客服对用户所在频道发送的会话消息
  },

  // 广播消息
  BROADCAST(connection, data) {
    // 接收方 data.channel_id > members(isKefu)
  },

  // 心跳检测
  PING(connection, data) {
    connection._htCount = 3;
  }
};

export function handleMessage(connection, req) {
  return event => {
    // 默认通过鉴权
    const data = parseJSON(event.data);

    if (!data.type) {
      return;
    }

    if (workMap[data.type]) {
      workMap[data.type](connection, data);
    }
  }
}
