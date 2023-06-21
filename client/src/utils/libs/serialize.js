import { checkType } from './limit';

/**
 * 参数序列化
 */
export function serialize(query, params) {
    const searchParams = new URLSearchParams(query);

    for (const key in params) {
        const value = params[key];
        if (value !== undefined && value !== null) {
            if (checkType(value, 'object')) {
                searchParams.set(key, JSON.stringify(value));
            }
            else {
                searchParams.set(key, value);
            }
        }
    }

    return searchParams.toString();
}

/**
 * 合并get请求参数
 */
export function serializeUrl(url, data) {
    if (checkType(data, 'object')) {
        const [path, query] = url.split('?');

        return `${path}?${serialize(query, data)}`;
    }

    return url;
}
