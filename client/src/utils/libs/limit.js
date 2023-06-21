/**
 * @file 测控工具
 * @date 2022-07-14
 * @author Perfumere
 */

const { toString } = Object.prototype;

/**
 * @function 检测类型
 * @param {*} target 待检测的数据
 * @param {string} type 期望的类型
 * null、undefined、boolean、string、number、set、map、
 * object、symbol、array、function、bigint、weakmap、weakset
 */
export function checkType(target, type) {
    if (type !== 'object' && typeof target === type) {
        return true;
    }

    return `[object ${type}]` === toString.call(target).toLowerCase();
}

/**
* 设置Promise的超时时间
* @param promise Promise
* @param timeout 超时时间 默认1500ms
* @param resonse 超时原因
*/
export function wraperTimeout(promise, timeout = 1500, resonse) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(
            new Error(resonse || `network timeout ${timeout} ms`)
        ), timeout);

        promise.then(res => {
            clearTimeout(timer);
            resolve(res);
        }).catch(err => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

/**
 * unwrap promise
 */
export function makePromise() {
  let resolve;
  let reject;
  const promise = new Promise((success, error) => {
      resolve = success;
      reject = error;
  });

  promise.abort = (err = false) => err ? reject() : resolve();

  return {
      resolve,
      reject,
      promise
  };
}
