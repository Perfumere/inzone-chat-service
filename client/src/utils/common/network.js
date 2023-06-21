/**
 * @file 通用网络请求
 * @date 2022-07-14
 * @author Perfumere
 */

import {
  checkType,
  wraperTimeout,
  serializeUrl,
  makePromise
} from '../libs';

const headers = { 'Content-Type': 'application/json' };
const host = location.origin;

export function jsonp(url, timeout) {
  const script = document.createElement('script');
  const randomTime = Math.trunc(Date.now() / 100);
  const randomNum = Math.trunc(Math.random() * 10000);
  const cb = `jsonp_${randomTime}${randomNum}`;

  script.src = `${url}${url.includes('?') ? '&' : '?'}cb=${cb}`;
  const jsonpPromise = new Promise((resolve, reject) => {
      // @ts-ignore 接口加载成功
      window[cb] = function (data) {
          resolve(data);
          // @ts-ignore
          delete window[cb];
          document.body.removeChild(script);
      };

      // 接口不存在直接抛出错误
      script.onerror = (err) => {
          // @ts-ignore
          delete window[cb];
          document.body.removeChild(script);
          reject(err);
      };
      document.body.appendChild(script);
  });

  return wraperTimeout(jsonpPromise, timeout);
}

export function fetch(url, options) {
  const option = Object.assign({
      method: 'GET',
      responseType: 'json',
      withCredentials: false,
  }, options);

  // 请求方式处理
  const method = option.method.toUpperCase();
  const config = {
      method,
      headers: method === 'POST' ? { ...headers, ...option.header } : option.header,
      credentials: option.withCredentials ? 'same-origin' : 'omit',
      mode: 'cors'
  };
  // 请求数据处理
  const { data } = option;
  if (method === 'GET') {
      url = serializeUrl(url, data);
  }
  if (method === 'POST' && checkType(data, 'object')) {
      config.body = JSON.stringify(data);
  }
  const fetchPromise = window.fetch(url, config).then(res => {
      const { status } = res;

      if (status >= 200 && status < 300 || status === 304) {
          let result;
          switch (option.responseType) {
          case 'json':
              result = res.json();
              break;
          case 'text':
              result = res.text();
              break;
          case 'blob':
              result = res.blob();
              break;
          case 'arrayBuffer':
              result = res.arrayBuffer();
              break;
          }

          return result;
      }

      return Promise.reject(new Error('fetch error'));
  });

  return wraperTimeout(fetchPromise, option.timeout);
}

function __handleApi(promise, apiResolve, handler) {
  promise.then((res) => {
      if (res.code === 0 && checkType(handler, 'function')) {
          res.data = handler(res.data) || res.data;
      }

      apiResolve(res);
  }).catch(err => {
      apiResolve({
          netError: err.message.startsWith('network timeout'),
          msg: err.message
      });
  });
}

/**
* 调用API拉取数据
*/
export function API(
  {
      url,
      method = 'GET',
      data,
      handler,
      timeout = 3000,
      header,
      withToken
  }
) {
  const { resolve, promise } = makePromise();

  if (withToken) {
      const token = Util.ls.get('token')?.value || '';

      if (withToken.role !== 4 && !NeedAuth(token, withToken.role)) {
          resolve({
              code: 401,
              data: null,
              msg: '用户鉴权失败'
          });

          return promise;
      }

      token && (header = Object.assign({}, header, { Authorization: `Bearer ${token}` }));
  }

  if (!url.startsWith('http')) {
      url = url[0] === '/' ? `${host}${url}` : `${host}/${url}`;
  }

  if (method.toUpperCase() === 'JSONP') {
      __handleApi(
          jsonp(serializeUrl(url, data), timeout),
          resolve,
          handler
      );
  }
  else {
      __handleApi(
          fetch(url, { method, data, timeout, header }),
          resolve,
          handler
      );
  }

  return promise;
}

/**
* 禁用非认证身份
*
*/
export function NeedAuth(token, role = 3) {
  if (!token) {
      return false;
  }

  try {
      const [content] = token.split('.');
      const payload = JSON.parse(atob(content));

      if (!Number.isInteger(role) || payload.role > role) {
          return false;
      }
  }
  catch (e) { return false; }

  return true;
}
