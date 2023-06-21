// 从缓存中取 from redis / nacos
const cahnenlsCache = new Map();
cahnenlsCache.set('1', { members: [] });

export const channels = cahnenlsCache;

export class ChannelMember {
  constructor(props) {
    this.channel_id = props.channel_id;
    this.member_id = props.member_id;
    this.isKefu = props.isKefu;
    this.socket = props.socket;
    this.service_id = '';

    if (props.isKefu) {
      this.service_ids = [];
    }

    remove_member(props.channel_id, props.member_id);
    this.getMembers().push(this);
  }

  send(message) {
    this.socket.send(
      typeof message === 'string' ? message : JSON.stringify(message)
    );
  }

  broadcast(message, role = 'all') {
    const data = JSON.stringify(message);

    if (role === 'all') {
      this.getMembers().forEach(member => member.send(data));
    }
    else if (role === 'user') {
      this.getUsers().forEach(member => member.send(data));
    }
    else if (role === 'kefu') {
      this.getKefus().forEach(member => member.send(data));
    }
  }

  getMembers() {
    return this.getChannel().members;
  }

  getKefus() {
    return this.getMembers().filter(member => member.isKefu);
  }

  getUsers() {
    return this.getMembers().filter(member => !member.isKefu);
  }

  getChannel() {
    return channels.get(this.channel_id);
  }

  setServiceId(kefu_id) {
    // 用户需要被接待
    if (!this.isKefu) {
      this.service_id = kefu_id || '';
    }
  }

  getServiceId() {
    return this.service_id;
  }
}

// 频道广播
export function channel_broadcast(id, callback) {
  if (!channels.has(id)) {
    return;
  }

  channels.get(id).members.forEach(callback);
}

// 找到指定频道的成员
export function find_member(channel_id, member_id) {
  if (!channels.has(channel_id)) {
    return false;
  }

  const members = channels.get(channel_id).members;

  return members.find(member => member.member_id === member_id);
}

// 删除指定频道的成员
export function remove_member(channel_id, member_id, callback) {
  const member = find_member(channel_id, member_id);

  if (member) {
    const members = channels.get(channel_id).members;
    member.socket.close();
    member.socket = null;
    members.splice(members.indexOf(member), 1);
    callback && callback(member);
  }
}

// 初始化心跳控制
export function init_heartbeat(connection) {
  connection._htCount = 3;
  connection._htGap = 30 * 1000;
  connection._htTimer = setInterval(() => {
    connection._htCount -= 1;

    if (connection._htCount === 0) {
      stopHeartBeat(connection);
    }
  }, connection._htGap);
}

// 停止心跳控制
export function stopHeartBeat(connection) {
  clearInterval(connection._htTimer);
  connection._htCount = 0;
  connection._htTimer = null;

  remove_member(connection.channel_id, connection.member_id, delMember => {
    delMember.broadcast({
      type: 'CHANNEL_LEAVE',
      member_id: delMember.member_id,
      isKeuf: delMember.isKefu
    }, 'kefu');
  });
}
