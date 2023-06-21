import fastify from 'fastify';
import websocket from '@fastify/websocket';
import { handleMessage } from './handler';

const app = fastify();

app.register(websocket, {
  cors: true,
  options: {
    maxPayload: 1048576
  }
});

app.register(async fastify => {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    connection.socket.addEventListener('open', message => { });
    connection.socket.addEventListener('close', () => { });
    connection.socket.addEventListener('message', handleMessage(connection, req));
  });
});

app.listen({ host: '0.0.0.0', port: 3030 }, err => {
  if (!err) {
    console.log('The Server is running at port 3030');
  }
});
